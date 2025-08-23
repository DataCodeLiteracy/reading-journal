"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  Users,
  BookOpen,
  Clock,
  Lightbulb,
  BookMarked,
} from "lucide-react"
import { adminService } from "@/services/adminService"
import { ReadingRecord } from "@/types/admin"
import { useAuth } from "@/contexts/AuthContext"
import {
  formatReadingTime,
  parseTimeStringToMinutes,
  splitBookTitles,
} from "@/utils/timeUtils"

export default function AnalysisPage() {
  const router = useRouter()
  const { user, userData, loading, isLoggedIn } = useAuth()
  const [records, setRecords] = useState<ReadingRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push("/login")
      return
    }

    if (!loading && isLoggedIn && userData && !userData.isAdmin) {
      router.push("/mypage")
      return
    }

    if (isLoggedIn && userData && userData.isAdmin) {
      loadData()
    }
  }, [selectedYear, selectedMonth, isLoggedIn, loading, user, router])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const data = await adminService.getAllReadingRecords()
      setRecords(data)
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // 전체 통계 계산
  const getTotalStats = () => {
    if (records.length === 0) return null

    const totalRecords = records.length
    const allChildren = records.flatMap((record) => record.children)
    const totalTime = allChildren.reduce(
      (sum, child) =>
        sum + parseTimeStringToMinutes(child.reading_time_minutes),
      0
    )
    const uniqueChildren = [...new Set(allChildren.map((child) => child.name))]
    const allBookTitles = allChildren.flatMap((child) =>
      splitBookTitles(child.book.title)
    )
    const uniqueBooks = [...new Set(allBookTitles)]
    const allWords = allChildren.flatMap((child) =>
      child.unknown_words.map((word) => word.word)
    )
    const uniqueWords = [...new Set(allWords)]
    const totalInsights = records.flatMap((record) => record.insights).length
    const totalLessons = records.flatMap((record) => record.lessons).length

    return {
      totalRecords,
      totalTime,
      uniqueChildren: uniqueChildren.length,
      uniqueBooks: uniqueBooks.length,
      uniqueWords: uniqueWords.length,
      totalInsights,
      totalLessons,
    }
  }

  // 월별 통계 계산
  const getMonthlyStats = () => {
    const monthlyData = new Map<string, any>()

    records.forEach((record) => {
      const month = record.date.substring(0, 7) // YYYY-MM
      if (!monthlyData.has(month)) {
        monthlyData.set(month, {
          month,
          records: 0,
          totalTime: 0,
          children: 0,
          books: new Set(),
          words: new Set(),
          insights: 0,
          lessons: 0,
        })
      }

      const monthStats = monthlyData.get(month)
      monthStats.records++
      monthStats.totalTime += record.children.reduce(
        (sum, child) =>
          sum + parseTimeStringToMinutes(child.reading_time_minutes),
        0
      )
      monthStats.children += record.children.length
      monthStats.insights += record.insights.length
      monthStats.lessons += record.lessons.length

      record.children.forEach((child) => {
        const bookTitles = splitBookTitles(child.book.title)
        bookTitles.forEach((title) => monthStats.books.add(title))
        child.unknown_words.forEach((word) => monthStats.words.add(word.word))
      })
    })

    return Array.from(monthlyData.values())
      .map((stats) => ({
        ...stats,
        books: stats.books.size,
        words: stats.words.size,
      }))
      .sort((a, b) => b.month.localeCompare(a.month))
  }

  // 자주 나오는 단어 TOP 10
  const getTopWords = () => {
    const wordCount = new Map<string, number>()

    records.forEach((record) => {
      record.children.forEach((child) => {
        child.unknown_words.forEach((word) => {
          wordCount.set(word.word, (wordCount.get(word.word) || 0) + 1)
        })
      })
    })

    return Array.from(wordCount.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }))
  }

  // 자주 읽는 책 TOP 5
  const getTopBooks = () => {
    const bookCount = new Map<string, number>()

    records.forEach((record) => {
      record.children.forEach((child) => {
        bookCount.set(
          child.book.title,
          (bookCount.get(child.book.title) || 0) + 1
        )
      })
    })

    return Array.from(bookCount.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([book, count]) => ({ book, count }))
  }

  const totalStats = getTotalStats()
  const monthlyStats = getMonthlyStats()
  const topWords = getTopWords()
  const topBooks = getTopBooks()

  // 로딩 중이거나 권한이 없는 경우
  if (loading) {
    return (
      <div className='min-h-screen bg-theme-gradient flex items-center justify-center'>
        <div className='text-center'>
          <BarChart3 className='h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse' />
          <p className='text-theme-secondary'>로딩 중...</p>
        </div>
      </div>
    )
  }

  // 로그인하지 않았거나 관리자가 아닌 경우
  if (!isLoggedIn || !userData || !userData.isAdmin) {
    return null
  }

  if (isLoading) {
    return (
      <div className='min-h-screen bg-theme-gradient flex items-center justify-center'>
        <div className='text-center'>
          <BarChart3 className='h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse' />
          <p className='text-theme-secondary'>데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-theme-gradient'>
      <div className='container mx-auto px-4 py-6'>
        {/* 헤더 */}
        <header className='mb-6'>
          <button
            onClick={() => router.push("/admin")}
            className='flex items-center gap-2 text-theme-secondary hover:text-theme-primary mb-4 transition-colors'
          >
            <ArrowLeft className='h-5 w-5' />
            관리자 페이지로 돌아가기
          </button>
          <h1 className='text-3xl font-bold text-theme-primary mb-2'>
            📊 종합 분석
          </h1>
          <p className='text-theme-secondary text-sm'>
            JSON 데이터를 활용한 다양한 분석 결과
          </p>
        </header>

        {/* 전체 통계 요약 */}
        {totalStats && (
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6'>
            <div className='bg-theme-secondary rounded-lg p-4 shadow-sm'>
              <div className='flex items-center gap-3 mb-2'>
                <div className='p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg'>
                  <BookOpen className='h-5 w-5 text-blue-600 dark:text-blue-400' />
                </div>
                <div>
                  <p className='text-sm text-theme-secondary'>총 기록</p>
                  <p className='text-2xl font-bold text-theme-primary'>
                    {totalStats.totalRecords}개
                  </p>
                </div>
              </div>
            </div>

            <div className='bg-theme-secondary rounded-lg p-4 shadow-sm'>
              <div className='flex items-center gap-3 mb-2'>
                <div className='p-2 bg-green-100 dark:bg-green-900/20 rounded-lg'>
                  <Clock className='h-5 w-5 text-green-600 dark:text-green-400' />
                </div>
                <div>
                  <p className='text-sm text-theme-secondary'>총 독서 시간</p>
                  <p className='text-2xl font-bold text-theme-primary'>
                    {formatReadingTime(totalStats.totalTime)}
                  </p>
                </div>
              </div>
            </div>

            <div className='bg-theme-secondary rounded-lg p-4 shadow-sm'>
              <div className='flex items-center gap-3 mb-2'>
                <div className='p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg'>
                  <Users className='h-5 w-5 text-purple-600 dark:text-purple-400' />
                </div>
                <div>
                  <p className='text-sm text-theme-secondary'>참여 아이</p>
                  <p className='text-2xl font-bold text-theme-primary'>
                    {totalStats.uniqueChildren}명
                  </p>
                </div>
              </div>
            </div>

            <div className='bg-theme-secondary rounded-lg p-4 shadow-sm'>
              <div className='flex items-center gap-3 mb-2'>
                <div className='p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg'>
                  <BookMarked className='h-5 w-5 text-orange-600 dark:text-orange-400' />
                </div>
                <div>
                  <p className='text-sm text-theme-secondary'>모르는 단어</p>
                  <p className='text-2xl font-bold text-theme-primary'>
                    {totalStats.uniqueWords}개
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6'>
          {/* 월별 통계 */}
          <div className='bg-theme-secondary rounded-lg p-6 shadow-sm'>
            <h2 className='text-xl font-semibold text-theme-primary mb-4 flex items-center gap-2'>
              <TrendingUp className='h-5 w-5' />
              월별 통계
            </h2>
            <div className='space-y-3'>
              {monthlyStats.slice(0, 6).map((stat) => (
                <div
                  key={stat.month}
                  className='flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg'
                >
                  <span className='font-medium text-theme-primary'>
                    {stat.month}
                  </span>
                  <div className='text-right'>
                    <div className='text-sm font-semibold'>
                      {stat.records}개 기록
                    </div>
                    <div className='text-xs text-theme-secondary'>
                      {formatReadingTime(stat.totalTime)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 자주 나오는 단어 */}
          <div className='bg-theme-secondary rounded-lg p-6 shadow-sm'>
            <h2 className='text-xl font-semibold text-theme-primary mb-4 flex items-center gap-2'>
              <BookMarked className='h-5 w-5' />
              자주 나오는 단어 TOP 10
            </h2>
            <div className='space-y-2'>
              {topWords.map((item, index) => (
                <div
                  key={item.word}
                  className='flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded-lg'
                >
                  <div className='flex items-center gap-2'>
                    <span className='text-sm font-medium text-gray-500'>
                      #{index + 1}
                    </span>
                    <span className='font-medium text-theme-primary'>
                      {item.word}
                    </span>
                  </div>
                  <span className='text-sm text-theme-secondary'>
                    {item.count}회
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 인사이트 및 교훈 */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mt-6'>
          <div className='bg-theme-secondary rounded-lg p-6 shadow-sm'>
            <h2 className='text-xl font-semibold text-theme-primary mb-4 flex items-center gap-2'>
              <Lightbulb className='h-5 w-5' />
              주요 인사이트
            </h2>
            <div className='space-y-2'>
              {totalStats && totalStats.totalInsights > 0 ? (
                <p className='text-sm text-theme-secondary'>
                  총 {totalStats.totalInsights}개의 인사이트가 기록되었습니다.
                </p>
              ) : (
                <p className='text-sm text-theme-secondary'>
                  아직 인사이트가 없습니다.
                </p>
              )}
            </div>
          </div>

          <div className='bg-theme-secondary rounded-lg p-6 shadow-sm'>
            <h2 className='text-xl font-semibold text-theme-primary mb-4 flex items-center gap-2'>
              <BookMarked className='h-5 w-5' />
              주요 교훈
            </h2>
            <div className='space-y-2'>
              {totalStats && totalStats.totalLessons > 0 ? (
                <p className='text-sm text-theme-secondary'>
                  총 {totalStats.totalLessons}개의 교훈이 기록되었습니다.
                </p>
              ) : (
                <p className='text-sm text-theme-secondary'>
                  아직 교훈이 없습니다.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
