"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { useData } from "@/contexts/DataContext"
import BookPeriodStatisticsPanel from "@/components/statistics/BookPeriodStatisticsPanel"
import StatisticsPageShell from "@/components/statistics/StatisticsPageShell"
import { StatisticsSubPageSkeleton } from "@/components/skeletons"

export default function BookStatisticsPage() {
  const router = useRouter()
  const { loading, isLoggedIn } = useAuth()
  const { allBooks, allReadingSessions, isLoading } = useData()

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push("/login")
    }
  }, [isLoggedIn, loading, router])

  if (loading) {
    return <StatisticsSubPageSkeleton />
  }

  if (!isLoggedIn) {
    return null
  }

  return (
    <StatisticsPageShell
      title="책 통계"
      description="기간별로 등록·완독·읽는 중인 책을 살펴보세요."
    >
      {isLoading ? (
        <p className="text-sm text-theme-secondary">책 목록 불러오는 중…</p>
      ) : allBooks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-theme-tertiary/50 py-12 text-center">
          <p className="text-sm font-medium text-theme-primary">
            등록된 책이 없습니다
          </p>
          <p className="mt-1 text-xs text-theme-secondary">
            서재에 책을 추가하면 통계가 표시됩니다.
          </p>
        </div>
      ) : (
        <BookPeriodStatisticsPanel
          books={allBooks}
          readingSessions={allReadingSessions}
        />
      )}
    </StatisticsPageShell>
  )
}
