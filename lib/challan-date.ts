/**
 * The sheet has no date column, but every challan number ends with the
 * 12-digit time it was generated: YYMMDDHHMMSS.
 *   UP136319230804194602  ->  2023-08-04 19:46:02
 */
export function parseChallanTimestamp(
  challanNo: string
): { date: string; time: string } | null {
  const match = /(\d{12})$/.exec(challanNo.trim())
  if (!match) return null

  const s = match[1]
  const year = 2000 + Number(s.slice(0, 2))
  const month = Number(s.slice(2, 4))
  const day = Number(s.slice(4, 6))
  const hour = Number(s.slice(6, 8))
  const minute = Number(s.slice(8, 10))
  const second = Number(s.slice(10, 12))

  // Reject impossible dates such as 31 Feb or 25:61:00.
  const check = new Date(Date.UTC(year, month - 1, day))
  const validDate =
    check.getUTCFullYear() === year &&
    check.getUTCMonth() === month - 1 &&
    check.getUTCDate() === day
  if (!validDate || hour > 23 || minute > 59 || second > 59) return null

  const p = (n: number) => String(n).padStart(2, "0")
  return {
    date: `${year}-${p(month)}-${p(day)}`,
    time: `${p(hour)}:${p(minute)}:${p(second)}`,
  }
}
