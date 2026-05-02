"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Clock,
  BookOpen,
  TrendingUp,
  Target,
  Calendar,
  BarChart3,
  Activity,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useData } from "@/contexts/DataContext"
import { UserStatisticsService } from "@/services/userStatisticsService"
import { UserStatistics } from "@/types/user"
import { ReadingPatternCharts } from "@/components/ReadingPatternCharts"
import {
  StatisticsBodySkeleton,
  StatisticsHubPageSkeleton,
} from "@/components/skeletons"

export default function StatisticsPage() {
  const router = useRouter()
  const { loading, isLoggedIn, userUid } = useAuth()
  const {
    userStatistics,
    isLoading,
    updateStatistics,
    allReadingSessions,
    timePatterns,
  } = useData()
  const [isRecalculating, setIsRecalculating] = useState(false)

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push("/login")
      return
    }
  }, [isLoggedIn, loading, router])

  const handleRecalculateStatistics = async () => {
    if (!userUid) return
    try {
      setIsRecalculating(true)
      // 이미 로드된 세션 데이터를 사용하여 통계 재계산
      await UserStatisticsService.recalculateUserStatisticsWithSessions(
        userUid,
        allReadingSessions
      )
      await updateStatistics()
    } catch (error) {
      console.error("Error recalculating statistics:", error)
    } finally {
      setIsRecalculating(false)
    }
  }

  if (loading) {
    return <StatisticsHubPageSkeleton />
  }

  if (!isLoggedIn) {
    return null
  }

  return (
    <div className='min-h-screen bg-theme-gradient pb-20'>
      <div className='container mx-auto px-4 py-6'>
        <header className='mb-6'>
          <button
            onClick={() => router.push("/mypage")}
            className='flex items-center gap-2 text-theme-secondary hover:text-theme-primary mb-4 transition-colors'
          >
            <ArrowLeft className='h-5 w-5' />
            마이페이지로 이동
          </button>
          <div className='flex items-center justify-between'>
            <div>
              <h1 className='text-3xl font-bold text-theme-primary mb-2'>
                📊 독서 통계
              </h1>
              <p className='text-theme-secondary text-sm'>
                나의 독서 패턴을 분석해보세요
              </p>
            </div>
            <button
              onClick={handleRecalculateStatistics}
              className='px-4 py-2 bg-accent-theme hover:bg-accent-theme-secondary text-white rounded-lg transition-colors text-sm'
              disabled={isRecalculating}
            >
              {isRecalculating ? "통계 재계산 중..." : "통계 새로고침"}
            </button>
          </div>
        </header>

        {isLoading ? (
          <>
            <span className="sr-only">통계를 불러오는 중</span>
            <StatisticsBodySkeleton />
          </>
        ) : userStatistics ? (
          <div className='space-y-6'>
            {/* 주요 통계 */}
            <div className='bg-theme-secondary rounded-lg p-6 shadow-sm'>
              <h2 className='text-lg font-semibold text-theme-primary mb-4'>
                📈 주요 통계
              </h2>
              <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                <div className='text-center'>
                  <div className='flex items-center justify-center mb-2'>
                    <Clock className='h-6 w-6 accent-theme-primary' />
                  </div>
                  <p className='text-xs text-theme-secondary mb-1'>
                    총 독서 시간
                  </p>
                  <p className='text-lg font-bold text-theme-primary'>
                    {Math.floor(userStatistics.totalReadingTime / 3600)}시간{" "}
                    {Math.floor((userStatistics.totalReadingTime % 3600) / 60)}
                    분
                  </p>
                </div>

                <div className='text-center'>
                  <div className='flex items-center justify-center mb-2'>
                    <BookOpen className='h-6 w-6 text-green-500' />
                  </div>
                  <p className='text-xs text-theme-secondary mb-1'>독서 세션</p>
                  <p className='text-lg font-bold text-theme-primary'>
                    {userStatistics.totalSessions}회
                  </p>
                </div>

                <div className='text-center'>
                  <div className='flex items-center justify-center mb-2'>
                    <TrendingUp className='h-6 w-6 text-purple-500' />
                  </div>
                  <p className='text-xs text-theme-secondary mb-1'>평균 세션</p>
                  <p className='text-lg font-bold text-theme-primary'>
                    {Math.floor(userStatistics.averageSessionTime / 60)}분{" "}
                    {userStatistics.averageSessionTime % 60}초
                  </p>
                </div>

                <div className='text-center'>
                  <div className='flex items-center justify-center mb-2'>
                    <Target className='h-6 w-6 text-orange-500' />
                  </div>
                  <p className='text-xs text-theme-secondary mb-1'>
                    연속 독서일
                  </p>
                  <p className='text-lg font-bold text-theme-primary'>
                    {userStatistics.readingStreak}일
                  </p>
                </div>
              </div>
            </div>

            {/* 상세 통계 */}
            <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
              {/* 일일 독서 시간 분포 */}
              <div className='bg-theme-secondary rounded-lg p-6 shadow-sm'>
                <div className='flex items-center justify-between mb-4'>
                  <h3 className='text-lg font-semibold text-theme-primary'>
                    📅 일일 독서 패턴
                  </h3>
                  <button
                    onClick={() => router.push("/mypage/statistics/daily")}
                    className='text-sm text-accent-theme hover:text-accent-theme-secondary transition-colors'
                  >
                    상세보기 →
                  </button>
                </div>
                <div className='space-y-3'>
                  <div className='flex items-center justify-between'>
                    <span className='text-sm text-theme-secondary'>
                      가장 긴 독서일
                    </span>
                    <span className='text-sm font-medium text-theme-primary'>
                      {userStatistics.longestSessionTime
                        ? `${Math.floor(
                            userStatistics.longestSessionTime / 3600
                          )}시간 ${Math.floor(
                            (userStatistics.longestSessionTime % 3600) / 60
                          )}분`
                        : "0시간 0분"}
                    </span>
                  </div>
                  <div className='flex items-center justify-between'>
                    <span className='text-sm text-theme-secondary'>
                      평균 일일 독서 시간
                    </span>
                    <span className='text-sm font-medium text-theme-primary'>
                      {userStatistics.averageDailyTime
                        ? `${Math.floor(
                            userStatistics.averageDailyTime / 60
                          )}분 ${userStatistics.averageDailyTime % 60}초`
                        : "0분 0초"}
                    </span>
                  </div>
                  <div className='flex items-center justify-between'>
                    <span className='text-sm text-theme-secondary'>
                      독서한 날 수
                    </span>
                    <span className='text-sm font-medium text-theme-primary'>
                      {userStatistics.daysWithSessions || 0}일
                    </span>
                  </div>
                </div>
              </div>

              {/* 독서 목표 및 성취 */}
              <div className='bg-theme-secondary rounded-lg p-6 shadow-sm'>
                <h3 className='text-lg font-semibold text-theme-primary mb-4'>
                  🎯 독서 목표
                </h3>
                <div className='space-y-3'>
                  <div className='flex items-center justify-between'>
                    <span className='text-sm text-theme-secondary'>
                      현재 연속 독서일
                    </span>
                    <span className='text-sm font-medium text-theme-primary'>
                      {userStatistics.readingStreak || 0}일
                    </span>
                  </div>
                  <div className='flex items-center justify-between'>
                    <span className='text-sm text-theme-secondary'>
                      최고 연속 독서일
                    </span>
                    <span className='text-sm font-medium text-theme-primary'>
                      {userStatistics.longestStreak || 0}일
                    </span>
                  </div>
                  <div className='flex items-center justify-between'>
                    <span className='text-sm text-theme-secondary'>
                      이번 달 독서 시간
                    </span>
                    <span className='text-sm font-medium text-theme-primary'>
                      {userStatistics.monthlyReadingTime
                        ? `${Math.floor(
                            userStatistics.monthlyReadingTime / 3600
                          )}시간 ${Math.floor(
                            (userStatistics.monthlyReadingTime % 3600) / 60
                          )}분`
                        : "0시간 0분"}
                    </span>
                  </div>
                </div>
              </div>

              {/* 시간대별 독서 패턴 */}
              <div className='bg-theme-secondary rounded-lg p-6 shadow-sm'>
                <div className='flex items-center justify-between mb-4'>
                  <h3 className='text-lg font-semibold text-theme-primary'>
                    🕐 시간대별 패턴
                  </h3>
                  <button
                    onClick={() =>
                      router.push("/mypage/statistics/time-pattern")
                    }
                    className='text-sm text-accent-theme hover:text-accent-theme-secondary transition-colors'
                  >
                    상세보기 →
                  </button>
                </div>
                <div className='space-y-3'>
                  <div className='flex items-center justify-between'>
                    <span className='text-sm text-theme-secondary'>
                      가장 활발한 독서 시간대
                    </span>
                    <span className='text-sm font-medium text-theme-primary'>
                      {timePatterns?.mostActiveTimeSlot?.label || "데이터 없음"}
                    </span>
                  </div>
                  <div className='flex items-center justify-between'>
                    <span className='text-sm text-theme-secondary'>
                      가장 활발한 독서 요일
                    </span>
                    <span className='text-sm font-medium text-theme-primary'>
                      {timePatterns?.mostActiveDay?.dayName || "데이터 없음"}
                    </span>
                  </div>
                  <div className='flex items-center justify-between'>
                    <span className='text-sm text-theme-secondary'>
                      총 독서 세션
                    </span>
                    <span className='text-sm font-medium text-theme-primary'>
                      {timePatterns ? `${allReadingSessions.length}회` : "0회"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 독서 패턴 시각화 */}
            {timePatterns && (
              <div className='bg-theme-secondary rounded-lg p-6 shadow-sm'>
                <h3 className='text-lg font-semibold text-theme-primary mb-4'>
                  📊 독서 패턴 시각화
                </h3>
                <ReadingPatternCharts
                  overallTimeSlots={timePatterns.overallTimeSlots}
                  dayTimePatterns={timePatterns.dayTimePatterns}
                />
              </div>
            )}
          </div>
        ) : (
          <div className='text-center py-12'>
            <BarChart3 className='h-12 w-12 text-gray-400 mx-auto mb-4' />
            <h3 className='text-lg font-medium text-theme-primary mb-2'>
              통계 데이터가 없습니다
            </h3>
            <p className='text-theme-secondary'>
              독서 기록을 추가하면 통계를 확인할 수 있습니다
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
