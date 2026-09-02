"use client"

import type { BookPeriodType } from "@/types/bookPeriodStatistics"
import { BOOK_PERIOD_TYPE_LABELS } from "@/types/bookPeriodStatistics"

const ALL_TYPES: BookPeriodType[] = ["week", "month", "quarter", "half", "year"]

type Props = {
  value: BookPeriodType
  onChange: (type: BookPeriodType) => void
  /** 미지정 시 전체 탭 표시 */
  allowedTypes?: BookPeriodType[]
}

export default function BookPeriodTypeTabs({
  value,
  onChange,
  allowedTypes = ALL_TYPES,
}: Props) {
  const types = ALL_TYPES.filter((t) => allowedTypes.includes(t))

  return (
    <div
      className="flex flex-wrap gap-1 rounded-lg bg-theme-tertiary/40 p-1"
      role="tablist"
      aria-label="기간 단위"
    >
      {types.map((type) => {
        const active = value === type
        return (
          <button
            key={type}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(type)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm ${
              active
                ? "bg-theme-secondary text-theme-primary shadow-sm"
                : "text-theme-secondary hover:text-theme-primary"
            }`}
          >
            {BOOK_PERIOD_TYPE_LABELS[type]}
          </button>
        )
      })}
    </div>
  )
}
