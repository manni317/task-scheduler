'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface ChartConfig {
  [key: string]: {
    label?: string
    icon?: React.ComponentType
    color?: string | 'hsl(var(--chart-1))' | 'hsl(var(--chart-2))' | 'hsl(var(--chart-3))' | 'hsl(var(--chart-4))' | 'hsl(var(--chart-5))'
  }
}

interface ChartContainerProps {
  children: React.ReactNode
  config: ChartConfig
}

export function ChartContainer({ children, config }: ChartContainerProps) {
  return (
    <div className="relative w-full h-full" data-chart-config={JSON.stringify(config)}>
      {children}
    </div>
  )
}

interface ChartTooltipProps {
  active?: boolean
  payload?: Array<{ value: number; name: string; color: string; payload: any }>
  label?: string
}

export function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null

  return (
    <div className="border rounded-lg bg-popover p-3 shadow-lg text-xs">
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="font-medium">{entry.name}:</span>
          <span>{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

interface ChartTooltipContentProps {
  children?: React.ReactNode
}

export function ChartTooltipContent({ children }: ChartTooltipContentProps) {
  return (
    <div className="border rounded-lg bg-popover p-3 shadow-lg text-xs">
      {children}
    </div>
  )
}

interface ChartLegendProps {
  payload: Array<{ value: string; color: string }>
  className?: string
}

export function ChartLegend({ payload, className }: ChartLegendProps) {
  return (
    <div className={cn('flex flex-wrap gap-4', className)}>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span>{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

interface ChartLegendContentProps {
  children?: React.ReactNode
}

export function ChartLegendContent({ children }: ChartLegendContentProps) {
  return <div className="flex flex-wrap gap-4">{children}</div>
}