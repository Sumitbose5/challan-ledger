import type { CellValue, Row, Worksheet } from "exceljs"
import { loadExcelJS } from "./excel-js"
import { parseChallanTimestamp } from "./challan-date"
import type { ChallanRow } from "./types"

export class ExcelFormatError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ExcelFormatError"
  }
}

export type ParsedWorkbook = {
  rows: ChallanRow[]
  fileName: string
  sheetName: string
  /** Rows whose challan number has no readable timestamp (excluded from day views). */
  undatedCount: number
  /** Rows ignored because the challan number or amount was missing/invalid. */
  skippedCount: number
}

const SHEET_NAME = "Payment links"
const REQUIRED_COLUMNS = ["challanNo", "registrationNo", "amount", "status"]

const DATE_PATTERNS = [
  /^\d{4}-\d{1,2}-\d{1,2}(?:[T\s]\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?)?$/,
  /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/,
  /^\d{1,2}[\s-](?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s-]?\d{2,4}?$/i,
  /^(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(?:,\s*\d{4})?$/i,
]

const HEADER_ALIASES: Record<string, string[]> = {
  challanNo: [
    "challannumber",
    "challanno",
    "challan no",
    "challan",
    "challan_no",
    "challannumberno",
  ],
  registrationNo: [
    "vehiclenumber",
    "vehicle number",
    "vehicleno",
    "vehicle no",
    "registrationnumber",
    "registrationno",
    "registration number",
    "vehicle",
    "regno",
  ],
  amount: [
    "amount",
    "amt",
    "totalamt",
    "total amount",
    "totalamount",
    "actualamt",
    "actual amount",
    "actualamount",
    "amountinr",
  ],
  creditAmount: ["creditamount", "credit amount", "paidamount", "receivedamount", "creditinr"],
  status: ["status", "paymentstatus", "challanstatus", "result", "challanresult"],
  courtDepartment: [
    "courtdepartment",
    "court dept",
    "courtdepartmentname",
    "vcourt",
    "v court",
    "court",
    "department",
  ],
  paymentUrl: ["link", "paymentlink", "payment url", "url", "linkurl"],
  date: ["assigned", "assigneddate", "date", "challandate", "paymentdate"],
}

function findFallbackStatusColumn(sheet: Worksheet): number | undefined {
  const row1 = sheet.getRow(1)
  const lastCol = sheet.columns.reduce((max, col) => Math.max(max, col.number ?? 0), 0)
  const headers: Array<{ col: number; text: string }> = []

  for (let col = 1; col <= lastCol; col++) {
    const value = row1.getCell(col).value
    const text = normalizeHeader(toText(value))
    if (text) headers.push({ col, text })
  }

  const amountCol = resolveHeader(
    new Map(headers.map(({ col, text }) => [text, col])),
    HEADER_ALIASES.amount
  )
  if (amountCol === undefined) return undefined

  for (let col = amountCol + 1; col <= lastCol; col++) {
    const value = sheet.getRow(2)?.getCell(col).value
    const text = toText(value).trim().toLowerCase()
    if (!text) continue
    if (/^(complete|completed|cancelled|cancel|paid|success|successful|settled|pending|open)$/i.test(text)) {
      return col
    }
  }

  return undefined
}

const normalizeHeader = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "")

function normalizeStatusValue(raw: string): string {
  const value = raw.trim()
  if (!value) return "pending"

  const normalized = value.toLowerCase()
  if (/(complete|completed|paid|success|successful|settled)/.test(normalized)) return "completed"
  if (/(reject|rejected|cancel|cancelled|failed|failure)/.test(normalized)) return "rejected"
  if (/(pending|open|notpaid|not paid)/.test(normalized)) return "pending"
  return value
}

function resolveHeader(columns: Map<string, number>, aliases: string[]): number | undefined {
  const lookup = new Set(aliases.map((a) => normalizeHeader(a)))
  for (const [key, col] of columns.entries()) {
    if (lookup.has(key)) return col
  }
  return undefined
}

function toText(v: CellValue | undefined, preferLink = false): string {
  if (v === null || v === undefined) return ""
  if (typeof v === "string") return v.trim()
  if (typeof v === "number") return String(v)
  if (typeof v === "boolean") return v ? "true" : "false"
  if (v instanceof Date) return v.toISOString()
  if ("richText" in v) return v.richText.map((t) => t.text).join("").trim()
  if ("hyperlink" in v) return preferLink ? v.hyperlink : toText(v.text as CellValue)
  if ("formula" in v || "sharedFormula" in v) {
    return toText((v as { result?: CellValue }).result, preferLink)
  }
  return ""
}

function toAmount(v: CellValue | undefined): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null
  const cleaned = toText(v).replace(/[^0-9.\-]/g, "")
  if (!cleaned) return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

function parseDateString(value: string): { date: string; time: string | null } | null {
  const raw = value.trim()
  if (!raw) return null

  const normalized = raw.replace(/\s+/g, " ").replace(/\s*,\s*/g, ", ")
  const monthMap: Record<string, number> = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    sept: 8,
    oct: 9,
    nov: 10,
    dec: 11,
  }

  const monthly = normalized.match(/^([0-9]{1,2})[-/\s]([A-Za-z]{3,9})(?:[-/\s]([0-9]{2,4}))?$/)
  if (monthly) {
    const [, dayText, monthText, yearText] = monthly
    const day = Number(dayText)
    const month = monthMap[monthText.slice(0, 3).toLowerCase()]
    const year = yearText ? Number(yearText) : new Date().getFullYear()
    if (Number.isFinite(day) && month !== undefined && Number.isFinite(year)) {
      const date = new Date(year, month, day)
      if (!Number.isNaN(date.getTime())) {
        return {
          date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
          time: null,
        }
      }
    }
  }

  const monthFirst = normalized.match(/^([A-Za-z]{3,9})\s+([0-9]{1,2})(?:,\s*([0-9]{4}))?$/i)
  if (monthFirst) {
    const [, monthText, dayText, yearText] = monthFirst
    const month = monthMap[monthText.slice(0, 3).toLowerCase()]
    const day = Number(dayText)
    const year = yearText ? Number(yearText) : new Date().getFullYear()
    if (month !== undefined && Number.isFinite(day) && Number.isFinite(year)) {
      const date = new Date(year, month, day)
      if (!Number.isNaN(date.getTime())) {
        return {
          date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
          time: null,
        }
      }
    }
  }

  const iso = normalized.match(/^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})(?:[T\s]([0-9]{1,2}):([0-9]{2})(?::([0-9]{2}))?(?:\.[0-9]+)?(?:Z|[+-][0-9]{2}:?[0-9]{2})?)?$/)
  if (iso) {
    const [, y, mo, d, hh, mm, ss] = iso
    const year = Number(y)
    const month = Number(mo)
    const day = Number(d)
    const date = new Date(year, month - 1, day, Number(hh ?? 0), Number(mm ?? 0), Number(ss ?? 0))
    if (!Number.isNaN(date.getTime())) {
      return {
        date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
        time: hh ? `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}` : null,
      }
    }
  }

  const slash = normalized.match(/^([0-9]{1,2})[-/\.]([0-9]{1,2})[-/\.]([0-9]{2,4})$/)
  if (slash) {
    const [, d, m, y] = slash
    const year = Number(y.length === 2 ? `20${y}` : y)
    const day = Number(d)
    const month = Number(m)
    const date = new Date(year, month - 1, day)
    if (!Number.isNaN(date.getTime())) {
      return {
        date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
        time: null,
      }
    }
  }

  const parsed = new Date(normalized)
  if (!Number.isNaN(parsed.getTime())) {
    return {
      date: `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`,
      time: null,
    }
  }

  return null
}

function parseCellDate(row: Row, columns: Map<string, number>, aliases: string[]): { date: string; time: string | null } | null {
  const col = resolveHeader(columns, aliases)
  if (col === undefined) {
    return null
  }

  const value = row.getCell(col).value
  if (value === null || value === undefined || value === "") return null

  if (value instanceof Date) {
    return {
      date: `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`,
      time: `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}:${String(value.getSeconds()).padStart(2, "0")}`,
    }
  }

  if (typeof value === "number") {
    const jsDate = new Date(Date.UTC(1899, 11, 30 + value))
    if (!Number.isNaN(jsDate.getTime())) {
      return {
        date: `${jsDate.getUTCFullYear()}-${String(jsDate.getUTCMonth() + 1).padStart(2, "0")}-${String(jsDate.getUTCDate()).padStart(2, "0")}`,
        time: null,
      }
    }
  }

  const text = toText(value)
  return parseDateString(text)
}

export async function parseChallanFile(file: File): Promise<ParsedWorkbook> {
  const ExcelJS = await loadExcelJS()
  const workbook = new ExcelJS.Workbook()

  try {
    await workbook.xlsx.load(await file.arrayBuffer())
  } catch {
    throw new ExcelFormatError(
      "This file could not be read. Upload an .xlsx file exported from the challan tool."
    )
  }

  const sheet = workbook.getWorksheet(SHEET_NAME) ?? workbook.worksheets[0]
  if (!sheet) throw new ExcelFormatError("The workbook has no sheets.")

  const columns = new Map<string, number>()
  sheet.getRow(1).eachCell({ includeEmpty: false }, (cell, col) => {
    const key = normalizeHeader(toText(cell.value))
    if (key) columns.set(key, col)
  })

  const fallbackStatusCol = findFallbackStatusColumn(sheet)
  const requiredStatus = resolveHeader(columns, HEADER_ALIASES.status) ?? fallbackStatusCol

  const missing = REQUIRED_COLUMNS.filter((h) => {
    if (h === "status") return requiredStatus === undefined
    return resolveHeader(columns, HEADER_ALIASES[h]) === undefined
  })
  if (missing.length) {
    throw new ExcelFormatError(
      `Missing column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}. Check that the first row of the sheet holds the column names.`
    )
  }

  const cell = (row: Row, header: string): CellValue | undefined => {
    if (header === "status" && requiredStatus !== undefined && !resolveHeader(columns, HEADER_ALIASES.status)) {
      return row.getCell(requiredStatus).value
    }
    const col = resolveHeader(columns, HEADER_ALIASES[header] ?? [header])
    return col ? row.getCell(col).value : undefined
  }
  const text = (row: Row, header: string, preferLink = false) =>
    toText(cell(row, header), preferLink)

  const rows: ChallanRow[] = []
  let skippedCount = 0
  let undatedCount = 0

  sheet.eachRow({ includeEmpty: false }, (row, rowIndex) => {
    if (rowIndex === 1) return

    const challanNo = text(row, "challanNo")
    const amount = toAmount(cell(row, "amount"))
    if (!challanNo && amount === null) return
    if (!challanNo || amount === null) {
      skippedCount += 1
      return
    }

    const assignedStamp = parseCellDate(row, columns, HEADER_ALIASES.date ?? ["assigned", "date"])
    const challanStamp = parseChallanTimestamp(challanNo)
    const stamp = assignedStamp ?? challanStamp
    if (!stamp) undatedCount += 1

    const n = Number(text(row, "rowNumber"))
    rows.push({
      rowNumber: Number.isFinite(n) && n > 0 ? n : null,
      challanNo,
      registrationNo: text(row, "registrationNo").toUpperCase(),
      chassis: text(row, "chassis"),
      chassisSource: text(row, "chassisSource"),
      chassisLookupStatus: text(row, "chassisLookupStatus"),
      engine: text(row, "engine"),
      engineSource: text(row, "engineSource"),
      mobile: text(row, "mobile"),
      courtDepartment: text(row, "courtDepartment"),
      amount,
      creditAmount: toAmount(cell(row, "creditAmount")) ?? 0,
      type: text(row, "type"),
      status: normalizeStatusValue(text(row, "status")),
      description: text(row, "description"),
      paymentUrl: text(row, "paymentUrl", true),
      backupStatus: normalizeStatusValue(text(row, "backupStatus")),
      backupUrl: text(row, "backupUrl", true),
      date: stamp?.date ?? null,
      time: stamp?.time ?? null,
    })
  })

  if (rows.length === 0) {
    throw new ExcelFormatError("No challan rows were found in this file.")
  }

  rows.sort((a, b) =>
    `${a.date ?? "9999"}${a.time ?? ""}`.localeCompare(`${b.date ?? "9999"}${b.time ?? ""}`)
  )

  return { rows, fileName: file.name, sheetName: sheet.name, undatedCount, skippedCount }
}
