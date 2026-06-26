import type { Book } from "@/types/book"

/** 탐색 그룹 카드용 — 등록된 책 중 첫 표지 URL */
export function pickExploreGroupCoverUrl(
  books: readonly Pick<Book, "coverUrl">[],
): string | undefined {
  for (const book of books) {
    const url = book.coverUrl?.trim()
    if (url) return url
  }
  return undefined
}
