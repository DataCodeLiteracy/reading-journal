"use client"

import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  ReactNode,
} from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Book } from "@/types/book"
import { UserStatistics } from "@/types/user"
import { ReadingSession } from "@/types/user"
import { BookService } from "@/services/bookService"
import { UserStatisticsService } from "@/services/userStatisticsService"
import { ReadingSessionService } from "@/services/readingSessionService"
import {
  TimePatternService,
  TimePatternAnalysis,
} from "@/services/timePatternService"
import { useAuth } from "./AuthContext"
import { queryKeys } from "@/lib/queryKeys"
import { syncUserLibraryCaches } from "@/lib/userLibraryCache"

export type UserDashboardData = {
  books: Book[]
  sessions: ReadingSession[]
  statistics: UserStatistics | null
  timePatterns: TimePatternAnalysis | null
}

interface DataContextType {
  allBooks: Book[]
  setAllBooks: (books: Book[]) => void
  updateBook: (bookId: string, updatedBook: Book) => void
  addBook: (book: Book) => void
  removeBook: (bookId: string) => void

  userStatistics: UserStatistics | null
  setUserStatistics: (stats: UserStatistics | null) => void
  updateStatistics: () => Promise<void>

  allReadingSessions: ReadingSession[]
  setAllReadingSessions: (sessions: ReadingSession[]) => void
  addReadingSession: (session: ReadingSession) => Promise<void>
  removeReadingSession: (sessionId: string) => Promise<void>

  timePatterns: TimePatternAnalysis | null
  updateTimePatterns: () => void

  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  userDataInitialized: boolean

  refreshAllData: () => Promise<void>
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export function DataProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const { userUid, isLoggedIn } = useAuth()

  const dashboardQuery = useQuery({
    queryKey: queryKeys.user.dashboard(userUid),
    queryFn: async (): Promise<UserDashboardData> => {
      const [booksData, sessionsData] = await Promise.all([
        BookService.getUserBooks(userUid!),
        ReadingSessionService.getUserReadingSessions(userUid!),
      ])
      const statisticsData =
        await UserStatisticsService.getUserStatisticsWithSessions(
          userUid!,
          sessionsData
        )
      const patterns =
        sessionsData.length > 0
          ? TimePatternService.analyzeTimePatterns(sessionsData)
          : null
      return {
        books: booksData,
        sessions: sessionsData,
        statistics: statisticsData,
        timePatterns: patterns,
      }
    },
    enabled: Boolean(userUid && isLoggedIn),
    staleTime: 30_000,
  })

  const data = dashboardQuery.data

  useEffect(() => {
    if (!userUid || !dashboardQuery.data) return
    syncUserLibraryCaches(queryClient, userUid, {
      books: dashboardQuery.data.books,
      sessions: dashboardQuery.data.sessions,
      statistics: dashboardQuery.data.statistics,
    })
  }, [userUid, dashboardQuery.dataUpdatedAt, dashboardQuery.data, queryClient])

  useEffect(() => {
    if (!isLoggedIn || !userUid) {
      queryClient.removeQueries({ queryKey: ["userDashboard"] })
      queryClient.removeQueries({ queryKey: ["userBooks"] })
      queryClient.removeQueries({ queryKey: ["readingSessions"] })
      queryClient.removeQueries({ queryKey: ["userLibraryCounts"] })
    }
  }, [isLoggedIn, userUid, queryClient])

  const refreshAllData = useCallback(async () => {
    if (!userUid || !isLoggedIn) return
    await queryClient.refetchQueries({
      queryKey: queryKeys.user.dashboard(userUid),
    })
    void queryClient.invalidateQueries({ queryKey: queryKeys.explore.all })
    void queryClient.invalidateQueries({
      queryKey: queryKeys.user.libraryRoot(userUid),
    })
    void queryClient.invalidateQueries({
      queryKey: queryKeys.user.books(userUid),
    })
  }, [userUid, isLoggedIn, queryClient])

  const updateStatistics = useCallback(async () => {
    if (!userUid) return
    const snap = queryClient.getQueryData<UserDashboardData>(
      queryKeys.user.dashboard(userUid)
    )
    if (!snap) return
    try {
      const updatedStats =
        await UserStatisticsService.getUserStatisticsWithSessions(
          userUid,
          snap.sessions
        )
      queryClient.setQueryData<UserDashboardData>(
        queryKeys.user.dashboard(userUid),
        (old) =>
          old ? { ...old, statistics: updatedStats } : old
      )
    } catch (error) {
      console.error("Error updating statistics:", error)
    }
  }, [userUid, queryClient])

  const patchDashboardBooks = useCallback(
    (updater: (books: Book[]) => Book[]) => {
      if (!userUid) return
      const old = queryClient.getQueryData<UserDashboardData>(
        queryKeys.user.dashboard(userUid),
      )
      if (!old) return
      const books = updater(old.books)
      queryClient.setQueryData<UserDashboardData>(
        queryKeys.user.dashboard(userUid),
        { ...old, books },
      )
      syncUserLibraryCaches(queryClient, userUid, { books })
    },
    [queryClient, userUid],
  )

  const updateBook = useCallback(
    (bookId: string, updatedBook: Book) => {
      patchDashboardBooks((books) =>
        books.map((b) => (b.id === bookId ? updatedBook : b)),
      )
    },
    [patchDashboardBooks],
  )

  const addBook = useCallback(
    (book: Book) => {
      patchDashboardBooks((books) => [book, ...books])
    },
    [patchDashboardBooks],
  )

  const removeBook = useCallback(
    (bookId: string) => {
      patchDashboardBooks((books) => books.filter((b) => b.id !== bookId))
    },
    [patchDashboardBooks],
  )

  const updateTimePatterns = useCallback(() => {
    if (!userUid) return
    queryClient.setQueryData<UserDashboardData>(
      queryKeys.user.dashboard(userUid),
      (old) => {
        if (!old || old.sessions.length === 0) return old
        return {
          ...old,
          timePatterns: TimePatternService.analyzeTimePatterns(old.sessions),
        }
      }
    )
  }, [queryClient, userUid])

  const addReadingSession = useCallback(
    async (session: ReadingSession) => {
      if (!userUid) return
      const endMs = new Date(session.endTime).getTime()
      const readTouch = Number.isFinite(endMs) ? new Date(endMs) : new Date()
      const now = new Date()
      const old = queryClient.getQueryData<UserDashboardData>(
        queryKeys.user.dashboard(userUid),
      )
      if (!old) return
      const books = old.books.map((b) =>
        b.id === session.bookId
          ? {
              ...b,
              last_read_at: readTouch,
              updated_at: now,
            }
          : b,
      )
      const sessions = [session, ...old.sessions]
      queryClient.setQueryData<UserDashboardData>(
        queryKeys.user.dashboard(userUid),
        { ...old, sessions, books },
      )
      syncUserLibraryCaches(queryClient, userUid, { books, sessions })
      const snap = queryClient.getQueryData<UserDashboardData>(
        queryKeys.user.dashboard(userUid)
      )
      if (!snap) return
      try {
        const updatedStats =
          await UserStatisticsService.getUserStatisticsWithSessions(
            userUid,
            snap.sessions
          )
        queryClient.setQueryData<UserDashboardData>(
          queryKeys.user.dashboard(userUid),
          (old) =>
            old
              ? {
                  ...old,
                  statistics: updatedStats,
                  timePatterns:
                    snap.sessions.length > 0
                      ? TimePatternService.analyzeTimePatterns(snap.sessions)
                      : null,
                }
              : old
        )
      } catch (error) {
        console.error("Error updating statistics after adding session:", error)
      }
    },
    [queryClient, userUid]
  )

  const removeReadingSession = useCallback(
    async (sessionId: string) => {
      if (!userUid) return
      const old = queryClient.getQueryData<UserDashboardData>(
        queryKeys.user.dashboard(userUid),
      )
      if (!old) return
      const sessions = old.sessions.filter((s) => s.id !== sessionId)
      queryClient.setQueryData<UserDashboardData>(
        queryKeys.user.dashboard(userUid),
        { ...old, sessions },
      )
      syncUserLibraryCaches(queryClient, userUid, { sessions })
      const snap = queryClient.getQueryData<UserDashboardData>(
        queryKeys.user.dashboard(userUid)
      )
      if (!snap) return
      try {
        const updatedStats =
          await UserStatisticsService.getUserStatisticsWithSessions(
            userUid,
            snap.sessions
          )
        queryClient.setQueryData<UserDashboardData>(
          queryKeys.user.dashboard(userUid),
          (old) =>
            old
              ? {
                  ...old,
                  statistics: updatedStats,
                  timePatterns:
                    snap.sessions.length > 0
                      ? TimePatternService.analyzeTimePatterns(snap.sessions)
                      : null,
                }
              : old
        )
      } catch (error) {
        console.error(
          "Error updating statistics after removing session:",
          error
        )
      }
    },
    [queryClient, userUid]
  )

  const setAllBooks = useCallback(
    (books: Book[]) => {
      if (!userUid) return
      queryClient.setQueryData<UserDashboardData>(
        queryKeys.user.dashboard(userUid),
        (old) => (old ? { ...old, books } : old)
      )
      syncUserLibraryCaches(queryClient, userUid, { books })
    },
    [queryClient, userUid]
  )

  const setUserStatistics = useCallback(
    (stats: UserStatistics | null) => {
      if (!userUid) return
      queryClient.setQueryData<UserDashboardData>(
        queryKeys.user.dashboard(userUid),
        (old) => (old ? { ...old, statistics: stats } : old)
      )
    },
    [queryClient, userUid]
  )

  const setAllReadingSessions = useCallback(
    (sessions: ReadingSession[]) => {
      if (!userUid) return
      queryClient.setQueryData<UserDashboardData>(
        queryKeys.user.dashboard(userUid),
        (old) => (old ? { ...old, sessions } : old)
      )
      syncUserLibraryCaches(queryClient, userUid, { sessions })
    },
    [queryClient, userUid]
  )

  const setIsLoading = useCallback(() => {}, [])

  const userDataInitialized =
    Boolean(userUid && isLoggedIn) &&
    (dashboardQuery.isSuccess || dashboardQuery.isFetched)

  const value: DataContextType = {
    allBooks: data?.books ?? [],
    setAllBooks,
    updateBook,
    addBook,
    removeBook,
    userStatistics: data?.statistics ?? null,
    setUserStatistics,
    updateStatistics,
    allReadingSessions: data?.sessions ?? [],
    setAllReadingSessions,
    addReadingSession,
    removeReadingSession,
    timePatterns: data?.timePatterns ?? null,
    updateTimePatterns,
    isLoading: dashboardQuery.isFetching,
    setIsLoading,
    userDataInitialized,
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
