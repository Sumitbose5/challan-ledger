import type { ChallanRow, Scope } from "./types"
import { computeLedger, isSettled, rowCredit, round2, type Ledger } from "./ledger"
import { formatDay, formatINR, plural } from "./format"

export type Bucket = { name: string; count: number; amount: number }
export type AmountBucket = { amount: number; count: number; total: number }
export type VehicleSummary = {
  registrationNo: string
  chassis: string
  mobile: string
  count: number
  amount: number
  credit: number
  balance: number
}
export type DailyPoint = {
  date: string
  count: number
  debit: number
  credit: number
  balance: number
}
export type Summary = {
  count: number
  vehicleCount: number
  totalAmount: number
  averageAmount: number
  maxAmount: number
  ledger: Ledger
  /** 0-100. Share of the debit that has been settled. */
  settledPct: number
  byCourt: Bucket[]
  byStatus: Bucket[]
  byAmount: AmountBucket[]
  vehicles: VehicleSummary[]
}

export function uniqueDates(rows: ChallanRow[]): string[] {
  const set = new Set<string>()
  for (const r of rows) if (r.date) set.add(r.date)
  return [...set].sort()
}

export function filterRows(rows: ChallanRow[], scope: Scope): ChallanRow[] {
  return scope.mode === "all" ? rows : rows.filter((r) => r.date === scope.date)
}

function groupBy(rows: ChallanRow[], key: (r: ChallanRow) => string): Bucket[] {
  const map = new Map<string, Bucket>()
  for (const r of rows) {
    const name = key(r) || "Unknown"
    const b = map.get(name) ?? { name, count: 0, amount: 0 }
    b.count += 1
    b.amount += r.amount
    map.set(name, b)
  }
  return [...map.values()]
    .map((b) => ({ ...b, amount: round2(b.amount) }))
    .sort((a, b) => b.amount - a.amount || b.count - a.count)
}

export function summarize(rows: ChallanRow[], overrideCredit: number | null = null, serviceCharge = 0): Summary {
  const totalAmount = round2(rows.reduce((sum, r) => sum + r.amount, 0) + serviceCharge)
  const ledger = computeLedger(rows, overrideCredit, serviceCharge)

  const vehicleMap = new Map<string, VehicleSummary>()
  const amountMap = new Map<number, AmountBucket>()
  let maxAmount = 0

  for (const r of rows) {
    const key = r.registrationNo || "Unknown"
    const v = vehicleMap.get(key) ?? {
      registrationNo: key,
      chassis: "",
      mobile: "",
      count: 0,
      amount: 0,
      credit: 0,
      balance: 0,
    }
    v.count += 1
    v.amount += r.amount
    v.credit += rowCredit(r)
    if (!v.chassis && r.chassis) v.chassis = r.chassis
    if (!v.mobile && r.mobile) v.mobile = r.mobile
    vehicleMap.set(key, v)

    const a = amountMap.get(r.amount) ?? { amount: r.amount, count: 0, total: 0 }
    a.count += 1
    a.total += r.amount
    amountMap.set(r.amount, a)

    if (r.amount > maxAmount) maxAmount = r.amount
  }

  const vehicles = [...vehicleMap.values()]
    .map((v) => ({
      ...v,
      amount: round2(v.amount),
      credit: round2(v.credit),
      balance: round2(v.amount - v.credit),
    }))
    .sort(
      (a, b) =>
        b.amount - a.amount ||
        b.count - a.count ||
        a.registrationNo.localeCompare(b.registrationNo)
    )

  return {
    count: rows.length,
    vehicleCount: vehicleMap.size,
    totalAmount,
    averageAmount: rows.length ? round2(totalAmount / rows.length) : 0,
    maxAmount,
    ledger,
    settledPct: ledger.debit > 0 ? (ledger.credit / ledger.debit) * 100 : 0,
    byCourt: groupBy(rows, (r) => r.courtDepartment),
    byStatus: groupBy(rows, (r) => r.status),
    byAmount: [...amountMap.values()]
      .map((a) => ({ ...a, total: round2(a.total) }))
      .sort((a, b) => a.amount - b.amount),
    vehicles,
  }
}

/** One point per day that has challans, oldest first. Always built from the full file. */
export function dailySeries(rows: ChallanRow[]): DailyPoint[] {
  const byDate = new Map<string, ChallanRow[]>()
  for (const r of rows) {
    if (!r.date) continue
    const list = byDate.get(r.date)
    if (list) list.push(r)
    else byDate.set(r.date, [r])
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, list]) => {
      const l = computeLedger(list)
      return { date, count: list.length, debit: l.debit, credit: l.credit, balance: l.balance }
    })
}

export function buildInsights(args: {
  rows: ChallanRow[]
  summary: Summary
  scope: Scope
  daily: DailyPoint[]
  allTotal: number
}): string[] {
  const { rows, summary, scope, daily, allTotal } = args
  const out: string[] = []
  if (rows.length === 0) return out

  const { ledger } = summary

  if (ledger.debit > 0) {
    if (ledger.balance === 0) {
      out.push("Every challan in this view is settled. Nothing is outstanding.")
    } else {
      const open = rows.filter((r) => !isSettled(r.status)).length
      out.push(
        `${formatINR(ledger.balance)} is still outstanding across ${plural(open, "challan")}. ${summary.settledPct.toFixed(0)}% of the amount is settled.`
      )
    }
  }

  if (rows.length > 1) {
    const top = rows.reduce((a, b) => (b.amount > a.amount ? b : a))
    out.push(
      `The highest challan is ${formatINR(top.amount)} on ${top.registrationNo}${top.courtDepartment ? ` (${top.courtDepartment})` : ""}.`
    )
  }

  const repeat = summary.vehicles
    .filter((v) => v.count > 1)
    .sort((a, b) => b.count - a.count || b.amount - a.amount)
  if (repeat.length) {
    const v = repeat[0]
    out.push(`${v.registrationNo} has the most challans: ${v.count}, worth ${formatINR(v.amount)}.`)
  } else if (rows.length > 1) {
    out.push("No vehicle has more than one challan in this view.")
  }

  if (summary.byCourt.length > 1 && summary.totalAmount > 0) {
    const c = summary.byCourt[0]
    out.push(
      `${c.name} has the largest share: ${formatINR(c.amount)} (${((c.amount / summary.totalAmount) * 100).toFixed(0)}%) from ${plural(c.count, "challan")}.`
    )
  }

  if (scope.mode === "day" && allTotal > 0) {
    out.push(
      `This day is ${((summary.totalAmount / allTotal) * 100).toFixed(1)}% of the ${formatINR(allTotal)} in the whole file.`
    )
  }

  if (scope.mode === "all" && daily.length > 1) {
    const busiest = daily.reduce((a, b) => (b.count > a.count ? b : a))
    const richest = daily.reduce((a, b) => (b.debit > a.debit ? b : a))
    out.push(
      `The busiest day was ${formatDay(busiest.date, false)} with ${plural(busiest.count, "challan")}.`
    )
    out.push(
      `The highest-value day was ${formatDay(richest.date, false)} at ${formatINR(richest.debit)}.`
    )
  }

  return out
}
