"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Clock, BookOpen, TrendingUp, Target } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useData } from "@/contexts/DataContext"
import { UserStatisticsService } from "@/services/userStatisticsService"
import { ReadingPatternCharts } from "@/components/ReadingPatternCharts"
import StatisticsPageShell from "@/components/statistics/StatisticsPageShell"
import {
  StatisticsBodySkeleton,
  StatisticsSubPageSkeleton,
} from "@/components/skeletons"

export default function ReadingTimeStatisticsPage() {
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
    }
  }, [isLoggedIn, loading, router])

  const handleRecalculate = async () => {
    if (!userUid) return
    try {
      setIsRecalculating(true)
      await UserStatisticsService.recalculateUserStatisticsWithSessions(
        userUid,
        allReadingSessions,
      )
      await updateStatistics()
    } catch (e) {
      console.error("statistics recalc:", e)
    } finally {
      setIsRecalculating(false)
    }
  }

  if (loading) {
    return <StatisticsSubPageSkeleton />
  }

  if (!isLoggedIn) {
    return null
  }

  return (
    <StatisticsPageShell
      title="독서 시간"
      description="세션 기록을 바탕으로 한 독서 시간·습관 지표입니다."
      headerAction={
        <button
          type="button"
          onClick={handleRecalculate}
          disabled={isRecalculating}
          className="shrink-0 rounded-lg bg-accent-theme px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-accent-theme-secondary disabled:opacity-50 sm:text-sm"
        >
          {isRecalculating ? "재계산 중…" : "통계 새로고침"}
        </button>
      }
    >
      {isLoading ? (
        <>
          <span className="sr-only">통계 불러오는 중</span>
          <StatisticsBodySkeleton />
        </>
      ) : userStatistics ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MetricCard
              icon={Clock}
              iconClass="text-sky-500"
              label="총 독서 시간"
              value={`${Math.floor(userStatistics.totalReadingTime / 3600)}시간 ${Math.floor((userStatistics.totalReadingTime % 3600) / 60)}분`}
            />
            <MetricCard
              icon={BookOpen}
              iconClass="text-emerald-500"
              label="독서 세션"
              value={`${userStatistics.totalSessions}회`}
            />
            <MetricCard
              icon={TrendingUp}
              iconClass="text-violet-500"
              label="평균 세션"
              value={`${Math.floor(userStatistics.averageSessionTime / 60)}분`}
            />
            <MetricCard
              icon={Target}
              iconClass="text-orange-500"
              label="연속 독서일"
              value={`${userStatistics.readingStreak}일`}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <DetailCard title="일일 패턴">
              <DetailRow
                label="가장 긴 독서일"
                value={
                  userStatistics.longestSessionTime
                    ? `${Math.floor(userStatistics.longestSessionTime / 3600)}시간 ${Math.floor((userStatistics.longestSessionTime % 3600) / 60)}분`
                    : "—"
                }
              />
              <DetailRow
                label="평균 일일 시간"
                value={
                  userStatistics.averageDailyTime
                    ? `${Math.floor(userStatistics.averageDailyTime / 60)}분`
                    : "—"
                }
              />
              <DetailRow
                label="독서한 날"
                value={`${userStatistics.daysWithSessions ?? 0}일`}
              />
            </DetailCard>

            <DetailCard title="목표·기록">
              <DetailRow
                label="최고 연속 독서일"
                value={`${userStatistics.longestStreak ?? 0}일`}
              />
              <DetailRow
                label="이번 달 독서"
                value={
                  userStatistics.monthlyReadingTime
                    ? `${Math.floor(userStatistics.monthlyReadingTime / 3600)}시간 ${Math.floor((userStatistics.monthlyReadingTime % 3600) / 60)}분`
                    : "—"
                }
              />
              <DetailRow
                label="총 세션"
                value={`${allReadingSessions.length}회`}
              />
            </DetailCard>
          </div>

          {timePatterns && (
            <div className="rounded-xl border border-theme-tertiary/40 bg-theme-secondary p-4 sm:p-6">
              <h3 className="mb-4 text-sm font-semibold text-theme-primary">
                시간대·요일 패턴
              </h3>
              <ReadingPatternCharts
                overallTimeSlots={timePatterns.overallTimeSlots}
                dayTimePatterns={timePatterns.dayTimePatterns}
              />
              <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                <DetailRow
                  label="가장 활발한 시간대"
                  value={timePatterns.mostActiveTimeSlot?.label ?? "—"}
                />
                <DetailRow
                  label="가장 활발한 요일"
                  value={timePatterns.mostActiveDay?.dayName ?? "—"}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="py-12 text-center">
          <p className="text-sm font-medium text-theme-primary">
            통계 데이터가 없습니다
          </p>
          <p className="mt-1 text-xs text-theme-secondary">
            독서 타이머로 기록을 쌓으면 표시됩니다.
          </p>
        </div>
      )}
    </StatisticsPageShell>
  )
}

function MetricCard({
  icon: Icon,
  iconClass,
  label,
  value,
}: {
  icon: typeof Clock
  iconClass: string
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-theme-tertiary/40 bg-theme-secondary p-4 text-center">
      <Icon className={`mx-auto mb-2 h-6 w-6 ${iconClass}`} aria-hidden />
      <p className="text-[11px] text-theme-secondary">{label}</p>
      <p className="mt-1 text-base font-bold text-theme-primary sm:text-lg">
        {value}
      </p>
    </div>
  )
}

function DetailCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-theme-tertiary/40 bg-theme-secondary p-4">
      <h3 className="mb-3 text-sm font-semibold text-theme-primary">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-theme-secondary">{label}</span>
      <span className="font-medium text-theme-primary">{value}</span>
    </div>
  )
}
