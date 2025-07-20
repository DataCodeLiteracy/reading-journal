import { ApiClient } from "@/lib/apiClient"
import { Book } from "@/types/book"
import { UserService } from "./userService"
import { UserSummary } from "@/types/user"

export class BookService {
  static async createBook(bookData: Omit<Book, "id">): Promise<string> {
    try {
      const bookId = await ApiClient.createDocumentWithAutoId("books", bookData)

      await this.updateUserSummaryAfterBookChange(bookData.user_id)

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

    await this.updateUserSummaryAfterBookChange(user_id)
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

  private static async updateUserSummaryAfterBookChange(
    user_id: string
  ): Promise<void> {
    try {
      console.log(
        "BookService.updateUserSummaryAfterBookChange called for user_id:",
        user_id
      )

      const books = await this.getUserBooks(user_id)
      console.log("Retrieved books for summary update:", books.length)

      const totalBooks = books.length
      const readingBooks = books.filter(
        (book) => book.status === "reading"
      ).length
      const wantToReadBooks = books.filter(
        (book) => book.status === "want-to-read"
      ).length
      const completedBooks = books.filter(
        (book) => book.status === "completed"
      ).length
      const averageRating =
        books.length > 0
          ? books.reduce((acc, book) => acc + book.rating, 0) / books.length
          : 0

      const summary: UserSummary = {
        user_id,
        totalBooks,
        readingBooks,
        wantToReadBooks,
        completedBooks,
        averageRating,
        updated_at: new Date(),
      }

      console.log("Calculated user summary:", summary)
      await UserService.createOrUpdateUserSummary(user_id, summary)
      console.log("User summary updated successfully")
    } catch (error) {
      console.error(
        "BookService.updateUserSummaryAfterBookChange error:",
        error
      )
    }
  }
}
