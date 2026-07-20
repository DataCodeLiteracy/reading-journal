import type { QueryClient } from "@tanstack/react-query"
import type { Book } from "@/types/book"
import type { ReadingSession, UserStatistics } from "@/types/user"
import { queryKeys } from "@/lib/queryKeys"

export type LibraryCounts = {
  total: number
  reading: number
  completed: number
  want: number
  onHold: number
}

export function deriveLibraryCounts(books: Book[]): LibraryCounts {
  let reading = 0
  let completed = 0
  let want = 0
  let onHold = 0
  for (const book of books) {
    if (book.status === "reading") reading += 1
    else if (book.status === "completed") completed += 1
    else if (book.status === "want-to-read") want += 1
    else if (book.status === "on-hold") onHold += 1
  }
  return { total: books.length, reading, completed, want, onHold }
}

/** Dashboard 등에서 불러온 서재를 React Query 캐시에 풀어 넣어 중복 Firebase 조회를 줄입니다. */
export function syncUserLibraryCaches(
  queryClient: QueryClient,
  uid: string,
  data: {
    books?: Book[]
    sessions?: ReadingSession[]
    statistics?: UserStatistics | null
  },
) {
  if (data.books) {
    queryClient.setQueryData(queryKeys.user.books(uid), data.books)
    queryClient.setQueryData(
      queryKeys.user.libraryCounts(uid),
      deriveLibraryCounts(data.books),
    )
  }
  if (data.sessions) {
    queryClient.setQueryData(queryKeys.user.readingSessions(uid), data.sessions)
  }
  if (data.statistics !== undefined) {
    queryClient.setQueryData(queryKeys.user.statistics(uid), data.statistics)
  }
}
