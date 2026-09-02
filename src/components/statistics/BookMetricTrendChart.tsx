"use client"

import type { BookPeriodMetricKey } from "@/types/bookPeriodStatistics"
import { BOOK_PERIOD_METRIC_LABELS } from "@/types/bookPeriodStatistics"

type TrendRow = {
  label: string
  count: number
}

const METRIC_BAR_COLORS: Record<BookPeriodMetricKey, string> = {
  registered: "bg-sky-500/80",
  completed: "bg-emerald-500/80",
  reading: "bg-amber-500/80",
  started: "bg-violet-500/80",
  readingStarted: "bg-amber-500/80",
  wantToRead: "bg-indigo-500/80",
  onHold: "bg-slate-500/80",
}

type Props = {
  rows: TrendRow[]
  metric: BookPeriodMetricKey
}

export default function BookMetricTrendChart({ rows, metric }: Props) {
  if (rows.length === 0) return null

  const meta = BOOK_PERIOD_METRIC_LABELS[metric]
  const max = Math.max(1, ...rows.map((r) => r.count))
  const barColor = METRIC_BAR_COLORS[metric]

  return (
    <div className="rounded-xl border border-theme-tertiary/40 bg-theme-secondary p-4">
      <h3 className="mb-1 text-sm font-semibold text-theme-primary">
        {meta.title} 추이
      </h3>
      <p className="mb-4 text-xs text-theme-secondary">
        최근 {rows.length}개 기간 · {meta.title}
      </p>
      <div className="flex items-end justify-between gap-1 sm:gap-2">
        {rows.map((row) => {
          const h =
            row.count === 0
              ? 2
              : Math.max(8, Math.round((row.count / max) * 100))
          return (
            <div
              key={row.label}
              className="flex min-w-0 flex-1 flex-col items-center gap-1"
            >
              <div className="flex h-24 w-full items-end justify-center">
                <div
                  className={`w-4 rounded-t sm:w-5 ${barColor}`}
                  style={{ height: `${h}%` }}
                  title={`${row.count}권`}
                  aria-label={`${row.label} ${row.count}권`}
                />
              </div>
              <span className="max-w-full truncate text-[10px] text-theme-tertiary">
                {row.label}
              </span>
              <span className="text-[10px] font-medium tabular-nums text-theme-secondary">
                {row.count}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
