"use client"

import * as React from "react"
import { IndianRupee } from "lucide-react"

import { FileDropzone } from "@/components/file-dropzone"
import { Dashboard } from "@/components/dashboard/dashboard"
import { uniqueDates } from "@/lib/analytics"
import { ExcelFormatError, parseChallanFile, type ParsedWorkbook } from "@/lib/parse-excel"
import type { Scope } from "@/lib/types"

export function ChallanApp() {
  const [data, setData] = React.useState<ParsedWorkbook | null>(null)
  const [scope, setScope] = React.useState<Scope>({ mode: "all" })
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [serviceCharge, setServiceCharge] = React.useState(0)

  async function handleFile(file: File) {
    setBusy(true)
    setError(null)
    try {
      if (!/\.xlsx$/i.test(file.name)) {
        throw new ExcelFormatError("That file isn't an .xlsx workbook. Export or save the challan sheet as .xlsx and try again.")
      }

      const promptValue = window.prompt("Enter service charge (₹)", "0")
      const parsedValue = Number(promptValue ?? "0")
      const nextServiceCharge = Number.isFinite(parsedValue) ? Math.max(0, parsedValue) : 0
      setServiceCharge(nextServiceCharge)

      const parsed = await parseChallanFile(file)
      const dates = uniqueDates(parsed.rows)
      setData(parsed)
      // Open on the most recent day that has challans.
      setScope(dates.length ? { mode: "day", date: dates[dates.length - 1] } : { mode: "all" })
    } catch (e) {
      setError(
        e instanceof ExcelFormatError
          ? e.message
          : "Something went wrong while reading the file. Check that it is a valid .xlsx file and try again."
      )
    } finally {
      setBusy(false)
    }
  }

  if (data) {
    return (
      <Dashboard
        data={data}
        scope={scope}
        serviceCharge={serviceCharge}
        onScopeChange={setScope}
        onReset={() => {
          setData(null)
          setError(null)
          setServiceCharge(0)
        }}
      />
    )
  }

  return (
    <div className="min-h-screen">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 font-semibold sm:px-6">
          <span className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground">
            <IndianRupee className="size-4" />
          </span>
          Challan Ledger
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Upload the challan sheet
        </h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          See the total challan amount, credit, debit and balance for any day, then download that
          day as an Excel report. Your file is read in this browser and is never uploaded.
        </p>

        <div className="mt-8">
          <FileDropzone onFile={handleFile} busy={busy} error={error} />
        </div>

        <div className="mt-8 grid gap-4 text-sm text-muted-foreground sm:grid-cols-2">
          <p>
            <span className="font-medium text-foreground">Columns used. </span>
            challanNo, registrationNo, amount and status are required. Other columns such as
            courtDepartment, chassis, mobile, paymentUrl and Assigned are shown when present.
          </p>
          <p>
            <span className="font-medium text-foreground">Dates. </span>
            The parser accepts a real date column such as Assigned and also falls back to the
            12-digit timestamp at the end of the challan number when that date is not present.
          </p>
        </div>
      </main>
    </div>
  )
}
