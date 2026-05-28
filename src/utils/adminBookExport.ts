import type { Book } from "@/types/book"
import type { ReadingSession } from "@/types/user"
import {
  buildBooksNotionCsv,
  type BookNotionCsvRowInput,
} from "@/utils/bookNotionCsvExport"
import {
  getReaderDisplayName,
  type AdminUserListItem,
} from "@/utils/adminUserLabel"

export function groupSessionsByBookId(
  sessions: ReadingSession[]
): Map<string, ReadingSession[]> {
  const map = new Map<string, ReadingSession[]>()
  for (const s of sessions) {
    const list = map.get(s.bookId) ?? []
    list.push(s)
    map.set(s.bookId, list)
  }
  return map
}

export function buildExportRows(
  books: Book[],
  sessionsByBook: Map<string, ReadingSession[]>,
  readerName: string
): BookNotionCsvRowInput[] {
  const sortedBooks = [...books].sort((a, b) =>
    (a.title || "").localeCompare(b.title || "", "ko")
  )
  return sortedBooks.map((book) => ({
    book,
    sessions: sessionsByBook.get(book.id) ?? [],
    readerName,
  }))
}

export function buildMultiUserNotionCsv(
  books: Book[],
  sessions: ReadingSession[],
  usersByUid: Map<string, AdminUserListItem>
): string {
  const sessionsByBook = groupSessionsByBookId(sessions)
  const booksByUser = new Map<string, Book[]>()

  for (const book of books) {
    const uid = book.user_id?.trim()
    if (!uid) continue
    const list = booksByUser.get(uid) ?? []
    list.push(book)
    booksByUser.set(uid, list)
  }

  const uids = [...booksByUser.keys()].sort((a, b) => {
    const la = getReaderDisplayName(usersByUid.get(a) ?? null, a)
    const lb = getReaderDisplayName(usersByUid.get(b) ?? null, b)
    return la.localeCompare(lb, "ko")
  })

  const allRows: BookNotionCsvRowInput[] = []
  for (const uid of uids) {
    const userBooks = booksByUser.get(uid) ?? []
    const readerName = getReaderDisplayName(usersByUid.get(uid) ?? null, uid)
    allRows.push(
      ...buildExportRows(userBooks, sessionsByBook, readerName)
    )
  }

  return buildBooksNotionCsv(allRows)
}

export function countBooksByUserId(books: Book[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const book of books) {
    const uid = book.user_id?.trim()
    if (!uid) continue
    counts.set(uid, (counts.get(uid) ?? 0) + 1)
  }
  return counts
}
