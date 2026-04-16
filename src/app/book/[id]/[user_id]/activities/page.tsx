"use client"

import { useState, useEffect, useMemo } from "react"
import {
  ArrowLeft,
  Plus,
  ClipboardCheck,
  BookMarked,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { Book } from "@/types/book"
import { BookService } from "@/services/bookService"
import { GoldenBellRequestService } from "@/services/goldenBellRequestService"
import { GoldenBellService } from "@/services/goldenBellService"
import { GoldenBellQuizSummary, GoldenBellResult } from "@/types/goldenBell"
import GoldenBellUploadModal from "@/components/GoldenBellUploadModal"
import ReadingExamUploadModal from "@/components/ReadingExamUploadModal"
import ReadingExcerptUploadModal from "@/components/ReadingExcerptUploadModal"
import { ReadingContentPackService } from "@/services/readingContentPackService"
import type {
  ReadingContentPack,
  ReadingExamProgress,
  ReadingExcerptProgress,
} from "@/types/readingContent"
import { ReadingExamProgressService } from "@/services/readingExamProgressService"
import { ReadingExcerptProgressService } from "@/services/readingExcerptProgressService"
import { gradedExamCount, totalExamQuestionCount } from "@/utils/readingExamNav"
import { useAuth } from "@/contexts/AuthContext"
import { BookDetailRouteSkeleton } from "@/components/skeletons"

export default function BookActivitiesHubPage({
  params,
}: {
  params: Promise<{ id: string; user_id: string }>
}) {
  const router = useRouter()
  const { userUid, user, userData } = useAuth()
  const [resolved, setResolved] = useState<{
    id: string
    user_id: string
  } | null>(null)
  const [book, setBook] = useState<Book | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [goldenBellRequestSent, setGoldenBellRequestSent] = useState(false)
  const [goldenBellRequesting, setGoldenBellRequesting] = useState(false)
  const [goldenBellQuizzes, setGoldenBellQuizzes] = useState<
    GoldenBellQuizSummary[]
  >([])
  const [goldenBellResults, setGoldenBellResults] = useState<
    GoldenBellResult[]
  >([])
  const [isGoldenBellUploadModalOpen, setIsGoldenBellUploadModalOpen] =
    useState(false)
  const [goldenBellReregisterQuiz, setGoldenBellReregisterQuiz] =
    useState<GoldenBellQuizSummary | null>(null)

  const [readingPack, setReadingPack] = useState<ReadingContentPack | null>(
    null
  )
  const [readingExamProgress, setReadingExamProgress] =
    useState<ReadingExamProgress | null>(null)
  const [readingExcerptProgress, setReadingExcerptProgress] =
    useState<ReadingExcerptProgress | null>(null)
  const [readingExamUploadOpen, setReadingExamUploadOpen] = useState(false)
  const [readingExcerptUploadOpen, setReadingExcerptUploadOpen] =
    useState(false)

  const examBlocksMemo = readingPack?.examAssessmentData
  const examQuestionTotal = useMemo(
    () => totalExamQuestionCount(examBlocksMemo),
    [examBlocksMemo]
  )
  const examGradedTotal = useMemo(
    () => gradedExamCount(readingExamProgress?.grades, examBlocksMemo),
    [readingExamProgress?.grades, examBlocksMemo]
  )
  const excerptProgressSummary = useMemo(() => {
    const chapters = readingPack?.excerptChapterSummaries ?? []
    const ch = readingExcerptProgress?.chapters as
      | Record<string, { score?: number }>
      | undefined
    let done = 0
    for (let i = 0; i < chapters.length; i++) {
      if (ch?.[String(i)]?.score != null) done++
    }
    return { done, total: chapters.length }
  }, [readingPack?.excerptChapterSummaries, readingExcerptProgress?.chapters])

  useEffect(() => {
    params.then(setResolved)
  }, [params])

  useEffect(() => {
    if (!resolved) return
    const load = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const bookData = await BookService.getBook(resolved.id)
        if (!bookData) {
          setError("책을 찾을 수 없습니다.")
          return
        }
        setBook(bookData)

        try {
          const quizSummaries =
            await GoldenBellService.getQuizSummariesByBookTitle(bookData.title)
          setGoldenBellQuizzes(quizSummaries)
          if (userUid) {
            const results = await GoldenBellService.getUserResultsByBook(
              userUid,
              bookData.title
            )
            setGoldenBellResults(results)
          } else {
            setGoldenBellResults([])
          }
        } catch (e) {
          console.error(e)
        }

        try {
          const rp = await ReadingContentPackService.getByBookTitle(
            bookData.title
          )
          setReadingPack(rp)
          if (userUid) {
            const [exP, exX] = await Promise.all([
              ReadingExamProgressService.get(userUid, bookData.id),
              ReadingExcerptProgressService.get(userUid, bookData.id),
            ])
            setReadingExamProgress(exP)
            setReadingExcerptProgress(exX)
          } else {
            setReadingExamProgress(null)
            setReadingExcerptProgress(null)
          }
        } catch (e) {
          console.error(e)
          setReadingPack(null)
          setReadingExamProgress(null)
          setReadingExcerptProgress(null)
        }
      } catch (e) {
        console.error(e)
        setError("불러오는 중 오류가 발생했습니다.")
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [resolved, userUid])

  if (isLoading) {
    return <BookDetailRouteSkeleton />
  }

  if (!book || !resolved) {
    return (
      <div className='min-h-screen bg-theme-gradient flex items-center justify-center px-4'>
        <p className='text-theme-secondary'>
          {error || "책을 찾을 수 없습니다."}
        </p>
      </div>
    )
  }

  const base = `/book/${resolved.id}/${resolved.user_id}`

  return (
    <div className='min-h-screen bg-theme-gradient pb-20'>
      <div className='container mx-auto px-4 py-4 max-w-2xl'>
        {error && (
          <div className='mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300'>
            {error}
          </div>
        )}

        <div className='flex items-center gap-3 mb-6'>
          <button
            type='button'
            onClick={() => router.push(base)}
            className='p-2 rounded-full bg-theme-secondary shadow-sm hover:shadow-md transition-shadow'
            aria-label='책으로 돌아가기'
          >
            <ArrowLeft className='h-5 w-5 text-theme-secondary' />
          </button>
          <div className='min-w-0 flex-1'>
            <p className='text-xs text-theme-tertiary uppercase tracking-wide'>
              활동
            </p>
            <h1 className='text-lg font-semibold text-theme-primary truncate'>
              {book.title}
            </h1>
          </div>
        </div>

        <p className='text-sm text-theme-secondary mb-6'>
          골든벨, 이해도 점검, 발췌 요약처럼 문제·채점이 있는 활동입니다.
        </p>

        {userUid && userUid === book.user_id && goldenBellQuizzes.length === 0 && (
          <div className='rounded-xl border border-theme-tertiary bg-theme-secondary p-4 mb-6 shadow-sm'>
            <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
              <p className='text-sm text-theme-secondary'>
                이 책으로 독서 골든벨 문제 출제를 요청할 수 있습니다.
              </p>
              {goldenBellRequestSent ? (
                <span className='text-sm text-green-600 dark:text-green-400 shrink-0 font-medium'>
                  요청됨
                </span>
              ) : (
                <button
                  type='button'
                  disabled={goldenBellRequesting}
                  onClick={async () => {
                    if (!userUid || !book) return
                    setGoldenBellRequesting(true)
                    setError(null)
                    try {
                      await GoldenBellRequestService.create({
                        user_id: userUid,
                        user_display_name: user?.displayName ?? undefined,
                        book_id: resolved.id,
                        book_title: book.title,
                      })
                      setGoldenBellRequestSent(true)
                    } catch (err) {
                      console.error(err)
                      setError("요청을 저장하는 중 오류가 발생했습니다.")
                    } finally {
                      setGoldenBellRequesting(false)
                    }
                  }}
                  className='shrink-0 px-4 py-2 text-sm font-medium rounded-lg bg-accent-theme text-white hover:bg-accent-theme-secondary disabled:opacity-50'
                >
                  {goldenBellRequesting ? "요청 중..." : "골든벨 출제 요청"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* 독서 골든벨 */}
        <div className='bg-theme-secondary rounded-lg shadow-sm p-4 mb-6'>
          <div className='flex items-center justify-between mb-3'>
            <h2 className='text-lg font-semibold text-theme-primary'>
              🔔 독서 골든벨
            </h2>
            {goldenBellQuizzes.length > 0 && (
              <span className='text-sm text-theme-secondary bg-theme-tertiary px-2 py-1 rounded-full'>
                {goldenBellQuizzes.length}개 버전
              </span>
            )}
          </div>

          {goldenBellQuizzes.length === 0 ? (
            <div className='text-center py-6'>
              <div className='text-4xl mb-4'>🔔</div>
              <p className='text-theme-secondary mb-4'>
                아직 골든벨 문제가 없습니다.
                <br />
                <span className='text-sm'>JSON 파일로 문제를 등록해보세요!</span>
              </p>
              {userData?.isAdmin && (
                <button
                  type='button'
                  onClick={() => setIsGoldenBellUploadModalOpen(true)}
                  className='inline-flex items-center gap-2 px-4 py-2 bg-accent-theme hover:bg-accent-theme-secondary text-white rounded-lg transition-colors'
                >
                  <Plus className='h-4 w-4' />
                  <span>골든벨 문제 등록하기</span>
                </button>
              )}
            </div>
          ) : (
            <div className='space-y-3'>
              {goldenBellQuizzes.map((quiz) => (
                <div key={quiz.id} className='bg-theme-tertiary rounded-lg p-4'>
                  <div className='flex items-center justify-between mb-2'>
                    <div className='flex items-center gap-2'>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded ${
                          quiz.difficulty === "easy"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                        }`}
                      >
                        {quiz.difficulty === "easy" ? "😊 쉬움" : "🔥 어려움"}
                      </span>
                    </div>
                    <span className='text-sm font-medium text-theme-primary'>
                      총 {quiz.totalQuestions}문제
                    </span>
                  </div>
                  <div className='flex flex-wrap gap-2 text-xs mb-3'>
                    {quiz.multipleChoiceCount > 0 && (
                      <span className='px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded'>
                        객관식 {quiz.multipleChoiceCount}
                      </span>
                    )}
                    {quiz.shortAnswerCount > 0 && (
                      <span className='px-2 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 rounded'>
                        단답형 {quiz.shortAnswerCount}
                      </span>
                    )}
                    {quiz.essayCount > 0 && (
                      <span className='px-2 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded'>
                        서술형 {quiz.essayCount}
                      </span>
                    )}
                  </div>
                  <div className='flex gap-2'>
                    <button
                      type='button'
                      onClick={() =>
                        router.push(`${base}/golden-bell/${quiz.id}`)
                      }
                      className='flex-1 py-2 px-4 bg-accent-theme hover:bg-accent-theme-secondary text-white text-sm font-medium rounded-lg transition-colors'
                    >
                      문제 풀기
                    </button>
                    {userData?.isAdmin && (
                      <button
                        type='button'
                        onClick={() => {
                          setGoldenBellReregisterQuiz(quiz)
                          setIsGoldenBellUploadModalOpen(true)
                        }}
                        className='py-2 px-3 border border-theme-tertiary text-theme-secondary hover:bg-theme-tertiary rounded-lg text-sm font-medium transition-colors'
                      >
                        재등록
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {userData?.isAdmin && (
                <button
                  type='button'
                  onClick={() => setIsGoldenBellUploadModalOpen(true)}
                  className='w-full flex items-center justify-center gap-2 py-2 px-4 border-2 border-dashed border-theme-tertiary hover:border-accent-theme text-theme-secondary hover:text-accent-theme rounded-lg transition-colors'
                >
                  <Plus className='h-4 w-4' />
                  <span>다른 버전 등록하기</span>
                </button>
              )}
            </div>
          )}

          {goldenBellResults.length > 0 && (
            <div className='mt-4 pt-4 border-t border-theme-tertiary'>
              <h3 className='text-sm font-medium text-theme-primary mb-3'>
                📊 내 풀이 기록
              </h3>
              <div className='space-y-2'>
                {goldenBellResults.slice(0, 5).map((result) => {
                  const completedDate =
                    result.completedAt instanceof Date
                      ? result.completedAt
                      : new Date(result.completedAt)
                  return (
                    <div
                      key={result.id}
                      className='flex items-center justify-between p-3 bg-theme-tertiary/50 rounded-lg'
                    >
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
                        <span className='text-xs text-theme-tertiary'>
                          {completedDate.toLocaleDateString("ko-KR", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      <div className='flex items-center gap-2'>
                        <span className='text-sm text-theme-secondary'>
                          {result.correctCount}/{result.totalQuestions}
                        </span>
                        <span
                          className={`text-sm font-bold ${
                            result.score >= 80
                              ? "text-green-600 dark:text-green-400"
                              : result.score >= 60
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {result.score}점
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* 이해도 점검 */}
        <div className='bg-theme-secondary rounded-lg shadow-sm p-4 mb-6'>
          <div className='flex items-start justify-between gap-3 mb-3'>
            <div className='min-w-0 flex-1'>
              <h2 className='text-lg font-semibold text-theme-primary flex items-center gap-2'>
                <ClipboardCheck className='h-5 w-5 text-accent-theme shrink-0' />
                이해도 점검
              </h2>
              {examBlocksMemo && examBlocksMemo.length > 0 && (
                <div className='mt-2 flex flex-wrap items-center gap-2'>
                  <span className='inline-flex items-center rounded-md bg-accent-theme/15 px-2.5 py-1 text-xs font-semibold text-accent-theme'>
                    구간 {examBlocksMemo.length}개
                  </span>
                  <span className='inline-flex items-center rounded-md bg-theme-tertiary/90 px-2.5 py-1 text-xs font-semibold text-theme-primary'>
                    문항 {examQuestionTotal}개
                  </span>
                  {userUid && (
                    <span className='inline-flex items-center rounded-md bg-theme-tertiary/90 px-2.5 py-1 text-xs font-semibold text-theme-primary'>
                      채점 {examGradedTotal} / {examQuestionTotal}
                    </span>
                  )}
                </div>
              )}
            </div>
            {userData?.isAdmin && (
              <button
                type='button'
                onClick={() => setReadingExamUploadOpen(true)}
                className='shrink-0 rounded-full p-1.5 text-theme-secondary transition-colors hover:bg-theme-tertiary/50 hover:text-accent-theme'
                title='이해도 점검 JSON 등록·갱신'
                aria-label='이해도 점검 JSON 등록·갱신'
              >
                <Plus className='h-4 w-4' />
              </button>
            )}
          </div>

          {!examBlocksMemo || examBlocksMemo.length === 0 ? (
            <div className='rounded-lg border border-dashed border-theme-tertiary bg-theme-tertiary/20 px-4 py-8 text-center'>
              <p className='text-sm text-theme-secondary'>
                아직 이해도 점검 문제가 없습니다.
                <br />
                <span className='text-xs text-theme-tertiary'>
                  {userData?.isAdmin
                    ? "우측 상단 + 버튼으로 JSON을 등록할 수 있습니다."
                    : "문제가 준비되면 이곳에서 시작할 수 있습니다."}
                </span>
              </p>
            </div>
          ) : (
            <div className='rounded-lg border border-theme-tertiary bg-theme-tertiary/25 p-4'>
                <p className='text-sm text-theme-secondary mb-3'>
                  구간별로 한 문항씩 답하고 AI 채점으로 이해도를 점검합니다.
                  {userUid && examGradedTotal > 0 && (
                    <span className='mt-2 block text-sm font-medium text-theme-primary'>
                      내 진행: 채점 완료 {examGradedTotal} / {examQuestionTotal}문항
                    </span>
                  )}
                </p>
                <ul className='mb-4 overflow-hidden rounded-lg border border-theme-tertiary/80 bg-theme-secondary'>
                  {examBlocksMemo.map((b, idx) => {
                    const n = b.quizzes?.length ?? 0
                    return (
                      <li
                        key={`${idx}-${b.range}`}
                        className='flex items-center justify-between gap-3 border-b border-theme-tertiary/60 px-3 py-2.5 last:border-b-0'
                      >
                        <span
                          className='min-w-0 flex-1 text-sm text-theme-primary leading-snug'
                          title={b.range}
                        >
                          {b.range}
                        </span>
                        <span className='shrink-0 rounded-md bg-accent-theme/12 px-2 py-0.5 text-xs font-semibold tabular-nums text-accent-theme'>
                          {n}문항
                        </span>
                      </li>
                    )
                  })}
                </ul>
                <button
                  type='button'
                  onClick={() => router.push(`${base}/reading-exam`)}
                  className='w-full rounded-lg bg-accent-theme py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-theme-secondary'
                >
                  이해도 점검 하기
                </button>
            </div>
          )}
        </div>

        {/* 발췌 요약 */}
        <div className='bg-theme-secondary rounded-lg shadow-sm p-4 mb-6'>
          <div className='flex items-start justify-between gap-3 mb-3'>
            <div className='min-w-0 flex-1'>
              <h2 className='text-lg font-semibold text-theme-primary flex items-center gap-2'>
                <BookMarked className='h-5 w-5 text-accent-theme shrink-0' />
                발췌 요약
              </h2>
              {excerptProgressSummary.total > 0 && (
                <div className='mt-2 flex flex-wrap items-center gap-2'>
                  <span className='inline-flex items-center rounded-md bg-accent-theme/15 px-2.5 py-1 text-xs font-semibold text-accent-theme'>
                    챕터 {excerptProgressSummary.total}개
                  </span>
                  {userUid && (
                    <span className='inline-flex items-center rounded-md bg-theme-tertiary/90 px-2.5 py-1 text-xs font-semibold text-theme-primary'>
                      제출 {excerptProgressSummary.done} / {excerptProgressSummary.total}
                    </span>
                  )}
                </div>
              )}
            </div>
            {userData?.isAdmin && (
              <button
                type='button'
                onClick={() => setReadingExcerptUploadOpen(true)}
                className='shrink-0 rounded-full p-1.5 text-theme-secondary transition-colors hover:bg-theme-tertiary/50 hover:text-accent-theme'
                title='발췌 요약 JSON 등록·갱신'
                aria-label='발췌 요약 JSON 등록·갱신'
              >
                <Plus className='h-4 w-4' />
              </button>
            )}
          </div>

          {excerptProgressSummary.total === 0 ? (
            <div className='rounded-lg border border-dashed border-theme-tertiary bg-theme-tertiary/20 px-4 py-8 text-center'>
              <p className='text-sm text-theme-secondary'>
                아직 발췌 요약 자료가 없습니다.
                <br />
                <span className='text-xs text-theme-tertiary'>
                  {userData?.isAdmin
                    ? "우측 상단 + 버튼으로 JSON을 등록할 수 있습니다."
                    : "자료가 준비되면 이곳에서 시작할 수 있습니다."}
                </span>
              </p>
            </div>
          ) : (
            <div className='rounded-lg border border-theme-tertiary bg-theme-tertiary/25 p-4'>
              <p className='text-sm text-theme-secondary mb-4'>
                챕터별 참고 요약을 보고 나만의 요약을 쓰면 AI가 이해도를 점수로
                피드백합니다.
                {userUid && excerptProgressSummary.done > 0 && (
                  <span className='mt-2 block text-sm font-medium text-theme-primary'>
                    내 진행: 제출 완료 {excerptProgressSummary.done} /{" "}
                    {excerptProgressSummary.total}챕터
                  </span>
                )}
              </p>
              <button
                type='button'
                onClick={() => router.push(`${base}/reading-excerpt`)}
                className='w-full rounded-lg bg-accent-theme py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-theme-secondary'
              >
                발췌 요약 쓰기
              </button>
            </div>
          )}
        </div>

        <GoldenBellUploadModal
          isOpen={isGoldenBellUploadModalOpen}
          onClose={() => {
            setIsGoldenBellUploadModalOpen(false)
            setGoldenBellReregisterQuiz(null)
          }}
          bookTitle={book.title}
          userId={userUid || ""}
          reregisterQuizId={goldenBellReregisterQuiz?.id ?? null}
          reregisterDifficulty={goldenBellReregisterQuiz?.difficulty ?? null}
          onUploadSuccess={async () => {
            setGoldenBellReregisterQuiz(null)
            try {
              const updatedQuizzes =
                await GoldenBellService.getQuizSummariesByBookTitle(book.title)
              setGoldenBellQuizzes(updatedQuizzes)
            } catch (e) {
              console.error(e)
            }
          }}
        />

        <ReadingExamUploadModal
          isOpen={readingExamUploadOpen}
          onClose={() => setReadingExamUploadOpen(false)}
          bookTitle={book.title}
          userId={userUid || ""}
          onSuccess={async () => {
            try {
              const rp = await ReadingContentPackService.getByBookTitle(
                book.title
              )
              setReadingPack(rp)
              if (userUid) {
                const [exP, exX] = await Promise.all([
                  ReadingExamProgressService.get(userUid, book.id),
                  ReadingExcerptProgressService.get(userUid, book.id),
                ])
                setReadingExamProgress(exP)
                setReadingExcerptProgress(exX)
              }
            } catch (e) {
              console.error(e)
            }
          }}
        />
        <ReadingExcerptUploadModal
          isOpen={readingExcerptUploadOpen}
          onClose={() => setReadingExcerptUploadOpen(false)}
          bookTitle={book.title}
          userId={userUid || ""}
          onSuccess={async () => {
            try {
              const rp = await ReadingContentPackService.getByBookTitle(
                book.title
              )
              setReadingPack(rp)
              if (userUid) {
                const [exP, exX] = await Promise.all([
                  ReadingExamProgressService.get(userUid, book.id),
                  ReadingExcerptProgressService.get(userUid, book.id),
                ])
                setReadingExamProgress(exP)
                setReadingExcerptProgress(exX)
              }
            } catch (e) {
              console.error(e)
            }
          }}
        />
      </div>
    </div>
  )
}
