/**
 * ExcelJS is loaded on demand so it stays out of the first page load.
 * It runs entirely in the browser: the uploaded file never leaves the device.
 */
export async function loadExcelJS(): Promise<typeof import("exceljs")> {
  const mod = await import("exceljs")
  return ((mod as unknown as { default?: typeof mod }).default ?? mod) as typeof mod
}
