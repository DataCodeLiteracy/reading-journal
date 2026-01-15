import { AppDate } from "./firebase"

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
  isBookPublic?: boolean // 책 전체 공개 여부 (이 책의 모든 콘텐츠를 다른 유저에게 공개할지 여부)
  hasStartedReading: boolean
  completedDate?: string
  rereadCount?: number // 회독 수 (기본값 0)
  currentRereadStartDate?: string // 현재 회독의 시작일 (다시 읽기 시작한 날짜)
  created_at?: Date
  updated_at?: Date
}
