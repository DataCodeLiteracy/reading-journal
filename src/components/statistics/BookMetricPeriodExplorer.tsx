"use client"

import { useMemo, useState } from "react"
import type { Book } from "@/types/book"
import type { ReadingSession } from "@/types/user"
import type { BookPeriodMetricKey, BookPeriodType, BookStatModalMetricKey } from "@/types/bookPeriodStatistics"
import BookCompletionWeeklyBreakdown from "@/components/statistics/BookCompletionWeeklyBreakdown"
import BookMetricPeriodInsight from "@/components/statistics/BookMetricPeriodInsight"
import BookMetricTrendChart from "@/components/statistics/BookMetricTrendChart"
import BookPeriodBookList from "@/components/statistics/BookPeriodBookList"
import BookPeriodNavigator from "@/components/statistics/BookPeriodNavigator"
import BookPeriodSummaryCards, {
  BookPeriodExtraStats,
} from "@/components/statistics/BookPeriodSummaryCards"
import BookPeriodTrendChart from "@/components/statistics/BookPeriodTrendChart"
import BookPeriodTypeTabs from "@/components/statistics/BookPeriodTypeTabs"
import {
  analyzeBooksInPeriod,
  booksForPeriodMetric,
  buildBookPeriodTrend,
  buildSessionsByBookId,
  buildSingleMetricTrend,
  buildWeeklyBreakdownInRange,
  formatYmd,
  getCompletionClusterInsight,
  getBookPeriodRange,
  isRangeIncludingToday,
  shiftBookPeriodAnchor,
  type BookPeriodStatisticsContext,
} from "@/utils/bookPeriodStatistics"

export type BookMetricPeriodExplorerProps = {
  books: Book[]
  readingSessions?: ReadingSession[]
  /** 지정 시 해당 지표만 표시 (모달용) */
  fixedMetric?: BookPeriodMetricKey
  defaultPeriodType?: BookPeriodType
  allowedPeriodTypes?: BookPeriodType[]
  /** 모달에서는 추이·부가 통계를 간소화 */
  compact?: boolean
  /** URL 등에서 초기 지표 (전체 패널용) */
  initialMetric?: BookPeriodMetricKey
  /** 홈 통계 카드 모달 컨텍스트 */
  statModalKey?: BookStatModalMetricKey
}

const ALL_PERIOD_TYPES: BookPeriodType[] = [
  "week",
  "month",
  "quarter",
  "half",
  "year",
]

export default function BookMetricPeriodExplorer({
  books,
  readingSessions = [],
  fixedMetric,
  defaultPeriodType = "month",
  allowedPeriodTypes = ALL_PERIOD_TYPES,
  compact = false,
  initialMetric = "completed",
  statModalKey,
}: BookMetricPeriodExplorerProps) {
  const [periodType, setPeriodType] = useState<BookPeriodType>(defaultPeriodType)
  const [anchor, setAnchor] = useState(() => new Date())
  const [activeMetric, setActiveMetric] =
    useState<BookPeriodMetricKey>(fixedMetric ?? initialMetric)

  const metric = fixedMetric ?? activeMetric

  const statsContext = useMemo<BookPeriodStatisticsContext>(
    () => ({
      sessionsByBookId:
        readingSessions.length > 0
          ? buildSessionsByBookId(readingSessions)
          : undefined,
    }),
    [readingSessions],
  )

  const range = useMemo(
    () => getBookPeriodRange(periodType, anchor),
    [periodType, anchor],
  )

  const analysis = useMemo(
    () => analyzeBooksInPeriod(books, range, statsContext),
    [books, range, statsContext],
  )

  const multiTrend = useMemo(
    () =>
      compact || fixedMetric
        ? null
        : buildBookPeriodTrend(books, periodType, 6, anchor, statsContext),
    [books, periodType, anchor, compact, fixedMetric, statsContext],
  )

  const singleTrend = useMemo(
    () =>
      fixedMetric || compact
        ? buildSingleMetricTrend(
            books,
            periodType,
            metric,
            6,
            anchor,
            statsContext,
          )
        : null,
    [books, periodType, metric, anchor, fixedMetric, compact, statsContext],
  )

  const weeklyBreakdown = useMemo(() => {
    if (metric !== "completed") return null
    if (periodType !== "month" && periodType !== "quarter" && periodType !== "half") {
      return null
    }
    return buildWeeklyBreakdownInRange(
      books,
      range,
      "completed",
      statsContext,
    )
  }, [books, range, metric, periodType, statsContext])

  const clusterInsight = useMemo(() => {
    if (!weeklyBreakdown) return null
    return getCompletionClusterInsight(
      weeklyBreakdown,
      analysis.completed.length,
    )
  }, [weeklyBreakdown, analysis.completed.length])

  const today = formatYmd(new Date())
  const canNext = range.end < today
  const isCurrentPeriod = isRangeIncludingToday(range)
  const readingNowCount = books.filter((b) => b.status === "reading").length
  const listBooks = booksForPeriodMetric(analysis, metric)
  const periodCount = listBooks.length

  return (
    <div className="space-y-4">
      <BookPeriodTypeTabs
        value={periodType}
        onChange={(type) => {
          setPeriodType(type)
          setAnchor(new Date())
        }}
        allowedTypes={allowedPeriodTypes}
      />

      <BookPeriodNavigator
        label={range.label}
        onPrev={() =>
          setAnchor((a) => shiftBookPeriodAnchor(periodType, a, -1))
        }
        onNext={() =>
          setAnchor((a) => shiftBookPeriodAnchor(periodType, a, 1))
        }
        canNext={canNext}
      />

      {fixedMetric ? (
        <div className="rounded-xl border border-theme-tertiary/40 bg-theme-secondary p-4">
          <p className="text-xs font-medium text-theme-secondary">
            {range.label}
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-theme-primary">
            {periodCount}
            <span className="ml-1 text-base font-normal text-theme-secondary">
              권
            </span>
          </p>
          <div className="mt-2">
            <BookMetricPeriodInsight
              metric={metric}
              analysis={analysis}
              readingNowCount={readingNowCount}
              isCurrentPeriod={isCurrentPeriod}
              statModalKey={statModalKey}
            />
          </div>
        </div>
      ) : (
        <>
          <BookPeriodSummaryCards
            analysis={analysis}
            activeMetric={activeMetric}
            onMetricChange={setActiveMetric}
          />
          {!compact && <BookPeriodExtraStats analysis={analysis} />}
        </>
      )}

      {weeklyBreakdown && weeklyBreakdown.some((r) => r.count > 0) && (
        <BookCompletionWeeklyBreakdown
          rows={weeklyBreakdown}
          insight={clusterInsight}
          monthLabel={range.label}
        />
      )}

      {singleTrend && <BookMetricTrendChart rows={singleTrend} metric={metric} />}
      {multiTrend && !compact && <BookPeriodTrendChart rows={multiTrend} />}

      <BookPeriodBookList
        books={listBooks}
        metric={metric}
        readingSessions={readingSessions}
      />
    </div>
  )
}
