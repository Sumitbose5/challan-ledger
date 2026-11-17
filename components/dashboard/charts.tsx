"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { compactINR, formatDay, formatINR, formatShortDay, plural } from "@/lib/format"
import type { DailyPoint, Summary } from "@/lib/analytics"

const PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

const money = (v: number) => formatINR(v)

export function TrendChart({
  daily,
  selectedDate,
  onSelectDate,
}: {
  daily: DailyPoint[]
  selectedDate?: string
  onSelectDate: (date: string) => void
}) {
  const config = {
    settled: { label: "Settled", color: "var(--chart-2)" },
    outstanding: { label: "Outstanding", color: "var(--chart-3)" },
  } satisfies ChartConfig

  const data = daily.map((d) => ({
    date: d.date,
    settled: d.credit,
    outstanding: d.balance,
  }))

  const pick = (d: unknown) => {
    const p = (d as { payload?: { date?: string } }).payload
    if (p?.date) onSelectDate(p.date)
  }
  const opacity = (date: string) => (!selectedDate || date === selectedDate ? 1 : 0.35)

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Challan amount by day</CardTitle>
        <CardDescription>
          Every day in the file, split into settled and outstanding. Click a bar to open that day.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-64 [&_.recharts-bar-rectangle]:cursor-pointer">
          <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={16}
              tickFormatter={(v: string) => formatShortDay(v)}
            />
            <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={(v: number) => compactINR(v)} />
            <ChartTooltip
              cursor
              content={
                <ChartTooltipContent
                  labelFormatter={(l) => formatDay(String(l))}
                  valueFormatter={money}
                />
              }
            />
            <Bar dataKey="settled" stackId="day" fill="var(--color-settled)" onClick={pick}>
              {data.map((d) => (
                <Cell key={d.date} fillOpacity={opacity(d.date)} />
              ))}
            </Bar>
            <Bar dataKey="outstanding" stackId="day" fill="var(--color-outstanding)" onClick={pick}>
              {data.map((d) => (
                <Cell key={d.date} fillOpacity={opacity(d.date)} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
        <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-[2px] bg-chart-2" /> Settled
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-[2px] bg-chart-3" /> Outstanding
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

export function CourtChart({ summary }: { summary: Summary }) {
  const data = summary.byCourt
  return (
    <Card>
      <CardHeader>
        <CardTitle>By court / department</CardTitle>
        <CardDescription>Share of the challan amount</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative h-44">
          <ChartContainer config={{}} className="h-full">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent valueFormatter={money} />} />
              <Pie
                data={data}
                dataKey="amount"
                nameKey="name"
                innerRadius="62%"
                outerRadius="92%"
                paddingAngle={data.length > 1 ? 2 : 0}
                stroke="var(--card)"
                strokeWidth={2}
              >
                {data.map((b, i) => (
                  <Cell key={b.name} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="text-lg font-semibold tabular-nums">{formatINR(summary.totalAmount)}</p>
              <p className="text-xs text-muted-foreground">total</p>
            </div>
          </div>
        </div>
        <ul className="mt-4 space-y-2 text-sm">
          {data.map((b, i) => (
            <li key={b.name} className="flex items-center gap-2">
              <span className="size-2.5 rounded-[2px]" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
              <span className="font-medium">{b.name}</span>
              <span className="text-muted-foreground">{plural(b.count, "challan")}</span>
              <span className="ml-auto font-medium tabular-nums">{formatINR(b.amount)}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

export function AmountChart({ summary }: { summary: Summary }) {
  const config = { count: { label: "Challans", color: "var(--chart-1)" } } satisfies ChartConfig
  const data = summary.byAmount.map((a) => ({ ...a, label: formatINR(a.amount) }))
  return (
    <Card>
      <CardHeader>
        <CardTitle>Fine amounts</CardTitle>
        <CardDescription>How many challans at each amount</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-56">
          <BarChart data={data} margin={{ top: 16, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis tickLine={false} axisLine={false} width={28} allowDecimals={false} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  valueFormatter={(v, item) =>
                    `${v} · ${formatINR(Number((item.payload as { total?: number } | undefined)?.total ?? 0))}`
                  }
                />
              }
            />
            <Bar dataKey="count" fill="var(--color-count)" radius={[3, 3, 0, 0]} maxBarSize={48}>
              <LabelList dataKey="count" position="top" className="fill-foreground" fontSize={12} />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export function VehicleChart({ summary }: { summary: Summary }) {
  const config = { amount: { label: "Amount", color: "var(--chart-1)" } } satisfies ChartConfig
  const top = summary.vehicles.slice(0, 5)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top vehicles</CardTitle>
        <CardDescription>
          {summary.vehicleCount > 5 ? "Five highest by amount" : "By challan amount"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} style={{ height: Math.max(top.length * 44, 120) }}>
          <BarChart data={top} layout="vertical" margin={{ top: 0, right: 48, left: 0, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="registrationNo" tickLine={false} axisLine={false} width={88} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent valueFormatter={money} />} />
            <Bar dataKey="amount" fill="var(--color-amount)" radius={4} barSize={20}>
              <LabelList
                dataKey="amount"
                position="right"
                className="fill-foreground"
                fontSize={12}
                formatter={(v: unknown) => compactINR(Number(v))}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
