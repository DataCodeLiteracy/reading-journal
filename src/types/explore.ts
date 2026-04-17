import type { Book } from "@/types/book"

/** 탐색 목록 한 줄(같은 제목으로 묶인 책들) */
export type ExploreTitleGroup = {
  title: string
  books: Book[]
  author: string
  userCount: number
  avgRating: number
  statuses: Set<Book["status"]>
}
