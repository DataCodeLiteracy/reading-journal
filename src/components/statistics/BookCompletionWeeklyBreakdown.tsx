"use client"

import { Info } from "lucide-react"
import type { WeeklyBreakdownRow, CompletionClusterInsight } from "@/utils/bookPeriodStatistics"

type Props = {
  rows: WeeklyBreakdownRow[]
  insight: CompletionClusterInsight
  monthLabel: string
}

export default function BookCompletionWeeklyBreakdown({
  rows,
  insight,
  monthLabel,
}: Props) {
  const activeRows = rows.filter((r) => r.count > 0)
  if (activeRows.length === 0) return null

  const max = Math.max(1, ...rows.map((r) => r.count))

  return (
    <div className="rounded-xl border border-theme-tertiary/40 bg-theme-secondary p-4">
      <h3 className="text-sm font-semibold text-theme-primary">
        {monthLabel} 주별 완독
      </h3>
      <p className="mt-0.5 text-xs text-theme-secondary">
        완독일 기준 · 주간으로 나눈 권수
      </p>

      {insight && (
        <div className="mt-3 flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-xs leading-relaxed text-theme-primary">
            {insight.message}
          </p>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {rows.map((row) => {
          const pct = row.count === 0 ? 0 : Math.round((row.count / max) * 100)
          const shortLabel = row.range.label.split(" – ")[0] ?? row.range.label
          return (
            <div key={row.range.key} className="flex items-center gap-2">
              <span className="w-16 shrink-0 truncate text-[11px] text-theme-tertiary sm:w-20">
                {shortLabel}
              </span>
              <div className="min-w-0 flex-1">
                <div className="h-2 overflow-hidden rounded-full bg-theme-tertiary/50">
                  <div
                    className="h-full rounded-full bg-emerald-500/80 transition-all"
                    style={{ width: `${Math.max(row.count > 0 ? 8 : 0, pct)}%` }}
                  />
                </div>
              </div>
              <span className="w-8 shrink-0 text-right text-xs font-medium tabular-nums text-theme-primary">
                {row.count}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
