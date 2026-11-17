export type ChallanRow = {
  rowNumber: number | null
  challanNo: string
  registrationNo: string
  chassis: string
  chassisSource: string
  chassisLookupStatus: string
  engine: string
  engineSource: string
  mobile: string
  courtDepartment: string
  amount: number
  creditAmount: number
  type: string
  status: string
  description: string
  paymentUrl: string
  backupStatus: string
  backupUrl: string
  /** Challan date as yyyy-MM-dd, read from the challan number. null if it can't be read. */
  date: string | null
  /** Challan time as HH:mm:ss, read from the challan number. */
  time: string | null
}

/** What the dashboard is currently showing. */
export type Scope = { mode: "day"; date: string } | { mode: "all" }
