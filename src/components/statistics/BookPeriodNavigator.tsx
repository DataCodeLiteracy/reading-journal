"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"

type Props = {
  label: string
  onPrev: () => void
  onNext: () => void
  canNext?: boolean
}

export default function BookPeriodNavigator({
  label,
  onPrev,
  onNext,
  canNext = false,
}: Props) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-theme-tertiary/40 bg-theme-secondary px-2 py-2">
      <button
        type="button"
        onClick={onPrev}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-theme-secondary transition-colors hover:bg-theme-tertiary/50 hover:text-theme-primary"
        aria-label="이전 기간"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <p className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-theme-primary">
        {label}
      </p>
      <button
        type="button"
        onClick={onNext}
        disabled={!canNext}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-theme-secondary transition-colors hover:bg-theme-tertiary/50 hover:text-theme-primary disabled:cursor-not-allowed disabled:opacity-30"
        aria-label="다음 기간"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  )
}
