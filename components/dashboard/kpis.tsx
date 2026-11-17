"use client"

import * as React from "react"
import { Edit2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatINR, plural } from "@/lib/format"
import type { Summary } from "@/lib/analytics"
import type { Scope } from "@/lib/types"

export function TotalPanel({ summary, scope, serviceCharge = 0 }: { summary: Summary; scope: Scope; serviceCharge?: number }) {
  const challanTotal = summary.totalAmount - (serviceCharge * summary.count)
  const totalServiceCharges = serviceCharge * summary.count
  
  return (
    <section className="rounded-lg border bg-card p-6 lg:col-span-2">
      <h2 className="text-sm font-medium text-muted-foreground">Total amount</h2>
      <p className="mt-3 text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">
        {formatINR(summary.totalAmount)}
      </p>
      <div className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>{plural(summary.count, "challan")} amount</span>
          <span className="tabular-nums">{formatINR(challanTotal)}</span>
        </div>
        {serviceCharge > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <span>{plural(summary.count, "service charge")} ({formatINR(serviceCharge)} each)</span>
            <span className="tabular-nums">{formatINR(totalServiceCharges)}</span>
          </div>
        )}
        <div className="border-t pt-2 flex justify-between font-medium">
          <span>Total</span>
          <span className="tabular-nums">{formatINR(summary.totalAmount)}</span>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {scope.mode === "day" ? "On this day" : "In this file"}
      </p>
    </section>
  )
}

function Figure({ label, hint, value, prefix, className }: { label: string; hint: string; value: number; prefix?: string; className?: string }) {
  return (
    <div className="min-w-0 px-3 first:pl-0 last:pr-0 sm:px-5">
      <p className="text-sm font-medium">{label}</p>
      <p className={`mt-2 flex items-baseline gap-1.5 text-xl font-semibold tabular-nums sm:text-3xl ${className ?? ""}`}>
        {prefix && <span className="text-base font-normal text-muted-foreground">{prefix}</span>}
        <span className="truncate">{formatINR(value)}</span>
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}

export function LedgerPanel({
  summary,
  creditOverride,
  onCreditChange,
}: {
  summary: Summary
  creditOverride: number | null
  onCreditChange: (value: number | null) => void
}) {
  const { ledger, settledPct } = summary
  const settled = ledger.balance === 0
  const pct = Math.min(100, Math.max(0, settledPct))
  const displayCredit = creditOverride == null ? Math.max(0, summary.totalAmount - ledger.debit) : creditOverride
  
  const [showDialog, setShowDialog] = React.useState(false)
  const [tempCredit, setTempCredit] = React.useState(String(displayCredit))

  const handleEditClick = () => {
    setTempCredit(String(displayCredit))
    setShowDialog(true)
  }

  const handleSave = () => {
    const raw = tempCredit
    if (raw === "") {
      onCreditChange(null)
    } else {
      const next = Number(raw)
      onCreditChange(Number.isFinite(next) ? Math.max(0, next) : null)
    }
    setShowDialog(false)
  }

  return (
    <>
      <section className="rounded-lg border bg-card p-6 lg:col-span-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">Ledger</h2>
          <Badge variant={settled ? "credit" : "debit"}>{settled ? "Fully settled" : "Balance outstanding"}</Badge>
        </div>

        <div className="mt-4 grid grid-cols-3 divide-x">
          <Figure label="Debit" hint="Completed challans" value={ledger.debit} className="text-debit" />
          <div className="min-w-0 px-3 first:pl-0 last:pr-0 sm:px-5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Credit</label>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleEditClick}
                title="Edit credit amount"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-2 text-xl font-semibold tabular-nums text-credit">
              {formatINR(displayCredit)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Calculated from total and debit; editable</p>
          </div>
          <Figure label="Balance" hint="Debit − Credit" value={ledger.balance} prefix="=" />
        </div>

        {/* <div className="mt-6">
          <div
            role="progressbar"
            aria-label="Share of the amount that is settled"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(pct)}
            className="h-2 overflow-hidden rounded-full bg-debit/20"
          >
            <div className="h-full rounded-full bg-credit" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{pct.toFixed(0)}% of the debit is settled.</p>
        </div> */}
      </section>

      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-lg border bg-card p-6 shadow-lg max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold">Edit Credit Amount</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter the credit amount to override the calculated value.
            </p>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={tempCredit}
              onChange={(e) => setTempCredit(e.target.value)}
              className="mt-4 w-full text-xl font-semibold tabular-nums"
              placeholder="0.00"
            />
            <div className="mt-6 flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                className="bg-credit hover:bg-credit/90"
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export function StatStrip({ summary }: { summary: Summary }) {
  const stats = [
    { label: "Challans", value: String(summary.count) },
    { label: "Vehicles", value: String(summary.vehicleCount) },
    { label: "Average challan", value: formatINR(summary.averageAmount) },
    { label: "Highest challan", value: formatINR(summary.maxAmount) },
  ]
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="bg-card px-5 py-4">
          <dt className="text-sm text-muted-foreground">{s.label}</dt>
          <dd className="mt-1 text-xl font-semibold tabular-nums">{s.value}</dd>
        </div>
      ))}
    </dl>
  )
}
