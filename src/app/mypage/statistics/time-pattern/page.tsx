"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Clock,
  Calendar,
  BarChart3,
  TrendingUp,
  Activity,
  Sun,
  Moon,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useData } from "@/contexts/DataContext"
import {
  TimePatternService,
  TimePatternAnalysis,
} from "@/services/timePatternService"

export default function TimePatternPage() {
  const router = useRouter()
  const { loading, isLoggedIn } = useAuth()
  const { allReadingSessions, timePatterns } = useData()
  const [isLoading, setIsLoading] = useState(true)
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push("/login")
      return
    }
  }, [isLoggedIn, loading, router])

  useEffect(() => {
    if (allReadingSessions.length > 0 || timePatterns) {
      // 로딩 스피너가 충분히 돌도록 최소 1.5초 대기
      const timer = setTimeout(() => {
        setIsLoading(false)
        // 컨텐츠가 부드럽게 나타나도록 약간의 지연
        setTimeout(() => setShowContent(true), 200)
      }, 1500)

      return () => clearTimeout(timer)
    }
  }, [allReadingSessions, timePatterns])

  // 데이터가 로드되었지만 timePatterns가 없는 경우 (세션은 있지만 분석 결과가 없는 경우)
  const hasData = allReadingSessions.length > 0
  const hasAnalysis = timePatterns && Object.keys(timePatterns).length > 0

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}시간 ${minutes}분`
    }
    return `${minutes}분`
  }

  const getTimeSlotIcon = (hour: number) => {
    if (hour >= 6 && hour < 18)
      return <Sun className='h-4 w-4 text-yellow-500' />
    return <Moon className='h-4 w-4 text-blue-500' />
  }

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

  if (!isLoggedIn) {
    return null
  }

  return (
    <div className='min-h-screen bg-theme-gradient'>
      <div className='container mx-auto px-4 py-6'>
        <header className='mb-6'>
          <button
            onClick={() => router.push("/mypage/statistics")}
            className='flex items-center gap-2 text-theme-secondary hover:text-theme-primary mb-4 transition-colors'
          >
            <ArrowLeft className='h-5 w-5' />
            독서 통계 페이지로 이동
          </button>
          <div>
            <h1 className='text-3xl font-bold text-theme-primary mb-2'>
              🕐 시간대별 독서 패턴
            </h1>
            <p className='text-theme-secondary text-sm'>
              언제 가장 많은 독서가 이루어지는지 확인해보세요
            </p>
          </div>
        </header>

        {isLoading ? (
          <div className='text-center py-12'>
            <BarChart3 className='h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse' />
            <p className='text-theme-secondary'>패턴을 분석하는 중...</p>
          </div>
        ) : !hasData ? (
          <div className='text-center py-12'>
            <BarChart3 className='h-12 w-12 text-gray-400 mx-auto mb-4' />
            <p className='text-lg font-medium text-theme-primary mb-2'>
              독서 기록이 없습니다
            </p>
            <p className='text-theme-secondary mb-4'>
              독서를 시작하면 시간대별 패턴을 분석할 수 있습니다
            </p>
            <button
              onClick={() => router.push("/")}
              className='bg-accent-theme text-white px-4 py-2 rounded-lg hover:bg-accent-theme/90 transition-colors'
            >
              독서 시작하기
            </button>
          </div>
        ) : !hasAnalysis ? (
          <div className='text-center py-12'>
            <BarChart3 className='h-12 w-12 text-gray-400 mx-auto mb-4' />
            <p className='text-lg font-medium text-theme-primary mb-2'>
              패턴 분석을 위한 데이터가 부족합니다
            </p>
            <p className='text-theme-secondary mb-4'>
              더 많은 독서 기록이 필요합니다
            </p>
            <button
              onClick={() => router.push("/")}
              className='bg-accent-theme text-white px-4 py-2 rounded-lg hover:bg-accent-theme/90 transition-colors'
            >
              독서 계속하기
            </button>
          </div>
        ) : showContent ? (
          <div className='space-y-6 animate-fade-in'>
            {/* 주요 인사이트 */}
            <div className='bg-theme-secondary rounded-lg p-6 shadow-sm'>
              <h2 className='text-lg font-semibold text-theme-primary mb-4'>
                💡 주요 인사이트
              </h2>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='bg-accent-theme/10 rounded-lg p-4'>
                  <div className='flex items-center gap-2 mb-2'>
                    <Clock className='h-5 w-5 text-accent-theme' />
                    <span className='text-sm font-medium text-theme-secondary'>
                      가장 활발한 독서 시간대
                    </span>
                  </div>
                  <p className='text-lg font-bold text-theme-primary'>
                    {timePatterns.mostActiveTimeSlot.label}
                  </p>
                  <p className='text-sm text-theme-secondary'>
                    {timePatterns.mostActiveTimeSlot.count}회 (
                    {timePatterns.mostActiveTimeSlot.percentage.toFixed(1)}%)
                  </p>
                </div>

                <div className='bg-green-500/10 rounded-lg p-4'>
                  <div className='flex items-center gap-2 mb-2'>
                    <Calendar className='h-5 w-5 text-green-500' />
                    <span className='text-sm font-medium text-theme-secondary'>
                      가장 활발한 독서 요일
                    </span>
                  </div>
                  <p className='text-lg font-bold text-theme-primary'>
                    {timePatterns.mostActiveDay.dayName}
                  </p>
                  <p className='text-sm text-theme-secondary'>
                    {timePatterns.mostActiveDay.totalSessions}회 (
                    {formatTime(timePatterns.mostActiveDay.totalTime)})
                  </p>
                </div>
              </div>
            </div>

            {/* 전체 시간대별 분포 */}
            <div className='bg-theme-secondary rounded-lg p-6 shadow-sm'>
              <h2 className='text-lg font-semibold text-theme-primary mb-4'>
                📊 전체 시간대별 독서 분포
              </h2>
              <div className='space-y-3'>
                {timePatterns.overallTimeSlots
                  .filter((slot) => slot.count > 0)
                  .sort((a, b) => b.count - a.count)
                  .map((slot, index) => (
                    <div key={slot.hour} className='flex items-center gap-3'>
                      <div className='flex items-center gap-2 w-28 flex-shrink-0'>
                        {getTimeSlotIcon(slot.hour)}
                        <span className='text-sm font-medium text-theme-primary'>
                          {slot.label}
                        </span>
                      </div>
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center gap-2 mb-1'>
                          <div
                            className='h-3 bg-accent-theme rounded-full transition-all duration-300 flex-shrink-0'
                            style={{
                              width: `${Math.max(slot.percentage * 1.5, 15)}px`,
                              opacity: 0.3 + (slot.percentage / 100) * 0.7,
                            }}
                          />
                          <span className='text-sm text-theme-secondary min-w-[50px] flex-shrink-0'>
                            {slot.count}회
                          </span>
                          <span className='text-sm text-theme-secondary min-w-[70px] flex-shrink-0'>
                            {formatTime(slot.totalTime)}
                          </span>
                        </div>
                        <div className='text-xs text-theme-secondary truncate'>
                          {slot.percentage.toFixed(1)}%의 독서가 이 시간대에
                          이루어짐
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* 요일별 시간대 패턴 */}
            <div className='bg-theme-secondary rounded-lg p-6 shadow-sm'>
              <h2 className='text-lg font-semibold text-theme-primary mb-4'>
                📅 요일별 시간대 패턴
              </h2>
              <div className='space-y-4'>
                {timePatterns.dayTimePatterns
                  .filter((day) => day.totalSessions > 0)
                  .sort((a, b) => {
                    // 월요일(1)부터 시작하여 일요일(0)로 끝나도록 정렬
                    if (a.dayOfWeek === 0) return 1 // 일요일은 마지막
                    if (b.dayOfWeek === 0) return -1 // 일요일은 마지막
                    return a.dayOfWeek - b.dayOfWeek
                  })
                  .map((day) => (
                    <div
                      key={day.dayOfWeek}
                      className='border border-gray-200 rounded-lg p-4'
                    >
                      <div className='flex items-center justify-between mb-3'>
                        <h3 className='font-medium text-theme-primary'>
                          {day.dayName}
                        </h3>
                        <div className='text-sm text-theme-secondary'>
                          총 {day.totalSessions}회 • {formatTime(day.totalTime)}
                        </div>
                      </div>
                      <div className='grid grid-cols-2 md:grid-cols-3 gap-2'>
                        {day.timeSlots
                          .filter((slot) => slot.count > 0)
                          .sort((a, b) => b.count - a.count)
                          .map((slot) => (
                            <div
                              key={slot.hour}
                              className='text-center p-2 bg-accent-theme/5 rounded'
                            >
                              <div className='text-xs text-theme-secondary mb-1'>
                                {slot.label}
                              </div>
                              <div className='text-sm font-medium text-theme-primary'>
                                {slot.count}회
                              </div>
                              <div className='text-xs text-theme-secondary'>
                                {formatTime(slot.totalTime)}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* 시간대별 평균 세션 시간 */}
            <div className='bg-theme-secondary rounded-lg p-6 shadow-sm'>
              <h2 className='text-lg font-semibold text-theme-primary mb-4'>
                ⏱️ 시간대별 평균 독서 시간
              </h2>
              <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                {Object.entries(timePatterns.averageSessionTimeByHour)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 8)
                  .map(([hour, avgTime]) => {
                    const timeSlot = TimePatternService.TIME_SLOTS.find(
                      (slot) => slot.hour === parseInt(hour)
                    )
                    return (
                      <div
                        key={hour}
                        className='text-center p-3 bg-accent-theme/5 rounded-lg'
                      >
                        <div className='flex items-center justify-center mb-2'>
                          {getTimeSlotIcon(parseInt(hour))}
                        </div>
                        <div className='text-sm font-medium text-theme-primary mb-1'>
                          {timeSlot?.label || `${hour}시대`}
                        </div>
                        <div className='text-lg font-bold text-accent-theme'>
                          {formatTime(avgTime)}
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>

            {/* 독서 패턴 분석 및 제안 */}
            <div className='bg-theme-secondary rounded-lg p-6 shadow-sm'>
              <h2 className='text-lg font-semibold text-theme-primary mb-4'>
                💡 독서 패턴 분석 및 제안
              </h2>
              <div className='space-y-3 text-sm text-theme-secondary'>
                <p>
                  •{" "}
                  <strong className='text-theme-primary'>
                    {timePatterns.mostActiveTimeSlot.label}
                  </strong>
                  에 가장 많은 독서가 이루어지고 있습니다. 이 시간대를 활용해서
                  독서 습관을 더욱 정착시켜보세요.
                </p>
                <p>
                  •{" "}
                  <strong className='text-theme-primary'>
                    {timePatterns.mostActiveDay.dayName}
                  </strong>
                  에 가장 활발한 독서 활동이 이루어지고 있습니다. 다른 요일에도
                  이 요일만큼 독서 시간을 확보해보는 건 어떨까요?
                </p>
                <p>
                  • 독서 시간이 적은 시간대가 있다면, 그 시간대에 짧은
                  그림책이나 간단한 이야기로 시작해보는 것을 추천합니다.
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
