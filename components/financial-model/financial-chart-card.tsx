"use client"

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { formatChartTitle, formatCompact } from "@/lib/financial/format"
import { cn } from "@/lib/utils"

const chartColors: Record<string, string> = {
  revenue: "var(--chart-2)",
  burn: "var(--chart-4)",
  cashBalance: "var(--chart-1)",
  runway: "var(--chart-3)",
}

export function FinancialChartCard({
  chartKey,
  data,
  dataKey = "value",
  formatValue = formatCompact,
  compact = false,
}: {
  chartKey: string
  data: Record<string, string | number>[]
  dataKey?: string
  formatValue?: (value: number) => string
  compact?: boolean
}) {
  const title = formatChartTitle(chartKey)
  const color = chartColors[chartKey] ?? "var(--chart-2)"
  const config = {
    value: {
      label: title,
      color,
    },
  } satisfies ChartConfig

  const latest = data[data.length - 1]
  const latestValue = latest ? Number(latest[dataKey] ?? 0) : null

  return (
    <Card className={cn("overflow-hidden", compact && "flex min-h-0 flex-col")}>
      <CardHeader className={compact ? "px-3 py-2" : "pb-2"}>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className={compact ? "text-sm" : undefined}>{title}</CardTitle>
          {latestValue !== null ? (
            <span className={cn("font-heading leading-none text-muted-foreground", compact ? "text-sm" : "text-lg")}>
              {formatValue(latestValue)}
            </span>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className={compact ? "min-h-0 flex-1 px-2 pb-2" : undefined}>
        <ChartContainer
          config={config}
          className={cn("w-full", compact ? "h-full min-h-[7.5rem]" : "h-52")}
        >
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="4 4" className="stroke-border/50" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(value) => formatValue(Number(value))}
              tick={{ fontSize: 11 }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(label) => String(label || "Projection")}
                  formatter={(value) => formatValue(Number(value))}
                />
              }
            />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export function FinancialChartsGrid({
  charts,
  compact = false,
}: {
  charts: Record<string, Record<string, string | number>[]>
  compact?: boolean
}) {
  const order = ["revenue", "burn", "cashBalance", "runway"]
  const entries = order
    .filter((key) => charts[key]?.length)
    .map((key) => [key, charts[key]] as const)

  if (!entries.length) return null

  return (
    <div className={cn("gap-3", compact ? "grid h-full min-h-0 grid-cols-1 sm:grid-cols-2 sm:grid-rows-2" : "grid gap-4 md:grid-cols-2")}>
      {entries.map(([key, data]) => (
        <FinancialChartCard
          key={key}
          chartKey={key}
          data={data}
          compact={compact}
          formatValue={key === "runway" ? (value) => `${value} mo` : formatCompact}
        />
      ))}
    </div>
  )
}
