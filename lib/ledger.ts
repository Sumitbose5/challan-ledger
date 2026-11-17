import type { ChallanRow } from "./types"

/**
 * HOW CREDIT / DEBIT / BALANCE ARE DEFINED
 * ----------------------------------------
 * The Excel sheet does not include credit by default. This app supports either:
 *   - status-driven settlement (legacy behaviour), or
 *   - manual credit override entered in the dashboard.
 *
 * Debit   = total of `amount` for challans marked as completed
 * Credit  = total of the effective credit for settled challans / manual overrides
 * Balance = Debit - Credit
 */
export const SETTLED_STATUSES = [
  "complete",
  "completed",
  "paid",
  "success",
  "successful",
  "settled",
]

export const REJECTED_STATUSES = ["rejected", "cancelled", "cancel", "failed", "failure"]
export const PENDING_STATUSES = ["pending", "open"]

export const normalizeStatus = (status: string) => status.trim().toLowerCase()

export const isSettled = (status: string) => SETTLED_STATUSES.includes(normalizeStatus(status))
export const isRejected = (status: string) => REJECTED_STATUSES.includes(normalizeStatus(status))
export const isPending = (status: string) => PENDING_STATUSES.includes(normalizeStatus(status))

export const round2 = (n: number) => Math.round(n * 100) / 100 || 0

export type Ledger = { debit: number; credit: number; balance: number }

export const rowDebit = (row: ChallanRow) => (isSettled(row.status) ? row.amount : 0)

export const rowCredit = (row: ChallanRow) => {
  if (row.creditAmount > 0) return round2(row.creditAmount)
  return isSettled(row.status) ? row.amount : 0
}

export function computeLedger(rows: ChallanRow[], overrideCredit?: number | null, serviceCharge = 0): Ledger {
  let debit = 0
  let credit = 0
  for (const row of rows) {
    debit += rowDebit(row)
    credit += rowCredit(row)
  }

  const total = round2(rows.reduce((sum, row) => sum + row.amount, 0) + serviceCharge)
  const defaultCredit = round2(Math.max(0, total - debit))
  const finalCredit = overrideCredit == null ? defaultCredit : round2(overrideCredit)

  debit = round2(debit)
  credit = round2(finalCredit)
  return { debit, credit, balance: round2(debit - credit) }
}
