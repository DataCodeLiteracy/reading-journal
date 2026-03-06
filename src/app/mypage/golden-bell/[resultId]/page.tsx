"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Trophy,
  CheckCircle,
  XCircle,
  Calendar,
  BookOpen,
} from "lucide-react"
import { GoldenBellService } from "@/services/goldenBellService"
import { GoldenBellResult, GoldenBellQuiz } from "@/types/goldenBell"
import { useAuth } from "@/contexts/AuthContext"
import BottomNavigation from "@/components/BottomNavigation"

export default function GoldenBellResultDetailPage({
  params,
}: {
  params: Promise<{ resultId: string }>
}) {
  const router = useRouter()
  const { userUid, loading: authLoading } = useAuth()

  const [resolvedParams, setResolvedParams] = useState<{ resultId: string } | null>(null)
  const [result, setResult] = useState<GoldenBellResult | null>(null)
  const [quiz, setQuiz] = useState<GoldenBellQuiz | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    params.then((resolved) => {
      setResolvedParams(resolved)
    })
  }, [params])

  useEffect(() => {
    if (authLoading) return
    if (!userUid) {
      router.push("/login")
      return
    }

    if (!resolvedParams) return

    const loadData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const resultData = await GoldenBellService.getResult(resolvedParams.resultId)
        if (!resultData) {
          setError("결과를 찾을 수 없습니다.")
          return
        }

        // 본인의 결과만 볼 수 있음
        if (resultData.userId !== userUid) {
          setError("접근 권한이 없습니다.")
          return
        }

        setResult(resultData)

        // 퀴즈 정보도 로드 (문제 내용 표시용)
        const quizData = await GoldenBellService.getQuizById(resultData.quizId)
        setQuiz(quizData)
      } catch (err) {
        console.error("Error loading result:", err)
        setError("결과를 불러오는 중 오류가 발생했습니다.")
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [userUid, authLoading, resolvedParams, router])

  const formatDate = (date: Date | string) => {
    const d = date instanceof Date ? date : new Date(date)
    return d.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (authLoading || isLoading) {
    return (
      <div className='min-h-screen bg-theme-gradient flex items-center justify-center'>
        <div className='text-center'>
          <div className='text-4xl mb-4'>🔔</div>
          <p className='text-theme-secondary'>불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error || !result) {
    return (
      <div className='min-h-screen bg-theme-gradient flex items-center justify-center'>
        <div className='text-center'>
          <div className='text-4xl mb-4'>😢</div>
          <p className='text-theme-secondary mb-4'>{error || "결과를 찾을 수 없습니다."}</p>
          <button
            onClick={() => router.back()}
            className='px-4 py-2 bg-accent-theme text-white rounded-lg'
          >
            돌아가기
          </button>
        </div>
      </div>
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
            🔔 골든벨 결과 상세
          </h1>
        </div>

        {/* 결과 요약 카드 */}
        <div className='bg-theme-secondary rounded-lg shadow-sm p-6 mb-6'>
          <div className='text-center mb-6'>
            <Trophy
              className={`h-16 w-16 mx-auto mb-4 ${
                result.score >= 80
                  ? "text-yellow-500"
                  : result.score >= 60
                    ? "text-blue-500"
                    : "text-gray-400"
              }`}
            />
            <h2 className='text-3xl font-bold text-theme-primary mb-2'>
              {result.score}점
            </h2>
            <p className='text-theme-secondary'>
              {result.totalQuestions}문제 중 {result.correctCount}문제 정답
            </p>
          </div>

          <div className='grid grid-cols-2 gap-4 text-sm'>
            <div className='flex items-center gap-2'>
              <BookOpen className='h-4 w-4 text-theme-tertiary' />
              <span className='text-theme-secondary'>{result.bookTitle}</span>
            </div>
            <div className='flex items-center gap-2'>
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded ${
                  result.difficulty === "easy"
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                }`}
              >
                {result.difficulty === "easy" ? "쉬움" : "어려움"}
              </span>
            </div>
            <div className='flex items-center gap-2 col-span-2'>
              <Calendar className='h-4 w-4 text-theme-tertiary' />
              <span className='text-theme-secondary'>{formatDate(result.completedAt)}</span>
            </div>
          </div>
        </div>

        {/* 문제별 상세 결과 */}
        <div className='bg-theme-secondary rounded-lg shadow-sm overflow-hidden'>
          <div className='p-4 border-b border-theme-tertiary'>
            <h3 className='font-semibold text-theme-primary'>문제별 상세</h3>
          </div>

          <div className='divide-y divide-theme-tertiary'>
            {result.answers.map((answer, idx) => {
              const question = quiz?.questions.find((q) => q.id === answer.questionId)
              const correctAnswerObj = quiz?.answers.find((a) => a.id === answer.questionId)

              return (
                <div key={answer.questionId} className='p-4'>
                  <div className='flex items-start gap-3 mb-3'>
                    {answer.isCorrect ? (
                      <CheckCircle className='h-5 w-5 text-green-500 shrink-0 mt-0.5' />
                    ) : (
                      <XCircle className='h-5 w-5 text-red-500 shrink-0 mt-0.5' />
                    )}
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center gap-2 mb-1'>
                        <span className='text-sm font-medium text-theme-primary'>
                          {idx + 1}번
                        </span>
                        <span
                          className={`px-1.5 py-0.5 text-xs font-medium rounded ${
                            answer.questionType === "객관식"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                              : answer.questionType === "단답형"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                                : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                          }`}
                        >
                          {answer.questionType}
                        </span>
                        {answer.manuallyGraded && (
                          <span className='text-xs text-theme-tertiary'>직접 채점</span>
                        )}
                      </div>
                      <p className='text-theme-primary text-sm mb-3'>
                        {question?.question || `문제 ${answer.questionId}`}
                      </p>
                    </div>
                  </div>

                  {/* 내 답안 */}
                  <div
                    className={`p-3 rounded-lg mb-2 ${
                      answer.isCorrect
                        ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                        : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                    }`}
                  >
                    <p
                      className={`text-xs font-medium mb-1 ${
                        answer.isCorrect
                          ? "text-green-700 dark:text-green-300"
                          : "text-red-700 dark:text-red-300"
                      }`}
                    >
                      내 답안
                    </p>
                    <p
                      className={`text-sm ${
                        answer.isCorrect
                          ? "text-green-800 dark:text-green-200"
                          : "text-red-800 dark:text-red-200"
                      }`}
                    >
                      {answer.userAnswer || "(미입력)"}
                    </p>
                    {answer.questionType === "단답형" && answer.similarity !== undefined && (
                      <p className='text-xs text-theme-tertiary mt-1'>
                        유사도: {Math.round(answer.similarity * 100)}%
                      </p>
                    )}
                  </div>

                  {/* 정답 (틀린 경우만 표시 또는 항상 표시) */}
                  {!answer.isCorrect && (
                    <div className='p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'>
                      <p className='text-xs font-medium text-green-700 dark:text-green-300 mb-1'>
                        정답
                      </p>
                      <p className='text-sm text-green-800 dark:text-green-200'>
                        {answer.correctAnswer}
                      </p>
                    </div>
                  )}

                  {/* 해설 */}
                  {correctAnswerObj?.explanation && (
                    <div className='mt-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'>
                      <p className='text-xs font-medium text-blue-700 dark:text-blue-300 mb-1'>
                        💡 해설
                      </p>
                      <p className='text-sm text-blue-600 dark:text-blue-400'>
                        {correctAnswerObj.explanation}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <BottomNavigation />
    </div>
  )
}
