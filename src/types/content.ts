import { AppDate } from "./firebase"
import type { QuoteHighlightKind } from "@/constants/readingMeta"

/**
 * 구절 기록 (인용 기록)
 * 책을 읽는 중 특정 구절을 타이핑하고 그에 대한 느낌이나 생각을 기록
 */
export interface Quote {
  id: string
  bookId: string
  user_id: string
  quoteText: string // 타이핑한 구절 텍스트
  /** 구절 유형(고정 목록, `none` 또는 생략 = 미분류) */
  highlightKind?: QuoteHighlightKind
  /** 이 구절을 남긴 이유(한두 문장) */
  passageRecordReason?: string
  thoughts?: string // 해당 구절에 대한 느낌/생각
  generalThoughts?: string // 구절과 무관하게 책을 읽다가 느낀 점
  page?: number // 구절이 있는 페이지 (숫자)
  /** 목차 path 기반 표시용 경로 (예: ["1장", "1절"]). 없으면 미연결 */
  chapterPath?: string[]
  /** 정규화된 목차 path (예: "1.2"). 목차 미연결 시 생략 */
  tocPath?: string
  isPublic: boolean // 공개 여부
  likesCount: number // 좋아요 수 (캐시된 값)
  commentsCount: number // 댓글 수 (캐시된 값)
  created_at?: Date
  updated_at?: Date
}

/**
 * 서평
 * 완독 후 작성하는 깊이 있는 분석 및 평가
 * 리뷰와는 별도로 더 상세하고 구조화된 평가
 */
export interface Critique {
  id: string
  bookId: string
  user_id: string
  title?: string // 서평 제목 (선택사항)
  content: string // 서평 내용
  isPublic: boolean // 공개 여부
  likesCount: number // 좋아요 수 (캐시된 값)
  commentsCount: number // 댓글 수 (캐시된 값)
  created_at?: Date
  updated_at?: Date
}

/**
 * 좋아요
 * 공개된 콘텐츠에 대한 좋아요
 */
export interface Like {
  id: string
  user_id: string // 좋아요를 누른 사용자
  contentType: "quote" | "critique" | "review" | "question" | "answer" | "comment"
  contentId: string // 좋아요 대상 콘텐츠 ID (게시물 또는 댓글 ID)
  created_at?: Date
}

/**
 * 댓글
 * 공개된 콘텐츠에 대한 댓글
 */
export interface Comment {
  id: string
  user_id: string // 댓글 작성자
  contentType: "quote" | "critique" | "review" | "question" | "answer"
  contentId: string // 댓글 대상 콘텐츠 ID
  content: string // 댓글 내용
  isPublic: boolean // 댓글 공개 여부 (기본값: true)
  likesCount: number // 댓글에 대한 좋아요 수 (캐시)
  created_at?: Date
  updated_at?: Date
}

/**
 * 콘텐츠 타입 통합
 * 탐색 페이지 등에서 사용할 통합 타입
 */
export type ContentType = "quote" | "critique" | "review" | "question" | "answer" | "comment"

/**
 * 공개 콘텐츠 통합 타입
 * 탐색 페이지에서 사용
 */
export interface PublicContent {
  id: string
  contentType: ContentType
  bookId: string
  bookTitle: string
  bookAuthor?: string
  user_id: string
  userName: string
  userPhotoURL?: string
  title?: string // 서평의 경우 제목
  content: string // 콘텐츠 내용
  likesCount: number
  commentsCount: number
  created_at?: Date
  updated_at?: Date
}

import { BookQuestion } from "./question"

/**
 * 독서 질문 공개 설정
 * 기존 BookQuestion에 isPublic 필드 추가를 위한 확장 타입
 */
export interface BookQuestionWithPublic extends BookQuestion {
  isPublic: boolean
  likesCount: number
  commentsCount: number
}

