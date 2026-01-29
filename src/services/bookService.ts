import { ApiClient } from "@/lib/apiClient"
import { Book } from "@/types/book"
import { ReadingSessionService } from "@/services/readingSessionService"

export class BookService {
  static async createBook(bookData: Omit<Book, "id">): Promise<string> {
    try {
      const bookId = await ApiClient.createDocumentWithAutoId("books", bookData)
      return bookId
    } catch (error) {
      throw error
    }
  }

  static async getBook(bookId: string): Promise<Book | null> {
    return await ApiClient.getDocument<Book>("books", bookId)
  }

  static async updateBook(
    bookId: string,
    bookData: Partial<Book>
  ): Promise<void> {
    await ApiClient.updateDocument("books", bookId, bookData)
  }

  static async updateBookStatus(
    bookId: string,
    status: Book["status"],
    user_id: string
  ): Promise<void> {
    const updateData: { [key: string]: any } = {
      status,
    }

    if (status === "reading") {
      updateData.hasStartedReading = true
    } else if (status === "completed") {
      // 완독 처리 시 회독 수 증가
      const book = await this.getBook(bookId)
      const currentRereadCount = book?.rereadCount ?? 0
      updateData.completedDate = new Date().toISOString().split("T")[0]
      updateData.rereadCount = currentRereadCount + 1
    }

    await ApiClient.updateDocument("books", bookId, updateData)
  }

  static async getUserBooks(user_id: string): Promise<Book[]> {
    return await ApiClient.queryDocuments<Book>("books", [
      ["user_id", "==", user_id],
    ])
  }

  static async getUserBooksPaginated(
    user_id: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ books: Book[]; total: number }> {
    try {
      const allBooks = await this.getUserBooks(user_id)
      const total = allBooks.length

      const startIndex = (page - 1) * limit
      const endIndex = startIndex + limit
      const books = allBooks.slice(startIndex, endIndex)

      return { books, total }
    } catch (error) {
      console.error("BookService.getUserBooksPaginated error:", error)
      throw error
    }
  }

  static async getUserBooksByStatus(
    user_id: string,
    status: Book["status"]
  ): Promise<Book[]> {
    return await ApiClient.queryDocuments<Book>("books", [
      ["user_id", "==", user_id],
      ["status", "==", status],
    ])
  }

  static async getUserBooksByStatusPaginated(
    user_id: string,
    status: Book["status"],
    page: number = 1,
    limit: number = 10,
    sortByLastRead: boolean = false
  ): Promise<{ books: Book[]; total: number }> {
    try {
      let statusBooks: Book[]
      if (sortByLastRead && status === "reading") {
        statusBooks = await this.getUserBooksByStatusSortedByLastRead(
          user_id,
          status
        )
      } else {
        statusBooks = await this.getUserBooksByStatus(user_id, status)
      }
      const total = statusBooks.length

      const startIndex = (page - 1) * limit
      const endIndex = startIndex + limit
      const books = statusBooks.slice(startIndex, endIndex)

      return { books, total }
    } catch (error) {
      console.error("BookService.getUserBooksByStatusPaginated error:", error)
      throw error
    }
  }

  /**
   * 사용자의 특정 상태 책 목록을 "가장 최근에 읽은 기록" 순으로 정렬해 반환합니다.
   * 독서 세션에 기록이 없는 책은 목록 맨 뒤로 갑니다.
   */
  static async getUserBooksByStatusSortedByLastRead(
    user_id: string,
    status: Book["status"]
  ): Promise<Book[]> {
    const [statusBooks, sessions] = await Promise.all([
      this.getUserBooksByStatus(user_id, status),
      ReadingSessionService.getUserReadingSessions(user_id),
    ])
    const bookIdToLatestDate = new Map<string, number>()
    for (const s of sessions) {
      const t = new Date(s.date).getTime()
      const cur = bookIdToLatestDate.get(s.bookId)
      if (cur === undefined || t > cur) bookIdToLatestDate.set(s.bookId, t)
    }
    return statusBooks.slice().sort((a, b) => {
      const dateA = bookIdToLatestDate.get(a.id) ?? 0
      const dateB = bookIdToLatestDate.get(b.id) ?? 0
      return dateB - dateA
    })
  }

  static async searchUserBooksByStatus(
    user_id: string,
    status: Book["status"],
    searchQuery: string,
    page: number = 1,
    limit: number = 10,
    sortByLastRead: boolean = false
  ): Promise<{ books: Book[]; total: number }> {
    try {
      const statusBooks =
        sortByLastRead && status === "reading"
          ? await this.getUserBooksByStatusSortedByLastRead(user_id, status)
          : await this.getUserBooksByStatus(user_id, status)

      // 검색어가 있으면 필터링
      const filteredBooks = searchQuery.trim()
        ? statusBooks.filter(
            (book) =>
              book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (book.author &&
                book.author.toLowerCase().includes(searchQuery.toLowerCase()))
          )
        : statusBooks

      const total = filteredBooks.length
      const startIndex = (page - 1) * limit
      const endIndex = startIndex + limit
      const books = filteredBooks.slice(startIndex, endIndex)

      return { books, total }
    } catch (error) {
      console.error("BookService.searchUserBooksByStatus error:", error)
      throw error
    }
  }

  static async deleteBook(bookId: string): Promise<void> {
    try {
      const book = await this.getBook(bookId)
      if (!book) {
        throw new Error("Book not found")
      }

      const { ReadingSessionService } = await import("./readingSessionService")
      const sessions = await ReadingSessionService.getBookReadingSessions(
        bookId
      )

      await Promise.all(
        sessions.map((session) =>
          ReadingSessionService.deleteReadingSession(session.id)
        )
      )

      await ApiClient.deleteDocument("books", bookId)
    } catch (error) {
      throw error
    }
  }
}
