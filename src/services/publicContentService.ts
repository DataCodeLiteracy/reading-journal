import { ApiClient } from "@/lib/apiClient"
import { BookService } from "@/services/bookService"
import { UserService } from "@/services/userService"
import { PublicContent, ContentType } from "@/types/content"
import { Book } from "@/types/book"
import { BookQuestion } from "@/types/question"
import { QuoteService } from "./quoteService"
import { CritiqueService } from "./critiqueService"

export class PublicContentService {
  /**
   * 모든 공개 콘텐츠 조회 (통합)
   */
  static async getAllPublicContent(
    contentType?: ContentType,
    limit?: number
  ): Promise<PublicContent[]> {
    try {
      const results: PublicContent[] = []

      // 구절 기록 조회
      if (!contentType || contentType === "quote") {
        const quotes = await QuoteService.getPublicQuotes(limit)
        for (const quote of quotes) {
          const [book, user] = await Promise.all([
            BookService.getBook(quote.bookId),
            UserService.getUser(quote.user_id),
          ])
          if (book && user) {
            results.push({
              id: quote.id,
              contentType: "quote",
              bookId: quote.bookId,
              bookTitle: book.title,
              bookAuthor: book.author,
              user_id: quote.user_id,
              userName: user.displayName || user.email || "익명",
              userPhotoURL: user.photoURL || undefined,
              content: quote.quoteText,
              likesCount: quote.likesCount || 0,
              commentsCount: quote.commentsCount || 0,
              created_at: quote.created_at,
              updated_at: quote.updated_at,
            })
          }
        }
      }

      // 서평 조회
      if (!contentType || contentType === "critique") {
        const critiques = await CritiqueService.getPublicCritiques(limit)
        for (const critique of critiques) {
          const [book, user] = await Promise.all([
            BookService.getBook(critique.bookId),
            UserService.getUser(critique.user_id),
          ])
          if (book && user) {
            results.push({
              id: critique.id,
              contentType: "critique",
              bookId: critique.bookId,
              bookTitle: book.title,
              bookAuthor: book.author,
              user_id: critique.user_id,
              userName: user.displayName || user.email || "익명",
              userPhotoURL: user.photoURL || undefined,
              title: critique.title,
              content: critique.content,
              likesCount: critique.likesCount || 0,
              commentsCount: critique.commentsCount || 0,
              created_at: critique.created_at,
              updated_at: critique.updated_at,
            })
          }
        }
      }

      // 리뷰 조회 (Book에서 reviewIsPublic이 true인 것들)
      if (!contentType || contentType === "review") {
        const allBooks = await ApiClient.queryDocuments<Book>("books", [
          ["reviewIsPublic", "==", true],
        ])
        for (const book of allBooks) {
          if (book.review && book.user_id) {
            const user = await UserService.getUser(book.user_id)
            if (user) {
              results.push({
                id: book.id, // bookId를 id로 사용
                contentType: "review",
                bookId: book.id,
                bookTitle: book.title,
                bookAuthor: book.author,
                user_id: book.user_id,
                userName: user.displayName || user.email || "익명",
                userPhotoURL: user.photoURL || undefined,
                content: book.review,
                likesCount: 0, // 리뷰는 아직 좋아요 시스템이 없음
                commentsCount: 0,
                created_at: undefined,
                updated_at: undefined,
              })
            }
          }
        }
      }

      // 질문 조회 (isPublic이 true인 질문들)
      if (!contentType || contentType === "question") {
        const publicQuestions = await ApiClient.queryDocuments<BookQuestion & { user_id?: string }>(
          "bookQuestions",
          [["isPublic", "==", true]],
          "created_at",
          "desc",
          limit
        )
        for (const question of publicQuestions) {
          if (!question.user_id) continue
          
          const [book, user] = await Promise.all([
            BookService.getBook(question.bookId),
            UserService.getUser(question.user_id),
          ])
          if (book && user) {
            results.push({
              id: question.id,
              contentType: "question",
              bookId: question.bookId,
              bookTitle: book.title,
              bookAuthor: book.author,
              user_id: question.user_id,
              userName: user.displayName || user.email || "익명",
              userPhotoURL: user.photoURL || undefined,
              title: question.questionText,
              content: question.questionText,
              likesCount: question.likesCount || 0,
              commentsCount: question.commentsCount || 0,
              created_at: question.created_at,
              updated_at: question.updated_at,
            })
          }
        }
      }

      // 생성일 기준으로 정렬 (최신순)
      results.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
        return dateB - dateA
      })

      // limit이 있으면 제한
      if (limit) {
        return results.slice(0, limit)
      }

      return results
    } catch (error) {
      console.error("PublicContentService.getAllPublicContent error:", error)
      return []
    }
  }

  /**
   * 검색어로 공개 콘텐츠 검색
   */
  static async searchPublicContent(
    searchQuery: string,
    contentType?: ContentType
  ): Promise<PublicContent[]> {
    try {
      const allContent = await this.getAllPublicContent(contentType)
      const query = searchQuery.toLowerCase().trim()

      if (!query) {
        return allContent
      }

      return allContent.filter((content) => {
        const searchableText = [
          content.title,
          content.content,
          content.bookTitle,
          content.bookAuthor,
          content.userName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()

        return searchableText.includes(query)
      })
    } catch (error) {
      console.error("PublicContentService.searchPublicContent error:", error)
      return []
    }
  }
}

