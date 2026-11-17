const inr0 = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
})
const inr2 = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatINR(n: number): string {
  return (Number.isInteger(n) ? inr0 : inr2).format(n)
}

/** ₹1.5k style label for chart axes. */
export function compactINR(n: number): string {
  if (n >= 10_000_000) return `₹${+(n / 10_000_000).toFixed(1)}Cr`
  if (n >= 100_000) return `₹${+(n / 100_000).toFixed(1)}L`
  if (n >= 1000) return `₹${+(n / 1000).toFixed(1)}k`
  return `₹${n}`
}

export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`
}

/** "2023-08-04" -> local Date (no timezone shifting). */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d)
}

/** Local Date -> "2023-08-04". */
export function toISODate(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`
}

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
})
const weekdayFmt = new Intl.DateTimeFormat("en-GB", { weekday: "short" })
const shortFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "2-digit",
})

/** "Fri, 4 Aug 2023" (or "4 Aug 2023" with weekday: false). */
export function formatDay(iso: string, weekday = true): string {
  const d = parseISODate(iso)
  const date = dateFmt.format(d)
  return weekday ? `${weekdayFmt.format(d)}, ${date}` : date
}

/** "4 Aug 23" for chart ticks. */
export function formatShortDay(iso: string): string {
  return shortFmt.format(parseISODate(iso))
}
