import type { AppDate } from "./firebase"

/**
 * 독서 메모
 * 목차(챕터)에 맞춰 떠오른 생각을 남기거나, 목차 없이 먼저 적을 수 있음
 */
export interface BookMemo {
  id: string
  bookId: string
  user_id: string
  content: string
  /** 목차 path 기반 표시용 경로 (예: ["1장", "1절"]). 없으면 미연결 */
  chapterPath?: string[]
  /** 정규화된 목차 path (예: "1.2"). 목차 미연결 시 생략 */
  tocPath?: string
  isPublic: boolean
  created_at?: AppDate
  updated_at?: AppDate
}
