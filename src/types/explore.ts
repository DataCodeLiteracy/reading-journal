import type { Book } from "@/types/book"

/** 탐색 목록 한 줄(같은 제목·출판사로 묶인 책들) */
export type ExploreTitleGroup = {
  /** normalizeBookDuplicateKey(title, publisher) */
  groupKey: string
  title: string
  publisher: string
  books: Book[]
  author: string
  userCount: number
  avgRating: number
  statuses: Set<Book["status"]>
  coverUrl?: string
  /** canonicalBooks 문서 id — 있으면 펼침 시 이 판본 등록분만 조회 */
  canonicalBookId?: string
}
