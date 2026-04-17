import { AppDate } from "./firebase"

/** 책의 대상 연령/학년 (레벨) */
export type BookLevel =
  | "유아"
  | "초1"
  | "초2"
  | "초3"
  | "초4"
  | "초5"
  | "초6"
  | "중1"
  | "중2"
  | "중3"
  | "고1"
  | "고2"
  | "고3"
  | "성인"

/** 책의 분야 (장르/대상) */
export type BookField = "그림책" | "동화책" | "청소년책" | "성인책"

export const BOOK_LEVELS: BookLevel[] = [
  "유아",
  "초1",
  "초2",
  "초3",
  "초4",
  "초5",
  "초6",
  "중1",
  "중2",
  "중3",
  "고1",
  "고2",
  "고3",
  "성인",
]

export const BOOK_FIELDS: BookField[] = [
  "그림책",
  "동화책",
  "청소년책",
  "성인책",
]

export interface Book {
  id: string
  user_id: string
  title: string
  author?: string
  publishedDate?: string
  startDate?: string
  status: "reading" | "completed" | "want-to-read" | "on-hold"
  rating: number
  review?: string
  reviewIsPublic?: boolean // 리뷰 공개 여부
  /** AI가 전체 요약과 비교해 준 독서 리뷰 점수 (1~10) */
  reviewAiScore?: number
  /** AI 한 줄 피드백 */
  reviewAiFeedback?: string
  reviewAiGradedAt?: Date | string
  isBookPublic?: boolean // 책 전체 공개 여부 (이 책의 모든 콘텐츠를 다른 유저에게 공개할지 여부)
  hasStartedReading: boolean
  completedDate?: string
  rereadCount?: number // 회독 수 (기본값 0)
  currentRereadStartDate?: string // 현재 회독의 시작일 (다시 읽기 시작한 날짜)
  /** 분야: 그림책, 동화책, 청소년책, 성인책 등 */
  category?: string
  /** 대상 연령/학년 (레벨): 유아, 초1~6, 중1~3, 고1~3, 성인 */
  level?: BookLevel
  /** 이번 년도에 읽을 책 여부 */
  toReadThisYear?: boolean
  /** 출판사 */
  publisher?: string
  created_at?: Date
  updated_at?: Date
  /** 마지막 독서 세션 종료 시각(UTC). 서재 «최근 읽은 순» Firestore 정렬용 */
  last_read_at?: Date
}
