import type { Book } from "@/types/book"

export type BookPeriodType = "week" | "month" | "quarter" | "half" | "year"

export type BookPeriodRange = {
  type: BookPeriodType
  /** YYYY-MM-DD (inclusive) */
  start: string
  /** YYYY-MM-DD (inclusive) */
  end: string
  label: string
  /** navigation / chart key */
  key: string
}

export type BookPeriodMetricKey =
  | "registered"
  | "completed"
  | "reading"
  | "started"
  | "readingStarted"
  | "wantToRead"
  | "onHold"

export type BookPeriodAnalysis = {
  range: BookPeriodRange
  registered: Book[]
  completed: Book[]
  /** 기간 중 읽고 있었던 책 (시작했고, 완독일이 없거나 기간 시작 이후) */
  reading: Book[]
  /** 기간 중 읽기 시작한 책 */
  started: Book[]
  /** 기간에 읽기 시작했고, 기간 종료 시점까지 완독하지 않은 책 */
  readingStarted: Book[]
  wantToRead: Book[]
  onHold: Book[]
  averageCompletedRating: number | null
  kdcMajorCounts: { label: string; count: number }[]
}

export const BOOK_PERIOD_TYPE_LABELS: Record<BookPeriodType, string> = {
  week: "주간",
  month: "월간",
  quarter: "분기",
  half: "반기",
  year: "연간",
}

/** 홈·마이페이지 통계 카드에서 모달로 여는 지표 */
export type BookStatModalMetricKey =
  | "registered"
  | "completed"
  | "reading"
  | "wantToRead"

export const BOOK_STAT_MODAL_CONFIG: Record<
  BookStatModalMetricKey,
  {
    title: string
    allowedPeriodTypes: BookPeriodType[]
    defaultPeriodType: BookPeriodType
    /** 모달에서 집계할 기간 지표 (카드 라벨과 다를 수 있음) */
    periodMetric: BookPeriodMetricKey
  }
> = {
  registered: {
    title: "총 등록된 책",
    allowedPeriodTypes: ["month", "year"],
    defaultPeriodType: "month",
    periodMetric: "registered",
  },
  completed: {
    title: "완독한 책",
    allowedPeriodTypes: ["week", "month", "quarter", "half", "year"],
    defaultPeriodType: "month",
    periodMetric: "completed",
  },
  reading: {
    title: "읽는 중",
    allowedPeriodTypes: ["week", "month", "quarter", "year"],
    defaultPeriodType: "month",
    periodMetric: "readingStarted",
  },
  wantToRead: {
    title: "읽고 싶은 책",
    allowedPeriodTypes: ["month", "year"],
    defaultPeriodType: "month",
    periodMetric: "wantToRead",
  },
}

export const BOOK_PERIOD_METRIC_LABELS: Record<
  BookPeriodMetricKey,
  { title: string; description: string }
> = {
  registered: {
    title: "등록",
    description: "이 기간에 서재에 추가한 책",
  },
  completed: {
    title: "완독",
    description: "이 기간에 완독 처리한 책",
  },
  reading: {
    title: "읽는 중",
    description: "기간 중 진행 중이었거나 지금 읽는 책",
  },
  started: {
    title: "읽기 시작",
    description: "이 기간에 읽기를 시작한 책",
  },
  readingStarted: {
    title: "읽는 중",
    description: "이 기간에 읽기를 시작했고, 기간이 끝날 때까지 완독하지 않은 책",
  },
  wantToRead: {
    title: "읽고 싶은",
    description: "이 기간에 읽고 싶은 책으로 등록",
  },
  onHold: {
    title: "보류",
    description: "이 기간에 보류 상태로 등록",
  },
}
