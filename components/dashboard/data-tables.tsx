"use client"

import * as React from "react"
import { ExternalLink, Search } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDay, formatINR } from "@/lib/format"
import { isSettled, normalizeStatus } from "@/lib/ledger"
import type { Summary } from "@/lib/analytics"
import type { ChallanRow } from "@/lib/types"
import { cn } from "@/lib/utils"

const PAGE = 50
const isHttpUrl = (url: string) => /^https?:\/\//i.test(url)
const statusOptions = ["completed", "rejected", "pending"]

export function DataTables({
  rows,
  summary,
  onRowsChange,
  serviceCharge = 0,
}: {
  rows: ChallanRow[]
  summary: Summary
  onRowsChange: React.Dispatch<React.SetStateAction<ChallanRow[]>>
  serviceCharge?: number
}) {
  const [view, setView] = React.useState<"challans" | "vehicles">("challans")
  const [query, setQuery] = React.useState("")
  const [limit, setLimit] = React.useState(PAGE)
  const [confirmStatus, setConfirmStatus] = React.useState<{ row: ChallanRow; newStatus: string } | null>(null)

  React.useEffect(() => setLimit(PAGE), [rows, query, view])

  const q = query.trim().toLowerCase()
  const challans = React.useMemo(
    () =>
      q
        ? rows.filter((r) =>
            [
              r.challanNo,
              r.registrationNo,
              r.courtDepartment,
              r.status,
              // r.mobile,
              // r.chassis,
              // r.engine,
              // r.description,
            ]
              .join(" ")
              .toLowerCase()
              .includes(q)
          )
        : rows,
    [rows, q]
  )
  const vehicles = React.useMemo(
    () =>
      q
        ? summary.vehicles.filter((v) =>
            [v.registrationNo, /* v.chassis, v.mobile */].join(" ").toLowerCase().includes(q)
          )
        : summary.vehicles,
    [summary.vehicles, q]
  )

  const updateRow = (target: ChallanRow, mutate: (row: ChallanRow) => ChallanRow) => {
    onRowsChange((current) =>
      current.map((row) => {
        const sameRow =
          row.challanNo === target.challanNo &&
          row.registrationNo === target.registrationNo &&
          row.amount === target.amount &&
          row.date === target.date &&
          row.time === target.time
        return sameRow ? mutate(row) : row
      })
    )
  }

  const tab = (active: boolean) =>
    cn(
      "h-8 rounded-sm px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
      active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
    )

  const shown = view === "challans" ? challans.length : vehicles.length
  const total = view === "challans" ? rows.length : summary.vehicles.length

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <div role="group" aria-label="Table" className="inline-flex rounded-md border bg-background p-0.5">
          <button type="button" aria-pressed={view === "challans"} className={tab(view === "challans")} onClick={() => setView("challans")}>
            Challans ({rows.length})
          </button>
          <button type="button" aria-pressed={view === "vehicles"} className={tab(view === "vehicles")} onClick={() => setView("vehicles")}>
            Vehicles ({summary.vehicles.length})
          </button>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search challan no, vehicle, mobile"
            aria-label="Search the table"
            className="pl-9"
          />
        </div>
      </div>

      {view === "challans" ? (
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Challan no</TableHead>
                {/* <TableHead>Row</TableHead> */}
                <TableHead>Date</TableHead>
                <TableHead>Vehicle</TableHead>
                {/* <TableHead>Chassis</TableHead> */}
                {/* <TableHead>Engine</TableHead> */}
                {/* <TableHead>Mobile</TableHead> */}
                <TableHead>Court</TableHead>
                {/* <TableHead>Type</TableHead> */}
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Service Charge</TableHead>
                <TableHead>Total Amount</TableHead>
                {/* <TableHead>Description</TableHead> */}
                <TableHead>Payment link</TableHead>
                {/* <TableHead>Backup status</TableHead> */}
                {/* <TableHead>Backup URL</TableHead> */}
                {/* <TableHead>Chassis source</TableHead> */}
                {/* <TableHead>Chassis lookup</TableHead> */}
                {/* <TableHead>Engine source</TableHead> */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {challans.slice(0, limit).map((r, i) => (
                <TableRow key={`${r.challanNo}-${i}`} className="align-top">
                  <TableCell className="font-medium whitespace-nowrap">{r.challanNo}</TableCell>
                  {/* <TableCell className="whitespace-nowrap">{r.rowNumber ?? "-"}</TableCell> */}
                  <TableCell className="whitespace-nowrap">
                    {r.date ? formatDay(r.date, false) : "No date"}
                    {r.time && <span className="ml-2 text-muted-foreground">{r.time.slice(0, 5)}</span>}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{r.registrationNo || "-"}</TableCell>
                  {/* <TableCell className="whitespace-nowrap">{r.chassis || "-"}</TableCell> */}
                  {/* <TableCell className="whitespace-nowrap">{r.engine || "-"}</TableCell> */}
                  {/* <TableCell className="whitespace-nowrap">{r.mobile || "-"}</TableCell> */}
                  <TableCell className="whitespace-nowrap">
                    {r.courtDepartment ? <Badge variant="outline">{r.courtDepartment}</Badge> : "-"}
                  </TableCell>
                  {/* <TableCell className="whitespace-nowrap">{r.type || "-"}</TableCell> */}
                  <TableCell className="min-w-32 whitespace-nowrap">
                    {normalizeStatus(r.status || "pending") === "completed" ? (
                      <Badge variant="credit" className="cursor-default">{r.status}</Badge>
                    ) : (
                      <select
                        value={normalizeStatus(r.status || "pending")}
                        onChange={(e) => {
                          const newStatus = e.target.value
                          if (normalizeStatus(newStatus) === "completed") {
                            setConfirmStatus({ row: r, newStatus })
                          } else {
                            updateRow(r, (row) => ({ ...row, status: newStatus }))
                          }
                        }}
                        className="h-9 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      >
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums whitespace-nowrap">
                    {formatINR(r.amount)}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums whitespace-nowrap">
                    {formatINR(serviceCharge)}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums whitespace-nowrap">
                    {formatINR(r.amount + serviceCharge)}
                  </TableCell>
                  {/* <TableCell className="min-w-40">{r.description || "-"}</TableCell> */}
                  <TableCell className="whitespace-nowrap">
                    {isHttpUrl(r.paymentUrl) ? (
                      <a
                        href={r.paymentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        Open <ExternalLink className="size-3.5" />
                      </a>
                    ) : (
                      r.paymentUrl || "-"
                    )}
                  </TableCell>
                  {/* <TableCell className="whitespace-nowrap">
                    {r.backupStatus ? (
                      <Badge variant={isSettled(r.backupStatus) ? "credit" : "debit"}>{r.backupStatus}</Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell> */}
                  {/* <TableCell className="whitespace-nowrap">
                    {r.backupUrl ? (
                      isHttpUrl(r.backupUrl) ? (
                        <a href={r.backupUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                          Open
                        </a>
                      ) : (
                        r.backupUrl
                      )
                    ) : (
                      "-"
                    )}
                  </TableCell> */}
                  {/* <TableCell className="whitespace-nowrap">{r.chassisSource || "-"}</TableCell> */}
                  {/* <TableCell className="whitespace-nowrap">{r.chassisLookupStatus || "-"}</TableCell> */}
                  {/* <TableCell className="whitespace-nowrap">{r.engineSource || "-"}</TableCell> */}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Vehicle</TableHead>
              {/* <TableHead>Chassis</TableHead> */}
              {/* <TableHead>Mobile</TableHead> */}
              <TableHead className="text-right">Challans</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.slice(0, limit).map((v) => (
              <TableRow key={v.registrationNo}>
                <TableCell className="font-medium">{v.registrationNo}</TableCell>
                {/* <TableCell>{v.chassis || "-"}</TableCell> */}
                {/* <TableCell>{v.mobile || "-"}</TableCell> */}
                <TableCell className="text-right tabular-nums">{v.count}</TableCell>
                <TableCell className="text-right tabular-nums">{formatINR(v.amount)}</TableCell>
                <TableCell className="text-right text-credit tabular-nums">{formatINR(v.credit)}</TableCell>
                <TableCell className={cn("text-right font-medium tabular-nums", v.balance > 0 && "text-debit")}>
                  {formatINR(v.balance)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {shown === 0 && (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">Nothing matches &ldquo;{query}&rdquo;.</p>
      )}

      <div className="flex items-center justify-between gap-3 border-t px-5 py-3 text-sm text-muted-foreground">
        <span>
          Showing {Math.min(limit, shown)} of {shown}
          {shown !== total && ` (filtered from ${total})`}
        </span>
        {shown > limit && (
          <Button variant="outline" size="sm" onClick={() => setLimit((n) => n + PAGE)}>
            Show {Math.min(PAGE, shown - limit)} more
          </Button>
        )}
      </div>

      {confirmStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-lg border bg-card p-6 shadow-lg max-w-sm">
            <h3 className="text-lg font-semibold">Mark as Completed?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Once you mark this challan as completed, it cannot be reverted. Are you sure?
            </p>
            <p className="mt-3 font-medium text-sm">
              Challan: <span className="text-primary">{confirmStatus.row.challanNo}</span>
            </p>
            <div className="mt-6 flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setConfirmStatus(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  updateRow(confirmStatus.row, (row) => ({ ...row, status: confirmStatus.newStatus }))
                  setConfirmStatus(null)
                }}
                className="bg-credit hover:bg-credit/90"
              >
                Proceed
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
