"use client"

import type { Book } from "@/types/book"
import type { ReadingSession } from "@/types/user"
import BookMetricPeriodExplorer from "@/components/statistics/BookMetricPeriodExplorer"

type Props = {
  books: Book[]
  readingSessions?: ReadingSession[]
}

export default function BookPeriodStatisticsPanel({
  books,
  readingSessions = [],
}: Props) {
  return (
    <BookMetricPeriodExplorer
      books={books}
      readingSessions={readingSessions}
      defaultPeriodType="month"
      initialMetric="completed"
    />
  )
}
