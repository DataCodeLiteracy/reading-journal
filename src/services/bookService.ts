import { ApiClient, ApiError } from "@/lib/apiClient"
import { Book } from "@/types/book"
import { ReadingSessionService } from "@/services/readingSessionService"

export class BookService {
  /**
   * 책을 생성하고, Firestore에 기록된 created_at/updated_at(서버 타임스탬프)이 반영된 문서를 반환합니다.
   * 클라이언트 상태(메인 «최근 등록한 책» 등)에서 정렬이 바로 맞도록 사용합니다.
   */
  static async createBook(bookData: Omit<Book, "id">): Promise<Book> {
    try {
      const bookId = await ApiClient.createDocumentWithAutoId("books", bookData)
      const book = await this.getBook(bookId)
      if (!book) {
        throw new ApiError(
          "책은 생성되었으나 정보를 불러오지 못했습니다.",
          "BOOK_FETCH_AFTER_CREATE"
        )
      }
      return book
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

  /** 전체 유저의 책 목록 (탐색 페이지용, 최대 3000건) */
  static async getAllBooks(limitCount: number = 3000): Promise<Book[]> {
    const list = await ApiClient.queryDocuments<Book>(
      "books",
      [],
      undefined,
      "asc",
      limitCount
    )
    return list
  }

  /**
   * 제목으로 다른 사용자가 등록한 책이 있는지 확인
   * 정확히 일치하는 제목의 책이 있으면 반환
   */
  static async findBooksByTitle(
    title: string,
    excludeUserId?: string
  ): Promise<Book[]> {
    const normalizedTitle = title.trim()
    if (!normalizedTitle) return []

    const books = await ApiClient.queryDocuments<Book>("books", [
      ["title", "==", normalizedTitle],
    ])

    if (excludeUserId) {
      return books.filter((b) => b.user_id !== excludeUserId)
    }
    return books
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
   * 세션의 endTime(종료 시각, ISO UTC) 기준으로 비교하여 한국 시간과 무관하게 정확히 정렬합니다.
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
    const bookIdToLatestTime = new Map<string, number>()
    for (const s of sessions) {
      const t = new Date(s.endTime).getTime()
      const cur = bookIdToLatestTime.get(s.bookId)
      if (cur === undefined || t > cur) bookIdToLatestTime.set(s.bookId, t)
    }
    return statusBooks.slice().sort((a, b) => {
      const timeA = bookIdToLatestTime.get(a.id) ?? 0
      const timeB = bookIdToLatestTime.get(b.id) ?? 0
      return timeB - timeA
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
