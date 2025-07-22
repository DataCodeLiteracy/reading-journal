"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react"
import { Book } from "@/types/book"
import { UserStatistics } from "@/types/user"
import { ReadingSession } from "@/types/user"
import { BookService } from "@/services/bookService"
import { UserStatisticsService } from "@/services/userStatisticsService"
import { ReadingSessionService } from "@/services/readingSessionService"
import { useAuth } from "./AuthContext"

interface DataContextType {
  // Books
  allBooks: Book[]
  setAllBooks: (books: Book[]) => void
  updateBook: (bookId: string, updatedBook: Book) => void
  addBook: (book: Book) => void
  removeBook: (bookId: string) => void

  // Statistics
  userStatistics: UserStatistics | null
  setUserStatistics: (stats: UserStatistics | null) => void
  updateStatistics: () => Promise<void>

  // Reading Sessions
  allReadingSessions: ReadingSession[]
  setAllReadingSessions: (sessions: ReadingSession[]) => void
  addReadingSession: (session: ReadingSession) => void
  removeReadingSession: (sessionId: string) => void

  // Loading states
  isLoading: boolean
  setIsLoading: (loading: boolean) => void

  // Refresh function
  refreshAllData: () => Promise<void>
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export function DataProvider({ children }: { children: ReactNode }) {
  const { userUid, isLoggedIn } = useAuth()
  const [allBooks, setAllBooks] = useState<Book[]>([])
  const [userStatistics, setUserStatistics] = useState<UserStatistics | null>(
    null
  )
  const [allReadingSessions, setAllReadingSessions] = useState<
    ReadingSession[]
  >([])
  const [isLoading, setIsLoading] = useState(false)

  // 모든 데이터를 새로고침하는 함수
  const refreshAllData = async () => {
    if (!userUid || !isLoggedIn) return

    try {
      setIsLoading(true)

      // 먼저 책과 세션 데이터를 로드
      const [booksData, sessionsData] = await Promise.all([
        BookService.getUserBooks(userUid),
        ReadingSessionService.getUserReadingSessions(userUid),
      ])

      setAllBooks(booksData)
      setAllReadingSessions(sessionsData)

      // 세션 데이터를 사용하여 통계 계산 (중복 로딩 방지)
      const statisticsData =
        await UserStatisticsService.getUserStatisticsWithSessions(
          userUid,
          sessionsData
        )

      setUserStatistics(statisticsData)
    } catch (error) {
      console.error("Error refreshing data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // 통계 업데이트 함수
  const updateStatistics = async () => {
    if (!userUid) return

    try {
      // 이미 로드된 세션 데이터를 사용
      const updatedStats =
        await UserStatisticsService.getUserStatisticsWithSessions(
          userUid,
          allReadingSessions
        )
      setUserStatistics(updatedStats)
    } catch (error) {
      console.error("Error updating statistics:", error)
    }
  }

  // 책 관련 함수들
  const updateBook = (bookId: string, updatedBook: Book) => {
    setAllBooks((prev) =>
      prev.map((book) => (book.id === bookId ? updatedBook : book))
    )
  }

  const addBook = (book: Book) => {
    setAllBooks((prev) => [book, ...prev])
  }

  const removeBook = (bookId: string) => {
    setAllBooks((prev) => prev.filter((book) => book.id !== bookId))
  }

  // 독서 세션 관련 함수들
  const addReadingSession = (session: ReadingSession) => {
    setAllReadingSessions((prev) => [session, ...prev])
  }

  const removeReadingSession = (sessionId: string) => {
    setAllReadingSessions((prev) =>
      prev.filter((session) => session.id !== sessionId)
    )
  }

  // 사용자가 로그인하면 데이터 로드
  useEffect(() => {
    if (isLoggedIn && userUid) {
      refreshAllData()
    } else {
      // 로그아웃 시 데이터 초기화
      setAllBooks([])
      setUserStatistics(null)
      setAllReadingSessions([])
    }
  }, [isLoggedIn, userUid])

  const value: DataContextType = {
    allBooks,
    setAllBooks,
    updateBook,
    addBook,
    removeBook,
    userStatistics,
    setUserStatistics,
    updateStatistics,
    allReadingSessions,
    setAllReadingSessions,
    addReadingSession,
    removeReadingSession,
    isLoading,
    setIsLoading,
    refreshAllData,
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider")
  }
  return context
}
