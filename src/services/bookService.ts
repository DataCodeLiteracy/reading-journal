import { ApiClient } from "@/lib/apiClient"
import { Book } from "@/types/book"

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
      updateData.completedDate = new Date().toISOString().split("T")[0]
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
    limit: number = 10
  ): Promise<{ books: Book[]; total: number }> {
    try {
      const statusBooks = await this.getUserBooksByStatus(user_id, status)
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
