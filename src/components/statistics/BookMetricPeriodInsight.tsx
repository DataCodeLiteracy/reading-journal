"use client"

import type { BookPeriodAnalysis, BookPeriodMetricKey, BookStatModalMetricKey } from "@/types/bookPeriodStatistics"
import { BOOK_PERIOD_METRIC_LABELS } from "@/types/bookPeriodStatistics"

type Props = {
  metric: BookPeriodMetricKey
  analysis: BookPeriodAnalysis
  readingNowCount: number
  isCurrentPeriod: boolean
  /** 홈 카드 모달 컨텍스트 (읽는 중 카드 → started 집계) */
  statModalKey?: BookStatModalMetricKey
}

export default function BookMetricPeriodInsight({
  metric,
  analysis,
  readingNowCount,
  isCurrentPeriod,
  statModalKey,
}: Props) {
  if (statModalKey === "reading") {
    const startedCount = analysis.readingStarted.length
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs text-theme-primary">
        <span className="font-medium">지금 읽는 중 {readingNowCount}권</span>
        <span className="text-theme-secondary">
          {" "}
          · 이 기간 읽는 중 {startedCount}권
        </span>
        <p className="mt-1 text-theme-tertiary">
          카드 숫자는 현재 상태입니다. 아래는 이 기간에 읽기를 시작했고, 기간
          종료 시점까지 완독하지 않은 책입니다.
        </p>
      </div>
    )
  }

  if (metric === "reading" && isCurrentPeriod) {
    const duringPeriod = analysis.reading.length
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs text-theme-primary">
        <span className="font-medium">지금 읽는 중 {readingNowCount}권</span>
        <span className="text-theme-secondary">
          {" "}
          · 이 기간 동안 읽고 있었던 책 {duringPeriod}권
        </span>
        <p className="mt-1 text-theme-tertiary">
          읽기 시작 후 완독 전까지, 해당 기간에 겹치는 책을 집계합니다.
        </p>
      </div>
    )
  }

  if (metric === "completed") {
    return (
      <p className="text-xs text-theme-tertiary">
        {BOOK_PERIOD_METRIC_LABELS.completed.description}
        {" · "}
        여러 권을 동시에 읽다 한 주에 완독이 몰릴 수 있어, 월간 보기에서 주별
        분포를 함께 확인하세요.
      </p>
    )
  }

  if (metric === "registered" || metric === "wantToRead" || metric === "started" || metric === "readingStarted") {
    const meta = BOOK_PERIOD_METRIC_LABELS[metric]
    return <p className="text-xs text-theme-tertiary">{meta.description}</p>
  }

  return null
}
