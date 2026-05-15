import type { Book } from "@/types/book"
import type { ReadingSession } from "@/types/user"

function toReadTimeMs(value: Date | string | undefined): number {
  if (!value) return 0
  const t = new Date(value).getTime()
  return Number.isFinite(t) ? t : 0
}

export function buildSessionLatestByBookId(
  sessions: ReadingSession[],
): Map<string, number> {
  const bookIdToLatestTime = new Map<string, number>()
  for (const s of sessions) {
    const t = new Date(s.endTime).getTime()
    if (!Number.isFinite(t)) continue
    const cur = bookIdToLatestTime.get(s.bookId)
    if (cur === undefined || t > cur) bookIdToLatestTime.set(s.bookId, t)
  }
  return bookIdToLatestTime
}

/**
 * 서재 «최근 읽은 순»과 동일하게 `updated_at`을 우선하고,
 * 세션 endTime·`last_read_at`과 합쳐 더 최근 시각으로 비교합니다.
 */
export function getRecentlyReadSortTimeMs(
  book: Book,
  sessionLatestByBookId: Map<string, number>,
): number {
  return Math.max(
    toReadTimeMs(book.updated_at),
    toReadTimeMs(book.last_read_at),
    sessionLatestByBookId.get(book.id) ?? 0,
  )
}

/** @deprecated 이름만 유지 — `sortBooksByRecentlyRead` 사용 권장 */
export function getBookLastReadTimeMs(
  book: Book,
  sessionLatestByBookId: Map<string, number>,
): number {
  return getRecentlyReadSortTimeMs(book, sessionLatestByBookId)
}

export function sortBooksByRecentlyRead(
  books: Book[],
  sessions: ReadingSession[] = [],
): Book[] {
  const sessionMap = buildSessionLatestByBookId(sessions)
  return books.slice().sort((a, b) => {
    const timeA = getRecentlyReadSortTimeMs(a, sessionMap)
    const timeB = getRecentlyReadSortTimeMs(b, sessionMap)
    if (timeB !== timeA) return timeB - timeA
    return b.id.localeCompare(a.id)
  })
}

export function sortBooksByLastReadFromSessions(
  books: Book[],
  sessions: ReadingSession[],
): Book[] {
  return sortBooksByRecentlyRead(books, sessions)
}
