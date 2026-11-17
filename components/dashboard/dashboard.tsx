"use client"

import * as React from "react"
import {
  Download,
  FileSpreadsheet,
  IndianRupee,
  LoaderCircle,
  TriangleAlert,
  Upload,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { DateFilter } from "@/components/dashboard/date-filter"
import { LedgerPanel, StatStrip, TotalPanel } from "@/components/dashboard/kpis"
import { AmountChart, CourtChart, TrendChart, VehicleChart } from "@/components/dashboard/charts"
import { InsightsCard } from "@/components/dashboard/insights"
import { DataTables } from "@/components/dashboard/data-tables"
import { buildInsights, dailySeries, filterRows, summarize, uniqueDates } from "@/lib/analytics"
import { downloadReport } from "@/lib/export-excel"
import { formatDay, plural } from "@/lib/format"
import { round2 } from "@/lib/ledger"
import type { ParsedWorkbook } from "@/lib/parse-excel"
import type { Scope } from "@/lib/types"

export function Dashboard({
  data,
  scope,
  serviceCharge,
  onScopeChange,
  onReset,
}: {
  data: ParsedWorkbook
  scope: Scope
  serviceCharge: number
  onScopeChange: (scope: Scope) => void
  onReset: () => void
}) {
  const { rows: initialRows } = data
  const [downloading, setDownloading] = React.useState(false)
  const [downloadError, setDownloadError] = React.useState<string | null>(null)
  const [rows, setRows] = React.useState<ParsedWorkbook["rows"]>(initialRows)
  const [creditOverride, setCreditOverride] = React.useState<number | null>(null)

  React.useEffect(() => {
    setRows(initialRows)
    setCreditOverride(null)
  }, [initialRows])

  const totalWithService = React.useMemo(
    () => round2(rows.reduce((sum, r) => sum + r.amount, 0) + serviceCharge),
    [rows, serviceCharge]
  )

  const dates = React.useMemo(() => uniqueDates(rows), [rows])
  const daily = React.useMemo(() => dailySeries(rows), [rows])
  const allTotal = React.useMemo(() => totalWithService, [totalWithService])
  const scoped = React.useMemo(() => filterRows(rows, scope), [rows, scope])
  const summary = React.useMemo(
    () => summarize(scoped, creditOverride ?? null, serviceCharge),
    [scoped, creditOverride, serviceCharge]
  )
  const insights = React.useMemo(
    () => buildInsights({ rows: scoped, summary, scope, daily, allTotal }),
    [scoped, summary, scope, daily, allTotal]
  )

  async function handleDownload() {
    setDownloading(true)
    setDownloadError(null)
    try {
      await downloadReport({ allRows: rows, scope, sourceFile: data.fileName, creditOverride, serviceCharge })
    } catch {
      setDownloadError("The Excel report could not be created. Try again.")
    } finally {
      setDownloading(false)
    }
  }

  const title = scope.mode === "day" ? formatDay(scope.date) : "All dates"
  const subtitle =
    scope.mode === "day"
      ? `${plural(summary.count, "challan")}. Day ${dates.indexOf(scope.date) + 1} of the ${dates.length} that have challans in this file.`
      : dates.length
        ? `${plural(summary.count, "challan")} from ${formatDay(dates[0], false)} to ${formatDay(dates[dates.length - 1], false)}`
        : plural(summary.count, "challan")

  return (
    <div className="min-h-screen">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2 font-semibold">
            <span className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground">
              <IndianRupee className="size-4" />
            </span>
            Challan Ledger
          </div>
          <div className="flex min-w-0 items-center gap-3">
            <span className="hidden min-w-0 items-center gap-1.5 text-sm text-muted-foreground sm:inline-flex">
              <FileSpreadsheet className="size-4 shrink-0" />
              <span className="truncate">{data.fileName}</span>
            </span>
            <Button variant="outline" size="sm" onClick={onReset}>
              <Upload /> Upload new file
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <div className="space-y-5">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <DateFilter dates={dates} scope={scope} onChange={onScopeChange} />
            <Button onClick={handleDownload} disabled={downloading || scoped.length === 0}>
              {downloading ? <LoaderCircle className="animate-spin" /> : <Download />}
              {scope.mode === "day" ? "Download day report" : "Download full report"} (.xlsx)
            </Button>
          </div>
          {downloadError && (
            <p role="alert" className="text-sm text-destructive">
              {downloadError}
            </p>
          )}
        </div>

        {(data.undatedCount > 0 || data.skippedCount > 0) && (
          <div className="flex items-start gap-2 rounded-md border border-debit/30 bg-debit/5 px-3 py-2.5 text-sm text-debit">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <p>
              {data.undatedCount > 0 &&
                `${plural(data.undatedCount, "challan")} ${data.undatedCount === 1 ? "has" : "have"} no readable date in the challan number, so ${data.undatedCount === 1 ? "it appears" : "they appear"} only under All dates. `}
              {data.skippedCount > 0 &&
                `${plural(data.skippedCount, "row")} ${data.skippedCount === 1 ? "was" : "were"} skipped because the challan number or amount was missing.`}
            </p>
          </div>
        )}

        {scoped.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
            No challans for this selection. Pick another date or switch to All dates.
          </div>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-5">
              <TotalPanel summary={summary} scope={scope} serviceCharge={serviceCharge} />
              <LedgerPanel summary={summary} creditOverride={creditOverride} onCreditChange={setCreditOverride} />
            </div>

            <StatStrip summary={summary} />

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <TrendChart
                  daily={daily}
                  selectedDate={scope.mode === "day" ? scope.date : undefined}
                  onSelectDate={(date) => onScopeChange({ mode: "day", date })}
                />
              </div>
              <InsightsCard insights={insights} />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <CourtChart summary={summary} />
              <AmountChart summary={summary} />
              <VehicleChart summary={summary} />
            </div>

            <DataTables rows={scoped} summary={summary} onRowsChange={setRows} serviceCharge={serviceCharge} />
          </>
        )}
      </main>
    </div>
  )
}
