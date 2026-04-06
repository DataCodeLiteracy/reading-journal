"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Clock, Calendar } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useData } from "@/contexts/DataContext"
import { ReadingSession } from "@/types/user"
import Pagination from "@/components/Pagination"
import {
  GenericRouteSkeleton,
  StatisticsBodySkeleton,
} from "@/components/skeletons"

interface DailyReadingData {
  date: string
  totalTime: number
  sessions: ReadingSession[]
  sessionCount: number
}

export default function DailyStatisticsPage() {
  const router = useRouter()
  const { loading, isLoggedIn, userUid } = useAuth()
  const { allReadingSessions, allBooks, isLoading } = useData()
  const [dailyData, setDailyData] = useState<DailyReadingData[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push("/login")
      return
    }
  }, [isLoggedIn, loading, router])

  useEffect(() => {
    if (!isLoggedIn || !userUid || !allReadingSessions) return

    // 날짜별로 그룹화
    const dailyMap: { [date: string]: ReadingSession[] } = {}
    allReadingSessions.forEach((session) => {
      const date = session.date
      if (!dailyMap[date]) {
        dailyMap[date] = []
      }
      dailyMap[date].push(session)
    })

    // 날짜별 데이터 생성
    const dailyDataArray: DailyReadingData[] = Object.keys(dailyMap)
      .map((date) => {
        const daySessions = dailyMap[date]
        const totalTime = daySessions.reduce(
          (acc, session) => acc + session.duration,
          0
        )
        return {
          date,
          totalTime,
          sessions: daySessions,
          sessionCount: daySessions.length,
        }
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    setDailyData(dailyDataArray)
  }, [isLoggedIn, userUid, allReadingSessions])

  // 책 제목을 가져오는 함수
  const getBookTitle = (bookId: string) => {
    const book = allBooks.find((book) => book.id === bookId)
    return book ? book.title : "알 수 없는 책"
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60

    if (hours > 0) {
      return `${hours}시간 ${minutes}분 ${remainingSeconds}초`
    } else if (minutes > 0) {
      return `${minutes}분 ${remainingSeconds}초`
    } else {
      return `${remainingSeconds}초`
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)

    // 모든 날짜를 일관된 형식으로 표시
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      weekday: "short",
    })
  }

  // 페이지네이션을 위한 데이터 계산
  const totalItems = dailyData.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentPageData = dailyData.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  if (loading) {
    return <GenericRouteSkeleton rows={4} />
  }

  if (!isLoggedIn) {
    return null
  }

  return (
    <div className='min-h-screen bg-theme-gradient'>
      <div className='container mx-auto px-4 py-6'>
        <header className='mb-6'>
          <button
            onClick={() => router.back()}
            className='flex items-center gap-2 text-theme-secondary hover:text-theme-primary mb-4 transition-colors'
          >
            <ArrowLeft className='h-5 w-5' />
            뒤로가기
          </button>
          <h1 className='text-3xl font-bold text-theme-primary mb-2'>
            📅 일일 독서 패턴
          </h1>
          <p className='text-theme-secondary text-sm'>
            날짜별 독서 기록을 확인해보세요
          </p>
        </header>

        {isLoading ? (
          <>
            <span className="sr-only">데이터를 불러오는 중</span>
            <StatisticsBodySkeleton />
          </>
        ) : dailyData.length === 0 ? (
          <div className='text-center py-12'>
            <Calendar className='h-12 w-12 text-gray-400 mx-auto mb-4' />
            <h3 className='text-lg font-medium text-theme-primary mb-2'>
              독서 기록이 없습니다
            </h3>
            <p className='text-theme-secondary'>
              독서를 시작하면 여기에 기록이 표시됩니다
            </p>
          </div>
        ) : (
          <>
            <div className='space-y-4 mb-6'>
              {currentPageData.map((day) => (
                <div
                  key={day.date}
                  className='bg-theme-secondary rounded-lg p-4 shadow-sm'
                >
                  <div className='flex items-center justify-between mb-3'>
                    <div className='flex items-center gap-3'>
                      <Calendar className='h-5 w-5 text-accent-theme' />
                      <h3 className='font-semibold text-theme-primary'>
                        {formatDate(day.date)}
                      </h3>
                    </div>
                    <div className='flex items-center gap-2'>
                      <Clock className='h-4 w-4 text-theme-tertiary' />
                      <span className='text-sm font-medium text-theme-primary'>
                        {formatTime(day.totalTime)}
                      </span>
                    </div>
                  </div>

                  <div className='flex items-center justify-between text-sm text-theme-secondary mb-3'>
                    <span>독서 세션 {day.sessionCount}회</span>
                    <span>
                      평균{" "}
                      {formatTime(Math.round(day.totalTime / day.sessionCount))}
                    </span>
                  </div>

                  {day.sessions.length > 0 && (
                    <div className='space-y-2'>
                      {day.sessions.map((session, index) => (
                        <div
                          key={session.id}
                          className='flex items-center justify-between text-xs text-theme-tertiary bg-theme-primary rounded p-2'
                        >
                          <div className='flex-1 min-w-0'>
                            <div className='flex items-center gap-2'>
                              <span className='font-medium'>
                                세션 {index + 1}
                              </span>
                              <span className='text-theme-secondary'>-</span>
                              <span className='truncate'>
                                {getBookTitle(session.bookId)}
                              </span>
                            </div>
                          </div>
                          <span className='ml-2 flex-shrink-0'>
                            {formatTime(session.duration)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className='mt-8 mb-8 pb-8'>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  totalItems={totalItems}
                  itemsPerPage={itemsPerPage}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
