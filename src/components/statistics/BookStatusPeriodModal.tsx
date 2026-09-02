"use client"

import {
  BookOpen,
  Bookmark,
  Calendar,
  CheckCircle,
} from "lucide-react"
import type { ComponentType } from "react"
import FormModalFrame from "@/components/FormModalFrame"
import BookMetricPeriodExplorer from "@/components/statistics/BookMetricPeriodExplorer"
import type { ReadingSession } from "@/types/user"
import type { Book } from "@/types/book"
import {
  BOOK_STAT_MODAL_CONFIG,
  type BookStatModalMetricKey,
} from "@/types/bookPeriodStatistics"

const METRIC_ICONS: Record<
  BookStatModalMetricKey,
  ComponentType<{ className?: string }>
> = {
  registered: BookOpen,
  completed: CheckCircle,
  reading: Bookmark,
  wantToRead: Calendar,
}

type Props = {
  isOpen: boolean
  onClose: () => void
  metric: BookStatModalMetricKey
  books: Book[]
  readingSessions?: ReadingSession[]
}

export default function BookStatusPeriodModal({
  isOpen,
  onClose,
  metric,
  books,
  readingSessions = [],
}: Props) {
  const config = BOOK_STAT_MODAL_CONFIG[metric]
  const Icon = METRIC_ICONS[metric]

  return (
    <FormModalFrame
      isOpen={isOpen}
      onClose={onClose}
      title={config.title}
      size="wide"
      contentClassName="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-2"
      headerStart={
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-theme/15">
          <Icon className="h-5 w-5 accent-theme-primary" />
        </div>
      }
    >
      <BookMetricPeriodExplorer
        books={books}
        readingSessions={readingSessions}
        fixedMetric={config.periodMetric}
        statModalKey={metric}
        defaultPeriodType={config.defaultPeriodType}
        allowedPeriodTypes={config.allowedPeriodTypes}
        compact
      />
    </FormModalFrame>
  )
}
