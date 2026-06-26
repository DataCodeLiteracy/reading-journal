import type { Book } from "@/types/book"

/** 탐색 카드 — 분야·출판일·비고 표시용 대표 책(정보가 많은 항목 우선) */
export function pickExploreGroupDisplayBook(books: readonly Book[]): Book | undefined {
  if (books.length === 0) return undefined
  const score = (b: Book) =>
    (b.categoryDepth2Label ? 4 : 0) +
    (b.categoryDepth1Label ? 2 : 0) +
    (b.publishedDate?.trim() ? 2 : 0) +
    (b.notes?.trim() ? 1 : 0)
  return [...books].sort((a, b) => score(b) - score(a))[0]
}

export function formatExploreCategoryLine(book: Book): string | null {
  const d1 = book.categoryDepth1Label?.trim()
  const d2 = book.categoryDepth2Label?.trim()
  if (d1 && d2) return `${d1} > ${d2}`
  if (d1) return d1
  if (d2) return d2
  return null
}

export function truncateExploreNotes(
  notes?: string,
  maxChars = 65,
): string | null {
  const text = notes?.trim()
  if (!text) return null
  if (text.length <= maxChars) return text
  return `${text.slice(0, maxChars)}…`
}
