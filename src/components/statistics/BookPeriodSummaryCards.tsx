"use client"

import type { BookPeriodAnalysis, BookPeriodMetricKey } from "@/types/bookPeriodStatistics"
import { BOOK_PERIOD_METRIC_LABELS } from "@/types/bookPeriodStatistics"

type Props = {
  analysis: BookPeriodAnalysis
  activeMetric: BookPeriodMetricKey
  onMetricChange: (key: BookPeriodMetricKey) => void
}

const METRIC_KEYS: BookPeriodMetricKey[] = [
  "registered",
  "completed",
  "reading",
  "started",
  "wantToRead",
  "onHold",
]

function countFor(analysis: BookPeriodAnalysis, key: BookPeriodMetricKey): number {
  switch (key) {
    case "registered":
      return analysis.registered.length
    case "completed":
      return analysis.completed.length
    case "reading":
      return analysis.reading.length
    case "started":
      return analysis.started.length
    case "readingStarted":
      return analysis.readingStarted.length
    case "wantToRead":
      return analysis.wantToRead.length
    case "onHold":
      return analysis.onHold.length
  }
}

const METRIC_COLORS: Record<BookPeriodMetricKey, string> = {
  registered: "border-sky-500/50 bg-sky-500/10",
  completed: "border-emerald-500/50 bg-emerald-500/10",
  reading: "border-amber-500/50 bg-amber-500/10",
  started: "border-violet-500/50 bg-violet-500/10",
  readingStarted: "border-amber-500/50 bg-amber-500/10",
  wantToRead: "border-indigo-500/50 bg-indigo-500/10",
  onHold: "border-slate-500/50 bg-slate-500/10",
}

export default function BookPeriodSummaryCards({
  analysis,
  activeMetric,
  onMetricChange,
}: Props) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {METRIC_KEYS.map((key) => {
        const meta = BOOK_PERIOD_METRIC_LABELS[key]
        const count = countFor(analysis, key)
        const active = activeMetric === key
        return (
          <button
            key={key}
            type="button"
            onClick={() => onMetricChange(key)}
            className={`rounded-xl border p-3 text-left transition-all ${
              active
                ? `${METRIC_COLORS[key]} ring-2 ring-accent-theme/30`
                : "border-theme-tertiary/40 bg-theme-secondary hover:border-theme-tertiary"
            }`}
          >
            <p className="text-[11px] font-medium text-theme-secondary">
              {meta.title}
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-theme-primary">
              {count}
            </p>
          </button>
        )
      })}
    </div>
  )
}

export function BookPeriodExtraStats({
  analysis,
}: {
  analysis: BookPeriodAnalysis
}) {
  if (
    analysis.completed.length === 0 &&
    analysis.kdcMajorCounts.length === 0
  ) {
    return null
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {analysis.averageCompletedRating != null && (
        <div className="rounded-xl border border-theme-tertiary/40 bg-theme-secondary p-4">
          <p className="text-xs font-medium text-theme-secondary">
            완독 평균 평점
          </p>
          <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {analysis.averageCompletedRating}
            <span className="ml-1 text-sm font-normal text-theme-tertiary">
              / 5
            </span>
          </p>
        </div>
      )}
      {analysis.kdcMajorCounts.length > 0 && (
        <div className="rounded-xl border border-theme-tertiary/40 bg-theme-secondary p-4">
          <p className="mb-2 text-xs font-medium text-theme-secondary">
            완독 분야 (KDC 대분류)
          </p>
          <ul className="space-y-1">
            {analysis.kdcMajorCounts.slice(0, 4).map((row) => (
              <li
                key={row.label}
                className="flex items-center justify-between text-sm"
              >
                <span className="truncate text-theme-primary">{row.label}</span>
                <span className="ml-2 shrink-0 tabular-nums font-medium text-theme-secondary">
                  {row.count}권
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
