import { AppDate } from "./firebase"
import type { BookTocEntry } from "./bookToc"

/** 책의 대상 연령/학년 (문해력 수준) */
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
  /** 레거시 분야 문자열(과거 데이터 호환용). 신규 로직에서는 사용하지 않음. */
  category?: string
  categoryDepth1Id?: string
  categoryDepth1Label?: string
  categoryDepth2Id?: string
  categoryDepth2Label?: string
  /** KDC 대분류 코드·명칭 (국립중앙도서관) */
  kdcMajorCode?: string
  kdcMajorLabel?: string
  /** KDC 중분류(강) 코드·명칭 */
  kdcMiddleCode?: string
  kdcMiddleLabel?: string
  /** KDC 세부 번호 (예: 181) */
  kdcDetailCode?: string
  /** 주제어 (상세 페이지 표시용) */
  subjects?: string[]
  /** 대상 연령/학년 (문해력 수준): 유아, 초1~6, 중1~3, 고1~3, 성인 */
  level?: BookLevel
  /** 이번 년도에 읽을 책 여부 */
  toReadThisYear?: boolean
  /** 출판사 */
  publisher?: string
  /** 표지 이미지 URL */
  coverUrl?: string
  /** ISBN-13 (도서 검색·식별용) */
  isbn13?: string
  /** 비고 (자유 메모) */
  notes?: string
  created_at?: Date
  updated_at?: Date
  /** 마지막 독서 세션 종료 시각(UTC). 서재 «최근 읽은 순» Firestore 정렬용 */
  last_read_at?: Date
  /** 읽기 준비 — 제목·목차를 보며 떠올린 기대·질문 */
  preReadExpectation?: string
  /** 읽기 준비 — 이 책에서 얻고 싶은 것 */
  preReadWhatToGain?: string
  /** 읽기 준비 — 관심사와의 연결 */
  preReadInterestConnection?: string
  /**
   * 타이머 시작 시 읽기 준비 메모 안내를 쓸지.
   * undefined/true = on, false = off (바로 다음 단계).
   */
  timerPreReadPromptEnabled?: boolean
  /**
   * 이 책에서 자녀 읽어주기 선택을 쓸지.
   * true = on, undefined/false = off (타이머만). 읽어주는 책만 켠다.
   */
  timerReadAloudEnabled?: boolean
  /** 목차(최대 4 depth, path는 `1.1.1.1` 형식). 발췌 JSON 등과 동일 스키마로 연동 */
  tocOutline?: BookTocEntry[]
  /** 공유 판본(canonicalBooks) 문서 ID — 목차·공통 메타 연동 */
  canonicalBookId?: string
  /** normalizeBookDuplicateKey(title, publisher) — 판본 조회·백필용 */
  editionKey?: string
}
