import type { BookLevel } from "@/types/book"
import type { BookTocEntry } from "@/types/bookToc"

/** 제목·출판사 기준 공유 도서(판본) — 목차·공통 메타·등록 유저 목록 */
export interface CanonicalBook {
  id: string
  /** normalizeBookDuplicateKey(title, publisher) */
  editionKey: string
  title: string
  author?: string
  publisher?: string
  publishedDate?: string
  isbn13?: string
  coverUrl?: string
  categoryDepth1Id?: string
  categoryDepth1Label?: string
  categoryDepth2Id?: string
  categoryDepth2Label?: string
  level?: BookLevel
  tocOutline?: BookTocEntry[]
  user_ids: string[]
  created_at?: Date
  updated_at?: Date
}
