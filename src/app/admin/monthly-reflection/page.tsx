"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  BookMarked,
  TrendingUp,
  Users,
  Clock,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { adminService } from "@/services/adminService"
import { ReadingRecord, MonthlyAnalysis } from "@/types/admin"
import {
  formatReadingTime,
  parseTimeStringToMinutes,
  splitBookTitles,
} from "@/utils/timeUtils"

export default function MonthlyReflectionPage() {
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
  }, [selectedYear, selectedMonth, isLoggedIn, loading, userData, router])

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

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedYear(selectedYear - 1)
      setSelectedMonth(12)
    } else {
      setSelectedMonth(selectedMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedYear(selectedYear + 1)
      setSelectedMonth(1)
    } else {
      setSelectedMonth(selectedMonth + 1)
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
          <p className='text-theme-secondary'>데이터 로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-theme-gradient'>
      <div className='container mx-auto px-4 py-6'>
        {/* 헤더 */}
        <div className='flex items-center gap-4 mb-6'>
          <button
            onClick={() => router.push("/admin")}
            className='p-2 bg-theme-secondary rounded-lg shadow-sm hover:shadow-md transition-shadow'
          >
            <ArrowLeft className='h-5 w-5 text-theme-primary' />
          </button>
          <div>
            <h1 className='text-2xl font-bold text-theme-primary'>월별 회고</h1>
            <p className='text-theme-secondary'>월별 독서 활동 회고 및 분석</p>
          </div>
        </div>

        {/* 월 선택 */}
        <div className='bg-theme-secondary rounded-lg p-4 shadow-sm mb-6'>
          <div className='flex items-center justify-between'>
            <button
              onClick={handlePrevMonth}
              className='p-2 hover:bg-theme-tertiary rounded-lg transition-colors'
            >
              <ChevronLeft className='h-5 w-5 text-theme-primary' />
            </button>
            <h2 className='text-xl font-semibold text-theme-primary'>
              {selectedYear}년 {selectedMonth}월
            </h2>
            <button
              onClick={handleNextMonth}
              className='p-2 hover:bg-theme-tertiary rounded-lg transition-colors'
            >
              <ChevronRight className='h-5 w-5 text-theme-primary' />
            </button>
          </div>
        </div>

        {/* 월별 요약 통계 */}
        {monthlyAnalysis && (
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6'>
            <div className='bg-theme-secondary rounded-lg p-4 shadow-sm'>
              <div className='flex items-center gap-3 mb-2'>
                <div className='p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg'>
                  <Calendar className='h-5 w-5 text-blue-600 dark:text-blue-400' />
                </div>
              </div>
              <div>
                <p className='text-sm text-theme-secondary'>총 기록</p>
                <p className='text-2xl font-bold text-theme-primary'>
                  {monthlyAnalysis.totalRecords}개
                </p>
              </div>
            </div>

            <div className='bg-theme-secondary rounded-lg p-4 shadow-sm'>
              <div className='flex items-center gap-3 mb-2'>
                <div className='p-2 bg-green-100 dark:bg-green-900/20 rounded-lg'>
                  <Clock className='h-5 w-5 text-green-600 dark:text-green-400' />
                </div>
              </div>
              <div>
                <p className='text-sm text-theme-secondary'>총 독서 시간</p>
                <p className='text-2xl font-bold text-theme-primary'>
                  {formatReadingTime(monthlyAnalysis.totalReadingTime)}
                </p>
              </div>
            </div>

            <div className='bg-theme-secondary rounded-lg p-4 shadow-sm'>
              <div className='flex items-center gap-3 mb-2'>
                <div className='p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg'>
                  <Users className='h-5 w-5 text-purple-600 dark:text-purple-400' />
                </div>
              </div>
              <div>
                <p className='text-sm text-theme-secondary'>총 참여 아동</p>
                <p className='text-2xl font-bold text-theme-primary'>
                  {monthlyAnalysis.totalChildren}명
                </p>
              </div>
            </div>

            <div className='bg-theme-secondary rounded-lg p-4 shadow-sm'>
              <div className='flex items-center gap-3 mb-2'>
                <div className='p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg'>
                  <BookMarked className='h-5 w-5 text-orange-600 dark:text-orange-400' />
                </div>
              </div>
              <div>
                <p className='text-sm text-theme-secondary'>읽은 책</p>
                <p className='text-2xl font-bold text-theme-primary'>
                  {monthlyAnalysis.uniqueBooks.length}권
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 월별 회고 분석 */}
        <div className='bg-theme-secondary rounded-lg p-6 shadow-sm mb-6'>
          <h3 className='text-xl font-semibold text-theme-primary mb-4 flex items-center gap-2'>
            📝 월별 회고 분석
          </h3>

          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            {/* 인사이트 및 교훈 */}
            <div className='space-y-4'>
              <div>
                <h4 className='text-lg font-semibold text-theme-primary mb-3 flex items-center gap-2'>
                  <Lightbulb className='h-5 w-5' />
                  이번 달 인사이트 ({monthlyAnalysis?.insights.length || 0}개)
                </h4>
                <div className='space-y-2'>
                  {monthlyAnalysis &&
                  monthlyAnalysis.insights &&
                  monthlyAnalysis.insights.length > 0 ? (
                    monthlyAnalysis.insights.map((insight, index) => (
                      <div
                        key={index}
                        className='p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg'
                      >
                        <p className='text-sm text-theme-primary'>{insight}</p>
                      </div>
                    ))
                  ) : (
                    <p className='text-sm text-theme-secondary italic'>
                      이번 달 인사이트가 없습니다.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <h4 className='text-lg font-semibold text-theme-primary mb-3 flex items-center gap-2'>
                  <BookMarked className='h-5 w-5' />
                  이번 달 교훈 ({monthlyAnalysis?.lessons.length || 0}개)
                </h4>
                <div className='space-y-2'>
                  {monthlyAnalysis &&
                  monthlyAnalysis.lessons &&
                  monthlyAnalysis.lessons.length > 0 ? (
                    monthlyAnalysis.lessons.map((lesson, index) => (
                      <div
                        key={index}
                        className='p-3 bg-green-50 dark:bg-green-900/20 rounded-lg'
                      >
                        <p className='text-sm text-theme-primary'>{lesson}</p>
                      </div>
                    ))
                  ) : (
                    <p className='text-sm text-theme-secondary italic'>
                      이번 달 교훈이 없습니다.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 월별 성장 분석 */}
            <div>
              <h4 className='text-lg font-semibold text-theme-primary mb-3 flex items-center gap-2'>
                📈 성장 분석
              </h4>
              <div className='space-y-3'>
                <div className='p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg'>
                  <h5 className='font-medium text-theme-primary mb-2'>
                    📚 독서 패턴
                  </h5>
                  <div className='space-y-1 text-sm text-theme-secondary'>
                    <p>
                      • 평균 독서 시간:{" "}
                      {monthlyAnalysis && monthlyAnalysis.totalRecords > 0
                        ? formatReadingTime(
                            monthlyAnalysis.totalReadingTime /
                              monthlyAnalysis.totalRecords
                          )
                        : "0:00"}
                    </p>
                    <p>
                      • 참여율:{" "}
                      {monthlyAnalysis
                        ? Math.round(
                            (monthlyAnalysis.totalChildren /
                              monthlyAnalysis.totalRecords) *
                              100
                          )
                        : 0}
                      %
                    </p>
                    <p>
                      • 독서 다양성: {monthlyAnalysis?.uniqueBooks.length || 0}
                      권의 책
                    </p>
                  </div>
                </div>

                <div className='p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg'>
                  <h5 className='font-medium text-theme-primary mb-2'>
                    🧠 학습 성과
                  </h5>
                  <div className='space-y-1 text-sm text-theme-secondary'>
                    <p>
                      • 새로운 단어: {monthlyAnalysis?.uniqueWords.length || 0}
                      개
                    </p>
                    <p>
                      • 소통 기회:{" "}
                      {monthlyAnalysis
                        ? Math.round(monthlyAnalysis.totalChildren * 1.5)
                        : 0}
                      회 추정
                    </p>
                    <p>
                      • 인사이트 생성: {monthlyAnalysis?.insights.length || 0}개
                    </p>
                  </div>
                </div>

                <div className='p-4 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 rounded-lg'>
                  <h5 className='font-medium text-theme-primary mb-2'>
                    🎯 개선 포인트
                  </h5>
                  <div className='space-y-1 text-sm text-theme-secondary'>
                    <p>• 어휘력 향상: 단어 설명 비율 개선 필요</p>
                    <p>• 소통 질: 키워드 기반 대화 확대</p>
                    <p>• 기록 체계: 정기적인 회고 작성</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
