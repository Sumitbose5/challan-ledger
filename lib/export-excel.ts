import type { Cell, Row, Worksheet } from "exceljs"
import { loadExcelJS } from "./excel-js"
import { buildInsights, dailySeries, filterRows, summarize } from "./analytics"
import { formatDay, parseISODate } from "./format"
import { SETTLED_STATUSES, rowCredit, round2 } from "./ledger"
import type { ChallanRow, Scope } from "./types"

const NAVY = "FF1B2B45"
const PAPER = "FFEEF0F4"
const MONEY = '"₹"#,##0.00'
const DATE_FMT = "dd-mmm-yyyy"

/** Date-only cell value that Excel shows as the same calendar day everywhere. */
const excelDate = (iso: string) => {
  const d = parseISODate(iso)
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
}

function styleHeader(ws: Worksheet, rowNumber: number, firstCol: number, lastCol: number) {
  for (let c = firstCol; c <= lastCol; c++) {
    const cell: Cell = ws.getCell(rowNumber, c)
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } }
    cell.alignment = { vertical: "middle", wrapText: true }
  }
}

function sectionTitle(ws: Worksheet, rowNumber: number, title: string, lastCol = 4) {
  ws.getCell(rowNumber, 1).value = title
  for (let c = 1; c <= lastCol; c++) {
    const cell = ws.getCell(rowNumber, c)
    cell.font = { bold: true, size: 11, color: { argb: NAVY } }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: PAPER } }
    cell.border = { bottom: { style: "thin", color: { argb: NAVY } } }
  }
}

/** Builds the workbook for the current view and downloads it. Returns the file name. */
export async function downloadReport(args: {
  allRows: ChallanRow[]
  scope: Scope
  sourceFile: string
  creditOverride?: number | null
  serviceCharge?: number
}): Promise<string> {
  const { allRows, scope, sourceFile, creditOverride = null, serviceCharge = 0 } = args
  const ExcelJS = await loadExcelJS()

  const rows = filterRows(allRows, scope)
  const summary = summarize(rows, creditOverride, serviceCharge)
  const daily = dailySeries(allRows)
  const allTotal = round2(allRows.reduce((sum, r) => sum + r.amount, 0) + serviceCharge)
  const insights = buildInsights({ rows, summary, scope, daily, allTotal })
  const { ledger } = summary

  const wb = new ExcelJS.Workbook()
  wb.creator = "Challan Ledger"
  wb.created = new Date()

  const summarySheet = wb.addWorksheet("Summary", { views: [{ showGridLines: false }] })
  const challans = wb.addWorksheet("Challans", { views: [{ state: "frozen", ySplit: 1 }] })
  const vehicles = wb.addWorksheet("Vehicles", { views: [{ state: "frozen", ySplit: 1 }] })
  const dailySheet =
    scope.mode === "all"
      ? wb.addWorksheet("Daily", { views: [{ state: "frozen", ySplit: 1 }] })
      : null

  // ---------------------------------------------------------------- Challans
  const last = Math.max(rows.length + 1, 2) // last data row (ranges stay valid when empty)
  const totalRow = last + 2

  challans.columns = [
    { header: "Sr", key: "sr", width: 6 },
    { header: "Challan No", key: "challanNo", width: 26 },
    { header: "Date", key: "date", width: 13 },
    { header: "Time", key: "time", width: 10 },
    { header: "Vehicle No", key: "vehicle", width: 14 },
    { header: "Court / Dept", key: "court", width: 13 },
    { header: "Chassis", key: "chassis", width: 20 },
    { header: "Mobile", key: "mobile", width: 14 },
    { header: "Status", key: "status", width: 12 },
    { header: "Amount / Debit (₹)", key: "debit", width: 19 },
    { header: "Credit (₹)", key: "credit", width: 14 },
    { header: "Balance (₹)", key: "balance", width: 16 },
    { header: "Payment link", key: "link", width: 14 },
  ]
  styleHeader(challans, 1, 1, 13)

  let running = 0
  rows.forEach((r, i) => {
    const n = i + 2
    const credit = rowCredit(r)
    running = round2(running + r.amount - credit)
    const row: Row = challans.addRow({
      sr: i + 1,
      challanNo: r.challanNo,
      date: r.date ? excelDate(r.date) : "",
      time: r.time ?? "",
      vehicle: r.registrationNo || "Unknown",
      court: r.courtDepartment || "Unknown",
      chassis: r.chassis,
      mobile: r.mobile,
      status: r.status || "Unknown",
      debit: r.amount,
      credit,
      balance: {
        formula: i === 0 ? `J${n}-K${n}` : `L${n - 1}+J${n}-K${n}`,
        result: running,
      },
      link: r.paymentUrl ? { text: "Open", hyperlink: r.paymentUrl } : "",
    })
    row.getCell(3).numFmt = DATE_FMT
    for (const c of [10, 11, 12]) row.getCell(c).numFmt = MONEY
    if (r.paymentUrl) row.getCell(13).font = { color: { argb: "FF1D4ED8" }, underline: true }
  })
  challans.autoFilter = { from: "A1", to: `M${last}` }

  challans.getCell(`I${totalRow}`).value = "Total"
  challans.getCell(`J${totalRow}`).value = { formula: `SUM(J2:J${last})`, result: ledger.debit }
  challans.getCell(`K${totalRow}`).value = { formula: `SUM(K2:K${last})`, result: ledger.credit }
  challans.getCell(`L${totalRow}`).value = {
    formula: `J${totalRow}-K${totalRow}`,
    result: ledger.balance,
  }
  for (let c = 9; c <= 12; c++) {
    const cell = challans.getCell(totalRow, c)
    cell.font = { bold: true }
    cell.border = { top: { style: "thin" }, bottom: { style: "double" } }
    if (c > 9) cell.numFmt = MONEY
  }

  // ---------------------------------------------------------------- Vehicles
  const vLast = Math.max(summary.vehicles.length + 1, 2)
  vehicles.columns = [
    { header: "Vehicle No", key: "v", width: 14 },
    { header: "Chassis", key: "chassis", width: 20 },
    { header: "Mobile", key: "mobile", width: 14 },
    { header: "Challans", key: "count", width: 11 },
    { header: "Amount / Debit (₹)", key: "amount", width: 19 },
    { header: "Credit (₹)", key: "credit", width: 14 },
    { header: "Balance (₹)", key: "balance", width: 16 },
  ]
  styleHeader(vehicles, 1, 1, 7)
  summary.vehicles.forEach((v, i) => {
    const n = i + 2
    const row = vehicles.addRow({
      v: v.registrationNo,
      chassis: v.chassis,
      mobile: v.mobile,
      count: { formula: `COUNTIF(Challans!$E$2:$E$${last},A${n})`, result: v.count },
      amount: {
        formula: `SUMIF(Challans!$E$2:$E$${last},A${n},Challans!$J$2:$J$${last})`,
        result: v.amount,
      },
      credit: {
        formula: `SUMIF(Challans!$E$2:$E$${last},A${n},Challans!$K$2:$K$${last})`,
        result: v.credit,
      },
      balance: { formula: `E${n}-F${n}`, result: v.balance },
    })
    for (const c of [5, 6, 7]) row.getCell(c).numFmt = MONEY
  })

  // ------------------------------------------------------------------- Daily
  if (dailySheet) {
    dailySheet.columns = [
      { header: "Date", key: "date", width: 14 },
      { header: "Challans", key: "count", width: 11 },
      { header: "Debit (₹)", key: "debit", width: 16 },
      { header: "Credit (₹)", key: "credit", width: 16 },
      { header: "Balance (₹)", key: "balance", width: 16 },
    ]
    styleHeader(dailySheet, 1, 1, 5)
    daily.forEach((d, i) => {
      const n = i + 2
      const row = dailySheet.addRow({
        date: excelDate(d.date),
        count: { formula: `COUNTIF(Challans!$C$2:$C$${last},A${n})`, result: d.count },
        debit: {
          formula: `SUMIF(Challans!$C$2:$C$${last},A${n},Challans!$J$2:$J$${last})`,
          result: d.debit,
        },
        credit: {
          formula: `SUMIF(Challans!$C$2:$C$${last},A${n},Challans!$K$2:$K$${last})`,
          result: d.credit,
        },
        balance: { formula: `C${n}-D${n}`, result: d.balance },
      })
      row.getCell(1).numFmt = DATE_FMT
      for (const c of [3, 4, 5]) row.getCell(c).numFmt = MONEY
    })
    const undated = allRows.filter((r) => !r.date).length
    if (undated) {
      dailySheet.getCell(daily.length + 3, 1).value =
        `${undated} challan(s) have no readable date and are not listed here.`
      dailySheet.getCell(daily.length + 3, 1).font = { italic: true }
    }
  }

  // ----------------------------------------------------------------- Summary
  const s = summarySheet
  s.columns = [{ width: 38 }, { width: 20 }, { width: 16 }, { width: 16 }]

  const dates = [...new Set(allRows.map((r) => r.date).filter((d): d is string => !!d))].sort()
  const label =
    scope.mode === "day"
      ? formatDay(scope.date)
      : dates.length
        ? `All dates (${formatDay(dates[0], false)} to ${formatDay(dates[dates.length - 1], false)})`
        : "All dates"

  s.getCell("A1").value = "Challan report"
  s.getCell("A1").font = { bold: true, size: 18, color: { argb: NAVY } }
  s.getCell("A2").value = label
  s.getCell("A2").font = { bold: true, size: 12 }
  s.getCell("A3").value = `Source: ${sourceFile}   |   Generated: ${new Date().toLocaleString("en-IN")}`
  s.getCell("A3").font = { color: { argb: "FF5B6678" } }

  sectionTitle(s, 5, "Ledger")
  const ledgerRows: [string, string, number, string?][] = [
    ["Total challan amount (Amount column)", `SUM(Challans!J2:J${last})`, summary.totalAmount],
    ["Debit (challans raised)", "B6", ledger.debit],
    ["Credit (settled)", `SUM(Challans!K2:K${last})`, ledger.credit],
    ["Balance (Debit - Credit)", "B7-B8", ledger.balance],
    ["Settled share", "IF(B7=0,0,B8/B7)", ledger.debit > 0 ? ledger.credit / ledger.debit : 0, "0.0%"],
  ]
  ledgerRows.forEach(([name, formula, result, fmt], i) => {
    const n = 6 + i
    s.getCell(n, 1).value = name
    s.getCell(n, 2).value = { formula, result }
    s.getCell(n, 2).numFmt = fmt ?? MONEY
  })
  s.getCell("A9").font = { bold: true }
  s.getCell("B9").font = { bold: true }

  sectionTitle(s, 12, "Key figures")
  const figures: [string, string | null, number, string?][] = [
    ["Challans", `COUNTA(Challans!B2:B${last})`, summary.count, "0"],
    ["Vehicles", `COUNTA(Vehicles!A2:A${vLast})`, summary.vehicleCount, "0"],
    ["Average challan", "IF(B13=0,0,B6/B13)", summary.averageAmount],
    ["Highest challan", `MAX(Challans!J2:J${last})`, summary.maxAmount],
  ]
  figures.forEach(([name, formula, result, fmt], i) => {
    const n = 13 + i
    s.getCell(n, 1).value = name
    s.getCell(n, 2).value = formula ? { formula, result } : result
    s.getCell(n, 2).numFmt = fmt ?? MONEY
  })
  let cursor = 17
  if (scope.mode === "day") {
    s.getCell(cursor, 1).value = "Share of the whole file's amount"
    s.getCell(cursor, 2).value = allTotal > 0 ? summary.totalAmount / allTotal : 0
    s.getCell(cursor, 2).numFmt = "0.0%"
    cursor += 1
  }

  cursor += 1
  sectionTitle(s, cursor, "Insights")
  cursor += 1
  if (insights.length === 0) {
    s.getCell(cursor, 1).value = "No challans in this view."
    cursor += 1
  }
  for (const line of insights) {
    s.mergeCells(cursor, 1, cursor, 4)
    s.getCell(cursor, 1).value = line
    s.getCell(cursor, 1).alignment = { wrapText: true, vertical: "top" }
    s.getRow(cursor).height = 28
    cursor += 1
  }

  const breakdown = (
    title: string,
    heading: string,
    colLetter: string,
    items: { name: string; count: number; amount: number }[]
  ) => {
    cursor += 1
    sectionTitle(s, cursor, title)
    cursor += 1
    ;["", "Challans", "Amount (₹)", "Share"].forEach((h, c) => {
      s.getCell(cursor, c + 1).value = c === 0 ? heading : h
    })
    styleHeader(s, cursor, 1, 4)
    cursor += 1
    for (const item of items) {
      const n = cursor
      s.getCell(n, 1).value = item.name
      s.getCell(n, 2).value = {
        formula: `COUNTIF(Challans!$${colLetter}$2:$${colLetter}$${last},A${n})`,
        result: item.count,
      }
      s.getCell(n, 3).value = {
        formula: `SUMIF(Challans!$${colLetter}$2:$${colLetter}$${last},A${n},Challans!$J$2:$J$${last})`,
        result: item.amount,
      }
      s.getCell(n, 3).numFmt = MONEY
      s.getCell(n, 4).value = {
        formula: `IF($B$6=0,0,C${n}/$B$6)`,
        result: summary.totalAmount ? item.amount / summary.totalAmount : 0,
      }
      s.getCell(n, 4).numFmt = "0.0%"
      cursor += 1
    }
  }
  breakdown("By court / department", "Court / Dept", "F", summary.byCourt)
  breakdown("By status", "Status", "I", summary.byStatus)

  cursor += 1
  sectionTitle(s, cursor, "How these numbers are worked out")
  const notes = [
    "Debit = sum of the Amount column for the challans in this report.",
    `Credit = Amount of challans whose status is one of: ${SETTLED_STATUSES.join(", ")}.`,
    "Balance = Debit - Credit. The Challans sheet also shows the running balance row by row.",
    "Date = taken from the 12-digit timestamp (YYMMDDHHMMSS) at the end of each challan number.",
  ]
  for (const note of notes) {
    cursor += 1
    s.mergeCells(cursor, 1, cursor, 4)
    s.getCell(cursor, 1).value = note
    s.getCell(cursor, 1).alignment = { wrapText: true, vertical: "top" }
    s.getCell(cursor, 1).font = { italic: true, color: { argb: "FF5B6678" } }
    s.getRow(cursor).height = 28
  }

  // Arial everywhere, keeping bold/italic/colour set above.
  wb.eachSheet((ws) => {
    ws.eachRow({ includeEmpty: true }, (row) => {
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = { ...cell.font, name: "Arial", size: cell.font?.size ?? 10 }
      })
    })
  })

  // ---------------------------------------------------------------- Download
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer as unknown as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  const fileName = `challan-report-${scope.mode === "day" ? scope.date : "all-dates"}.xlsx`
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  return fileName
}
