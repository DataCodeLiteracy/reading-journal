import type { Book } from "@/types/book"
import type { ReadingSession } from "@/types/user"

/**
 * 세션 endTime(UTC) 기준 최신 독서 순으로 정렬합니다. 세션이 없는 책은 뒤로 갑니다.
 */
export function sortBooksByLastReadFromSessions(
  books: Book[],
  sessions: ReadingSession[],
): Book[] {
  const bookIdToLatestTime = new Map<string, number>()
  for (const s of sessions) {
    const t = new Date(s.endTime).getTime()
    const cur = bookIdToLatestTime.get(s.bookId)
    if (cur === undefined || t > cur) bookIdToLatestTime.set(s.bookId, t)
  }
  return books.slice().sort((a, b) => {
    const timeA = bookIdToLatestTime.get(a.id) ?? 0
    const timeB = bookIdToLatestTime.get(b.id) ?? 0
    return timeB - timeA
  })
}
