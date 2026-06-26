import type { Book } from "@/types/book"
import { ReadingSessionService } from "@/services/readingSessionService"
import { UserService } from "@/services/userService"

export type ExploreRegistrantRow = {
  book: Book
  displayName: string
  totalReadingSeconds: number
}

export async function fetchExploreRegistrantsForBooks(
  books: readonly Book[],
): Promise<ExploreRegistrantRow[]> {
  return Promise.all(
    books.map(async (book) => {
      const [user, sessions] = await Promise.all([
        UserService.getUser(book.user_id),
        ReadingSessionService.getBookReadingSessions(book.id),
      ])
      const totalReadingSeconds = sessions.reduce(
        (sum, session) => sum + (session.duration ?? 0),
        0,
      )
      return {
        book,
        displayName: user?.displayName || user?.email || book.user_id,
        totalReadingSeconds,
      }
    }),
  )
}
