"use client"

import * as React from "react"
import { ResponsiveContainer, Tooltip } from "recharts"

import { cn } from "@/lib/utils"

export type ChartConfig = Record<string, { label: string; color: string }>

const ChartContext = React.createContext<{ config: ChartConfig } | null>(null)

/** Sizes the chart to its parent (give it a height with className) and exposes `--color-<key>` CSS variables. */
function ChartContainer({
  config,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  config: ChartConfig
  children: React.ReactElement
}) {
  const id = React.useId().replace(/:/g, "")
  const vars = Object.entries(config)
    .map(([key, value]) => `--color-${key}: ${value.color};`)
    .join(" ")

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={id}
        className={cn(
          "w-full text-xs [&_.recharts-bar-rectangle]:outline-hidden [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-sector]:outline-hidden [&_.recharts-surface]:outline-hidden",
          className
        )}
        {...props}
      >
        <style dangerouslySetInnerHTML={{ __html: `[data-chart="${id}"] { ${vars} }` }} />
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
}

const ChartTooltip = Tooltip

type TooltipItem = {
  dataKey?: string | number
  name?: string | number
  value?: number | string
  color?: string
  payload?: Record<string, unknown> & { fill?: string }
}

/** Passed as `content` to <ChartTooltip />. Recharts supplies active/payload/label. */
function ChartTooltipContent({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
}: {
  active?: boolean
  payload?: TooltipItem[]
  label?: string | number
  labelFormatter?: (label: string | number) => React.ReactNode
  valueFormatter?: (value: number, item: TooltipItem) => React.ReactNode
}) {
  const ctx = React.useContext(ChartContext)
  if (!active || !payload?.length) return null

  const heading =
    label === undefined || label === "" ? null : labelFormatter ? labelFormatter(label) : label

  return (
    <div className="grid min-w-36 gap-1.5 rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      {heading !== null && <div className="font-medium">{heading}</div>}
      {payload.map((item, i) => {
        const key = String(item.dataKey ?? item.name ?? i)
        const entry = ctx?.config[key]
        const color = item.payload?.fill ?? item.color ?? entry?.color
        const value = Number(item.value ?? 0)
        return (
          <div key={key} className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: color }} />
            <span className="text-muted-foreground">{entry?.label ?? item.name}</span>
            <span className="ml-auto pl-4 font-medium tabular-nums">
              {valueFormatter ? valueFormatter(value, item) : value}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export { ChartContainer, ChartTooltip, ChartTooltipContent }
