"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Clock,
  Users,
  BookMarked,
  Lightbulb,
  BookMarked as BookMarkedIcon,
} from "lucide-react"
import { adminService } from "@/services/adminService"
import { ReadingRecord, MonthlyAnalysis } from "@/types/admin"
import { useAuth } from "@/contexts/AuthContext"
import {
  formatReadingTime,
  parseTimeStringToMinutes,
  splitBookTitles,
} from "@/utils/timeUtils"

export default function MonthlyRecordsPage() {
  const router = useRouter()
  const { user, userData, loading, isLoggedIn } = useAuth()
  const [records, setRecords] = useState<ReadingRecord[]>([])
  const [monthlyAnalysis, setMonthlyAnalysis] =
    useState<MonthlyAnalysis | null>(null)
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
      loadMonthlyData()
    }
  }, [selectedYear, selectedMonth, isLoggedIn, loading, user, router])

  const loadMonthlyData = async () => {
    try {
      setIsLoading(true)
      const monthlyRecords = await adminService.getMonthlyRecords(
        selectedYear,
        selectedMonth
      )
      const analysis = await adminService.getMonthlyAnalysis(
        selectedYear,
        selectedMonth
      )

      setRecords(monthlyRecords)
      setMonthlyAnalysis(analysis)
    } catch (error) {
      console.error("Error loading monthly data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const changeMonth = (direction: "prev" | "next") => {
    if (direction === "prev") {
      if (selectedMonth === 1) {
        setSelectedYear(selectedYear - 1)
        setSelectedMonth(12)
      } else {
        setSelectedMonth(selectedMonth - 1)
      }
    } else {
      if (selectedMonth === 12) {
        setSelectedYear(selectedYear + 1)
        setSelectedMonth(1)
      } else {
        setSelectedMonth(selectedMonth + 1)
      }
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return `${date.getMonth() + 1}월 ${date.getDate()}일`
  }

  // 로딩 중이거나 권한이 없는 경우
  if (loading) {
    return (
      <div className='min-h-screen bg-theme-gradient flex items-center justify-center'>
        <div className='text-center'>
          <Calendar className='h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse' />
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
          <Calendar className='h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse' />
          <p className='text-theme-secondary'>월별 데이터를 불러오는 중...</p>
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
            🎯 실천 기록
          </h1>
          <p className='text-theme-secondary text-sm'>
            월별 독서 실천 기록 정리
          </p>
        </header>

        {/* 월 선택기 */}
        <div className='bg-theme-secondary rounded-lg p-6 shadow-sm mb-6'>
          <div className='flex items-center justify-center gap-4'>
            <button
              onClick={() => changeMonth("prev")}
              className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors'
            >
              <ChevronLeft className='h-5 w-5' />
            </button>

            <div className='text-center'>
              <h2 className='text-2xl font-bold text-theme-primary'>
                {selectedYear}년 {selectedMonth}월
              </h2>
              <p className='text-sm text-theme-secondary'>
                {records.length}개의 실천 기록
              </p>
            </div>

            <button
              onClick={() => changeMonth("next")}
              className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors'
            >
              <ChevronRight className='h-5 w-5' />
            </button>
          </div>
        </div>

        {/* 상세 기록 목록 */}
        <div className='bg-theme-secondary rounded-lg p-6 shadow-sm'>
          <h3 className='text-lg font-semibold text-theme-primary mb-4'>
            🎯 실천 기록 목록
          </h3>

          {records.length === 0 ? (
            <div className='text-center py-8'>
              <Calendar className='h-12 w-12 text-gray-400 mx-auto mb-4' />
              <p className='text-theme-secondary'>
                이번 달에는 실천 기록이 없습니다.
              </p>
            </div>
          ) : (
            <div className='space-y-4'>
              {records.map((record) => (
                <div
                  key={record.id}
                  className='border border-gray-200 dark:border-gray-700 rounded-lg p-4'
                >
                  <div className='mb-3'>
                    <h4 className='font-semibold text-theme-primary text-lg mb-1'>
                      {record.title}
                    </h4>
                    <p className='text-sm text-theme-secondary'>
                      {formatDate(record.date)}
                    </p>
                  </div>

                  <div className='space-y-2'>
                    {record.children.map((child, index) => (
                      <div
                        key={index}
                        className='bg-gray-50 dark:bg-gray-800 rounded-lg p-3'
                      >
                        <div className='mb-2'>
                          <span className='font-medium text-theme-primary'>
                            {child.name} ({child.age}세)
                          </span>
                        </div>
                        <p className='text-sm text-theme-secondary mb-2'>
                          📖 {child.book.title}
                        </p>
                        <div className='text-xs text-theme-secondary mb-2'>
                          독서 시간: {child.reading_time_minutes}
                        </div>
                        {child.practice_record && (
                          <div className='bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mt-2'>
                            <h5 className='font-medium text-blue-800 dark:text-blue-200 text-sm mb-2'>
                              🎯 실천 기록
                            </h5>
                            <div className='space-y-1 text-xs text-blue-700 dark:text-blue-300'>
                              <p>
                                <strong>환경:</strong>{" "}
                                {child.practice_record.environment}
                              </p>
                              <p>
                                <strong>집중도:</strong>{" "}
                                {child.practice_record.focus}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
