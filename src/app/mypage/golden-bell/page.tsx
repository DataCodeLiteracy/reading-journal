"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { GenericRouteSkeleton } from "@/components/skeletons"
import { ArrowLeft, Trophy, BookOpen, Calendar, TrendingUp } from "lucide-react"
import { GoldenBellService } from "@/services/goldenBellService"
import { GoldenBellResultSummary } from "@/types/goldenBell"
import { useAuth } from "@/contexts/AuthContext"
import BottomNavigation from "@/components/BottomNavigation"

export default function GoldenBellResultsPage() {
  const router = useRouter()
  const { userUid, loading: authLoading } = useAuth()

  const [results, setResults] = useState<GoldenBellResultSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!userUid) {
      router.push("/login")
      return
    }

    const loadResults = async () => {
      try {
        setIsLoading(true)
        const data = await GoldenBellService.getUserResultSummaries(userUid)
        setResults(data)
      } catch (error) {
        console.error("Error loading results:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadResults()
  }, [userUid, authLoading, router])

  const totalQuizzes = results.length
  const averageScore = totalQuizzes > 0
    ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / totalQuizzes)
    : 0
  const perfectScores = results.filter((r) => r.score === 100).length
  const uniqueBooks = new Set(results.map((r) => r.bookTitle)).size

  const formatDate = (date: Date | string) => {
    const d = date instanceof Date ? date : new Date(date)
    return d.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  if (authLoading || isLoading) {
    return (
      <>
        <span className="sr-only">불러오는 중</span>
        <GenericRouteSkeleton rows={5} />
      </>
    )
  }

  return (
    <div className='min-h-screen bg-theme-gradient pb-24'>
      <div className='container mx-auto px-4 py-4'>
        {/* 헤더 */}
        <div className='flex items-center gap-4 mb-6'>
          <button
            onClick={() => router.back()}
            className='p-2 rounded-full bg-theme-secondary shadow-sm hover:shadow-md transition-shadow'
          >
            <ArrowLeft className='h-5 w-5 text-theme-secondary' />
          </button>
          <h1 className='text-lg font-semibold text-theme-primary'>
            🔔 독서 골든벨 기록
          </h1>
        </div>

        {/* 통계 요약 */}
        <div className='grid grid-cols-2 gap-3 mb-6'>
          <div className='bg-theme-secondary rounded-lg shadow-sm border-card p-4'>
            <div className='flex items-center gap-2 mb-2'>
              <div className='p-2 rounded-lg bg-accent-theme/10'>
                <Trophy className='h-4 w-4 text-accent-theme' />
              </div>
              <span className='text-xs text-theme-tertiary'>평균 점수</span>
            </div>
            <p className='text-2xl font-bold text-theme-primary'>{averageScore}점</p>
          </div>

          <div className='bg-theme-secondary rounded-lg shadow-sm border-card p-4'>
            <div className='flex items-center gap-2 mb-2'>
              <div className='p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30'>
                <TrendingUp className='h-4 w-4 text-yellow-600 dark:text-yellow-400' />
              </div>
              <span className='text-xs text-theme-tertiary'>만점</span>
            </div>
            <p className='text-2xl font-bold text-theme-primary'>{perfectScores}회</p>
          </div>

          <div className='bg-theme-secondary rounded-lg shadow-sm border-card p-4'>
            <div className='flex items-center gap-2 mb-2'>
              <div className='p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30'>
                <Calendar className='h-4 w-4 text-blue-600 dark:text-blue-400' />
              </div>
              <span className='text-xs text-theme-tertiary'>총 응시</span>
            </div>
            <p className='text-2xl font-bold text-theme-primary'>{totalQuizzes}회</p>
          </div>

          <div className='bg-theme-secondary rounded-lg shadow-sm border-card p-4'>
            <div className='flex items-center gap-2 mb-2'>
              <div className='p-2 rounded-lg bg-green-100 dark:bg-green-900/30'>
                <BookOpen className='h-4 w-4 text-green-600 dark:text-green-400' />
              </div>
              <span className='text-xs text-theme-tertiary'>응시 책</span>
            </div>
            <p className='text-2xl font-bold text-theme-primary'>{uniqueBooks}권</p>
          </div>
        </div>

        {/* 결과 목록 */}
        <div className='bg-theme-secondary rounded-lg shadow-sm border-card'>
          <div className='p-4 border-b border-theme-tertiary'>
            <h2 className='font-semibold text-theme-primary'>풀이 기록</h2>
          </div>

          {results.length === 0 ? (
            <div className='p-8 text-center'>
              <div className='text-4xl mb-4'>📝</div>
              <p className='text-theme-secondary mb-2'>
                아직 풀이 기록이 없습니다.
              </p>
              <p className='text-sm text-theme-tertiary'>
                책 상세페이지에서 골든벨 문제를 풀어보세요!
              </p>
            </div>
          ) : (
            <div className='divide-y divide-theme-tertiary'>
              {results.map((result) => (
                <div
                  key={result.id}
                  onClick={() => router.push(`/mypage/golden-bell/${result.id}`)}
                  className='p-4 cursor-pointer hover:bg-theme-tertiary/30 transition-colors'
                >
                  <div className='flex items-start justify-between mb-2'>
                    <div className='flex-1 min-w-0'>
                      <h3 className='font-medium text-theme-primary truncate'>
                        {result.bookTitle}
                      </h3>
                      <div className='flex items-center gap-2 mt-1'>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded ${
                            result.difficulty === "easy"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                          }`}
                        >
                          {result.difficulty === "easy" ? "쉬움" : "어려움"}
                        </span>
                        <span className='text-xs text-theme-tertiary'>
                          {formatDate(result.completedAt)}
                        </span>
                      </div>
                    </div>
                    <div className='text-right ml-4'>
                      <p
                        className={`text-xl font-bold ${
                          result.score >= 80
                            ? "text-green-600 dark:text-green-400"
                            : result.score >= 60
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {result.score}점
                      </p>
                      <p className='text-xs text-theme-tertiary'>
                        {result.correctCount}/{result.totalQuestions} 정답
                      </p>
                    </div>
                  </div>

                  {/* 점수 바 */}
                  <div className='h-2 w-full overflow-hidden rounded-full bg-theme-tertiary'>
                    <div
                      className={`h-full rounded-full transition-all ${
                        result.score >= 80
                          ? "bg-green-500"
                          : result.score >= 60
                            ? "bg-blue-500"
                            : "bg-red-500"
                      }`}
                      style={{ width: `${result.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNavigation />
    </div>
  )
}
