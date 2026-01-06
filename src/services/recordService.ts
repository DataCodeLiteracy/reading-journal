import { ApiClient } from "@/lib/apiClient"
import { Book } from "@/types/book"
import { Quote } from "@/types/content"
import { Critique } from "@/types/content"
import { BookQuestion } from "@/types/question"
import { QuoteService } from "./quoteService"
import { CritiqueService } from "./critiqueService"
import { QuestionService } from "./questionService"
import { BookService } from "./bookService"

export interface RecordContent {
  id: string
  contentType: "quote" | "critique" | "question" | "review"
  bookId: string
  bookTitle: string
  bookAuthor?: string
  user_id: string
  userName: string
  userPhotoURL?: string
  title?: string // 서평, 질문, 리뷰용
  content: string
  likesCount: number
  commentsCount: number
  created_at?: Date
  updated_at?: Date
  // 추가 필터링용 필드
  bookStatus?: "reading" | "completed" | "want-to-read" | "on-hold"
  bookCreatedAt?: Date
}

export class RecordService {
  /**
   * 모든 공개된 콘텐츠 조회 (책 공개 설정 고려)
   * @param userUid 현재 로그인한 유저 ID (내 데이터만 보기용)
   * @param contentType 콘텐츠 타입 필터
   * @param bookId 책 ID 필터
   * @param searchQuery 검색어
   * @param showOnlyMine 내 데이터만 보기 여부
   * @param page 페이지 번호
   * @param itemsPerPage 페이지당 항목 수
   */
  static async getAllRecords(
    userUid?: string,
    contentType?: "quote" | "critique" | "question" | "review" | "all",
    bookId?: string,
    searchQuery?: string,
    showOnlyMine: boolean = false,
    page: number = 1,
    itemsPerPage: number = 20
  ): Promise<{ records: RecordContent[]; total: number }> {
    try {
      const allRecords: RecordContent[] = []

      // 1. 공개된 책 목록 조회 (isBookPublic === true)
      const allPublicBooks = await ApiClient.queryDocuments<Book>(
        "books",
        [["isBookPublic", "==", true]],
        "created_at",
        "desc",
        1000 // 최대 1000개
      )

      // 내 데이터만 보기인 경우, 내 책도 포함 (공개 여부와 관계없이)
      // 전체 보기인 경우, 공개된 책만 포함
      let targetBooks: Book[] = showOnlyMine ? [] : [...allPublicBooks]
      if (showOnlyMine && userUid) {
        const myBooks = await BookService.getUserBooks(userUid)
        targetBooks = [...myBooks] // 내 책만 포함 (공개 여부와 관계없이)
      }

      // 책 ID 필터 적용
      if (bookId) {
        targetBooks = targetBooks.filter((b) => b.id === bookId)
      }

      const targetBookIds = targetBooks.map((b) => b.id)

      // 2. 구절 기록 조회
      if (!contentType || contentType === "quote" || contentType === "all") {
        let quotes: Quote[] = []
        
        if (showOnlyMine && userUid) {
          // 내 데이터만 보기: 내 책의 모든 구절 기록 (공개 여부와 관계없이)
          for (const bookId of targetBookIds) {
            const bookQuotes = await QuoteService.getBookQuotes(bookId)
            const myBookQuotes = bookQuotes.filter((q) => q.user_id === userUid)
            quotes = [...quotes, ...myBookQuotes]
          }
        } else {
          // 전체 보기: 공개된 구절 기록만
          quotes = await QuoteService.getPublicQuotes(1000)
        }
        
        for (const quote of quotes) {
          // 공개된 책의 구절 기록만 포함 (전체 보기인 경우)
          if (!showOnlyMine && !targetBookIds.includes(quote.bookId)) continue
          // 내 데이터만 보기인 경우 필터링
          if (showOnlyMine && userUid && quote.user_id !== userUid) continue

          const book = targetBooks.find((b) => b.id === quote.bookId)
          if (book) {
            allRecords.push({
              id: quote.id,
              contentType: "quote",
              bookId: quote.bookId,
              bookTitle: book.title,
              bookAuthor: book.author,
              user_id: quote.user_id,
              userName: "", // 나중에 채움
              content: quote.quoteText,
              likesCount: quote.likesCount || 0,
              commentsCount: quote.commentsCount || 0,
              created_at: quote.created_at,
              updated_at: quote.updated_at,
              bookStatus: book.status,
              bookCreatedAt: book.created_at,
            })
          }
        }
      }

      // 3. 서평 조회
      if (!contentType || contentType === "critique" || contentType === "all") {
        let critiques: Critique[] = []
        
        if (showOnlyMine && userUid) {
          // 내 데이터만 보기: 내 책의 모든 서평 (공개 여부와 관계없이)
          for (const bookId of targetBookIds) {
            const bookCritiques = await CritiqueService.getBookCritiques(bookId)
            const myBookCritiques = bookCritiques.filter((c) => c.user_id === userUid)
            critiques = [...critiques, ...myBookCritiques]
          }
        } else {
          // 전체 보기: 공개된 서평만
          critiques = await CritiqueService.getPublicCritiques(1000)
        }
        
        for (const critique of critiques) {
          // 공개된 책의 서평만 포함 (전체 보기인 경우)
          if (!showOnlyMine && !targetBookIds.includes(critique.bookId)) continue
          // 내 데이터만 보기인 경우 필터링
          if (showOnlyMine && userUid && critique.user_id !== userUid) continue

          const book = targetBooks.find((b) => b.id === critique.bookId)
          if (book) {
            allRecords.push({
              id: critique.id,
              contentType: "critique",
              bookId: critique.bookId,
              bookTitle: book.title,
              bookAuthor: book.author,
              user_id: critique.user_id,
              userName: "",
              title: critique.title,
              content: critique.content,
              likesCount: critique.likesCount || 0,
              commentsCount: critique.commentsCount || 0,
              created_at: critique.created_at,
              updated_at: critique.updated_at,
              bookStatus: book.status,
              bookCreatedAt: book.created_at,
            })
          }
        }
      }

      // 4. 독서 질문 조회
      if (!contentType || contentType === "question" || contentType === "all") {
        let questions: (BookQuestion & { user_id?: string })[] = []
        
        if (showOnlyMine && userUid) {
          // 내 데이터만 보기: 내 책의 모든 질문 (공개 여부와 관계없이)
          for (const bookId of targetBookIds) {
            const bookQuestions = await QuestionService.getBookQuestions(bookId)
            const myBookQuestions = bookQuestions.filter(
              (q) => (q as BookQuestion & { user_id?: string }).user_id === userUid
            )
            questions = [...questions, ...myBookQuestions]
          }
        } else {
          // 전체 보기: 공개된 질문만
          const publicQuestions = await ApiClient.queryDocuments<
            BookQuestion & { user_id?: string }
          >("bookQuestions", [["isPublic", "==", true]], "created_at", "desc", 1000)
          questions = publicQuestions
        }

        for (const question of questions) {
          if (!question.user_id) continue
          // 공개된 책의 질문만 포함 (전체 보기인 경우)
          if (!showOnlyMine && !targetBookIds.includes(question.bookId)) continue
          // 내 데이터만 보기인 경우 필터링
          if (showOnlyMine && userUid && question.user_id !== userUid) continue

          const book = targetBooks.find((b) => b.id === question.bookId)
          if (book) {
            allRecords.push({
              id: question.id,
              contentType: "question",
              bookId: question.bookId,
              bookTitle: book.title,
              bookAuthor: book.author,
              user_id: question.user_id,
              userName: "",
              title: question.questionText,
              content: question.questionText,
              likesCount: question.likesCount || 0,
              commentsCount: question.commentsCount || 0,
              created_at: question.created_at,
              updated_at: question.updated_at,
              bookStatus: book.status,
              bookCreatedAt: book.created_at,
            })
          }
        }
      }

      // 5. 리뷰 조회
      if (!contentType || contentType === "review" || contentType === "all") {
        let booksWithReviews: Book[] = []
        
        if (showOnlyMine && userUid) {
          // 내 데이터만 보기: 내 책의 모든 리뷰 (공개 여부와 관계없이)
          booksWithReviews = targetBooks.filter((b) => b.review && b.user_id === userUid)
        } else {
          // 전체 보기: 공개된 리뷰만
          const booksWithPublicReviews = await ApiClient.queryDocuments<Book>(
            "books",
            [["reviewIsPublic", "==", true]],
            "created_at",
            "desc",
            1000
          )
          booksWithReviews = booksWithPublicReviews.filter(
            (b) => b.review && targetBookIds.includes(b.id)
          )
        }

        for (const book of booksWithReviews) {
          if (!book.review) continue
          // 공개된 책의 리뷰만 포함 (전체 보기인 경우)
          if (!showOnlyMine && !targetBookIds.includes(book.id)) continue
          // 내 데이터만 보기인 경우 필터링
          if (showOnlyMine && userUid && book.user_id !== userUid) continue

          allRecords.push({
            id: book.id,
            contentType: "review",
            bookId: book.id,
            bookTitle: book.title,
            bookAuthor: book.author,
            user_id: book.user_id,
            userName: "",
            content: book.review,
            likesCount: 0, // 리뷰는 아직 좋아요 시스템 없음
            commentsCount: 0,
            created_at: book.updated_at, // 리뷰 작성일
            updated_at: book.updated_at,
            bookStatus: book.status,
            bookCreatedAt: book.created_at,
          })
        }
      }

      // 6. 사용자 정보 채우기
      const userIds = [...new Set(allRecords.map((r) => r.user_id))]
      const { UserService } = await import("./userService")
      const userMap = new Map<string, { displayName?: string; email?: string; photoURL?: string }>()
      
      await Promise.all(
        userIds.map(async (uid) => {
          try {
            const user = await UserService.getUser(uid)
            if (user) {
              userMap.set(uid, {
                displayName: user.displayName || undefined,
                email: user.email || undefined,
                photoURL: user.photoURL || undefined,
              })
            }
          } catch (error) {
            console.warn(`Failed to get user ${uid}:`, error)
          }
        })
      )

      allRecords.forEach((record) => {
        const user = userMap.get(record.user_id)
        record.userName = user?.displayName || user?.email || "익명"
        record.userPhotoURL = user?.photoURL
      })

      // 7. 검색어 필터링
      let filteredRecords = allRecords
      if (searchQuery && searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        filteredRecords = allRecords.filter((record) => {
          const searchableText = [
            record.title,
            record.content,
            record.bookTitle,
            record.bookAuthor,
            record.userName,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
          return searchableText.includes(query)
        })
      }

      // 8. 생성일 기준 정렬 (최신순)
      filteredRecords.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
        return dateB - dateA
      })

      // 9. 페이지네이션
      const total = filteredRecords.length
      const startIndex = (page - 1) * itemsPerPage
      const endIndex = startIndex + itemsPerPage
      const paginatedRecords = filteredRecords.slice(startIndex, endIndex)

      return { records: paginatedRecords, total }
    } catch (error) {
      console.error("RecordService.getAllRecords error:", error)
      return { records: [], total: 0 }
    }
  }

  /**
   * 사용 가능한 책 목록 조회 (필터용)
   */
  static async getAvailableBooks(
    userUid?: string,
    showOnlyMine: boolean = false
  ): Promise<Book[]> {
    try {
      const allPublicBooks = await ApiClient.queryDocuments<Book>(
        "books",
        [["isBookPublic", "==", true]],
        "created_at",
        "desc",
        1000
      )

      let books: Book[] = [...allPublicBooks]

      if (showOnlyMine && userUid) {
        const myBooks = await BookService.getUserBooks(userUid)
        books = [...books, ...myBooks]
        const bookIds = new Set(books.map((b) => b.id))
        books = Array.from(bookIds).map((id) => books.find((b) => b.id === id)!)
      }

      // 중복 제거 및 정렬
      const uniqueBooks = Array.from(
        new Map(books.map((b) => [b.id, b])).values()
      )
      uniqueBooks.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
        return dateB - dateA
      })

      return uniqueBooks
    } catch (error) {
      console.error("RecordService.getAvailableBooks error:", error)
      return []
    }
  }
}

