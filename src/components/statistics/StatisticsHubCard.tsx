"use client"

import type { LucideIcon } from "lucide-react"
import { ChevronRight } from "lucide-react"

type Props = {
  title: string
  description: string
  icon: LucideIcon
  iconClassName?: string
  stats?: { label: string; value: string | number }[]
  onClick: () => void
}

export default function StatisticsHubCard({
  title,
  description,
  icon: Icon,
  iconClassName = "text-accent-theme",
  stats,
  onClick,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full flex-col rounded-xl border border-theme-tertiary/40 bg-theme-secondary p-5 text-left shadow-sm transition-all hover:border-accent-theme/40 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-theme-tertiary/50">
            <Icon className={`h-5 w-5 ${iconClassName}`} aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-theme-primary group-hover:text-accent-theme">
              {title}
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-theme-secondary">
              {description}
            </p>
          </div>
        </div>
        <ChevronRight
          className="mt-1 h-5 w-5 shrink-0 text-theme-tertiary transition-transform group-hover:translate-x-0.5 group-hover:text-accent-theme"
          aria-hidden
        />
      </div>
      {stats && stats.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-lg bg-theme-tertiary/30 px-3 py-2"
            >
              <p className="text-[10px] font-medium uppercase tracking-wide text-theme-tertiary">
                {s.label}
              </p>
              <p className="text-lg font-bold tabular-nums text-theme-primary">
                {s.value}
              </p>
            </div>
          ))}
        </div>
      )}
    </button>
  )
}
