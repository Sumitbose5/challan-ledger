"use client"

import * as React from "react"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { formatDay, parseISODate, toISODate } from "@/lib/format"
import type { Scope } from "@/lib/types"

export function DateFilter({
  dates,
  scope,
  onChange,
}: {
  dates: string[]
  scope: Scope
  onChange: (scope: Scope) => void
}) {
  const [open, setOpen] = React.useState(false)
  const dateSet = React.useMemo(() => new Set(dates), [dates])

  const hasDates = dates.length > 0
  const first = dates[0]
  const last = dates[dates.length - 1]

  const index = scope.mode === "day" ? dates.indexOf(scope.date) : -1
  const prev = index > 0 ? dates[index - 1] : undefined
  const next = index >= 0 && index < dates.length - 1 ? dates[index + 1] : undefined
  const selected = scope.mode === "day" ? parseISODate(scope.date) : undefined

  const segment = (active: boolean) =>
    cn(
      "h-8 rounded-sm px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50",
      active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
    )

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div role="group" aria-label="View" className="inline-flex rounded-md border bg-card p-0.5">
        <button
          type="button"
          aria-pressed={scope.mode === "day"}
          disabled={!hasDates}
          className={segment(scope.mode === "day")}
          onClick={() => hasDates && onChange({ mode: "day", date: last })}
        >
          Single day
        </button>
        <button
          type="button"
          aria-pressed={scope.mode === "all"}
          className={segment(scope.mode === "all")}
          onClick={() => onChange({ mode: "all" })}
        >
          All dates
        </button>
      </div>

      <div className="inline-flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          aria-label="Previous day with challans"
          disabled={!prev}
          onClick={() => prev && onChange({ mode: "day", date: prev })}
        >
          <ChevronLeft />
        </Button>

        {hasDates ? (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="min-w-44 justify-start">
                <CalendarDays />
                {scope.mode === "day" ? formatDay(scope.date) : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-4 max-w-sm">
              <div className="space-y-4">
                <Calendar
                  mode="single"
                  captionLayout="dropdown"
                  selected={selected}
                  defaultMonth={selected ?? parseISODate(last)}
                  startMonth={parseISODate(first)}
                  endMonth={parseISODate(last)}
                  disabled={(d) => !dateSet.has(toISODate(d))}
                  modifiers={{ hasData: (d) => dateSet.has(toISODate(d)) }}
                  modifiersClassNames={{
                    hasData: "[&>button]:font-semibold [&>button]:text-foreground [&>button]:bg-accent/50",
                  }}
                  onSelect={(d) => {
                    if (d) {
                      onChange({ mode: "day", date: toISODate(d) })
                      setOpen(false)
                    }
                  }}
                />
                <div className="border-t pt-3">
                  <p className="text-xs text-muted-foreground text-center">
                    {dates.length} day{dates.length !== 1 ? "s" : ""} with challan{dates.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        ) : (
          <Button variant="outline" className="min-w-44 justify-start" disabled>
            <CalendarDays />
            No dates found
          </Button>
        )}

        <Button
          variant="outline"
          size="icon"
          aria-label="Next day with challans"
          disabled={!next}
          onClick={() => next && onChange({ mode: "day", date: next })}
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  )
}
