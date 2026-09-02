"use client"

import { useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  BookOpen,
  Calendar,
  Clock,
  BarChart3,
  Library,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useData } from "@/contexts/DataContext"
import StatisticsHubCard from "@/components/statistics/StatisticsHubCard"
import StatisticsPageShell from "@/components/statistics/StatisticsPageShell"
import { StatisticsHubPageSkeleton } from "@/components/skeletons"
import { getBookStatisticsSnapshot } from "@/utils/bookPeriodStatistics"

export default function StatisticsHubPage() {
  const router = useRouter()
  const { loading, isLoggedIn } = useAuth()
  const { allBooks, userStatistics, isLoading } = useData()

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push("/login")
    }
  }, [isLoggedIn, loading, router])

  const bookSnapshot = useMemo(
    () => getBookStatisticsSnapshot(allBooks),
    [allBooks],
  )

  if (loading) {
    return <StatisticsHubPageSkeleton />
  }

  if (!isLoggedIn) {
    return null
  }

  const totalHours = userStatistics
    ? Math.floor(userStatistics.totalReadingTime / 3600)
    : 0

  return (
    <StatisticsPageShell
      title="독서 통계"
      description="책·시간·패턴을 나눠서 자세히 살펴보세요."
      backHref="/mypage"
      backLabel="마이페이지"
    >
      {isLoading ? (
        <p className="text-sm text-theme-secondary">불러오는 중…</p>
      ) : (
        <div className="space-y-6">
          <section className="rounded-xl border border-theme-tertiary/40 bg-theme-secondary/80 p-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-theme-tertiary">
              한눈에 보기
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <QuickStat label="지금 읽는 중" value={bookSnapshot.readingNowCount} />
              <QuickStat
                label="이번 달 완독"
                value={bookSnapshot.completedThisMonth}
              />
              <QuickStat
                label="이번 달 등록"
                value={bookSnapshot.registeredThisMonth}
              />
              <QuickStat label="누적 완독" value={bookSnapshot.completedAllCount} />
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold text-theme-primary">
              상세 통계
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <StatisticsHubCard
                title="책 통계"
                description="주·월·분기·반기·연별로 등록·완독·읽는 중인 책을 확인합니다."
                icon={Library}
                iconClassName="text-emerald-600 dark:text-emerald-400"
                stats={[
                  {
                    label: "이번 달 완독",
                    value: bookSnapshot.completedThisMonth,
                  },
                  {
                    label: "읽는 중",
                    value: bookSnapshot.readingNowCount,
                  },
                  {
                    label: "읽고 싶은",
                    value: bookSnapshot.wantToReadCount,
                  },
                ]}
                onClick={() => router.push("/mypage/statistics/books")}
              />

              <StatisticsHubCard
                title="독서 시간"
                description="총 독서 시간, 세션 수, 연속 독서일 등 시간 관련 지표입니다."
                icon={Clock}
                stats={
                  userStatistics
                    ? [
                        { label: "총 시간", value: `${totalHours}h` },
                        {
                          label: "세션",
                          value: userStatistics.totalSessions,
                        },
                        {
                          label: "연속",
                          value: `${userStatistics.readingStreak}일`,
                        },
                      ]
                    : undefined
                }
                onClick={() => router.push("/mypage/statistics/reading-time")}
              />

              <StatisticsHubCard
                title="일별 기록"
                description="날짜별 독서 시간과 세션 목록을 확인합니다."
                icon={Calendar}
                onClick={() => router.push("/mypage/statistics/daily")}
              />

              <StatisticsHubCard
                title="시간대 패턴"
                description="요일·시간대별 독서 습관을 분석합니다."
                icon={BarChart3}
                onClick={() => router.push("/mypage/statistics/time-pattern")}
              />
            </div>
          </section>

          <p className="flex items-center gap-2 text-xs text-theme-tertiary">
            <BookOpen className="h-3.5 w-3.5" aria-hidden />
            책 통계는 서재 등록일·완독일·읽기 시작일 기준입니다.
          </p>
        </div>
      )}
    </StatisticsPageShell>
  )
}

function QuickStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-theme-tertiary/30 px-3 py-2.5">
      <p className="text-[10px] font-medium text-theme-tertiary">{label}</p>
      <p className="text-xl font-bold tabular-nums text-theme-primary">
        {value}
      </p>
    </div>
  )
}
