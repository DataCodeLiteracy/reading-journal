"use client"

import { Suspense, useEffect, useState, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ClipboardCheck, Play } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { BookService } from "@/services/bookService"
import { ReadingContentPackService } from "@/services/readingContentPackService"
import { ReadingExamProgressService } from "@/services/readingExamProgressService"
import type { Book } from "@/types/book"
import type { ReadingContentPack, ReadingExamProgress } from "@/types/readingContent"
import {
  gradedExamCount,
  totalExamQuestionCount,
} from "@/utils/readingExamNav"
import { labelForAverageScore } from "@/utils/readingScoreBands"
import { GenericRouteSkeleton } from "@/components/skeletons"
import { BookSubpageHeader } from "@/components/BookSubpageHeader"

function introStorageKey(bookId: string) {
  return `readingExamStarted:${bookId}`
}

function ReadingExamHubContent({
  params,
}: {
  params: Promise<{ id: string; user_id: string }>
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { userUid } = useAuth()
  const [resolved, setResolved] = useState<{ id: string; user_id: string } | null>(null)
  const [book, setBook] = useState<Book | null>(null)
  const [pack, setPack] = useState<ReadingContentPack | null>(null)
  const [progress, setProgress] = useState<ReadingExamProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState(0)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    params.then(setResolved)
  }, [params])

  useEffect(() => {
    if (!resolved) return
    try {
      if (typeof window !== "undefined" && sessionStorage.getItem(introStorageKey(resolved.id)) === "1") {
        setStarted(true)
      }
    } catch {
      /* ignore */
    }
  }, [resolved])

  useEffect(() => {
    if (!resolved || !userUid) return
    ;(async () => {
      try {
        setLoading(true)
        const b = await BookService.getBook(resolved.id)
        if (!b) return
        setBook(b)
        const p = await ReadingContentPackService.getByBookTitle(b.title)
        setPack(p)
        const pr = await ReadingExamProgressService.get(userUid, resolved.id)
        setProgress(pr)
        if (pr && p?.examAssessmentData?.length) {
          const ri = Math.min(pr.currentRangeIndex, p.examAssessmentData.length - 1)
          setTab(Math.max(0, ri))
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [resolved, userUid])

  const blocks = pack?.examAssessmentData

  useEffect(() => {
    if (!resolved || !blocks?.length || !progress) return
    const drafts = (progress.draftAnswers ?? {}) as Record<string, string>
    const g = gradedExamCount(progress.grades, blocks)
    if (g > 0 || Object.keys(drafts).length > 0) {
      setStarted(true)
      try {
        sessionStorage.setItem(introStorageKey(resolved.id), "1")
      } catch {
        /* ignore */
      }
    }
  }, [resolved?.id, pack?.examAssessmentData, progress])
  const total = useMemo(() => totalExamQuestionCount(blocks), [blocks])
  const graded = useMemo(
    () => gradedExamCount(progress?.grades, blocks),
    [progress?.grades, blocks]
  )

  const gradeMap = (progress?.grades ?? {}) as Record<
    string,
    { score: number } | undefined
  >

  const querySuffix = useMemo(() => {
    const s = searchParams.toString()
    return s ? `?${s}` : ""
  }, [searchParams])

  const avg =
    graded > 0 && blocks
      ? (() => {
          let s = 0
          let n = 0
          for (const b of blocks) {
            for (const q of b.quizzes ?? []) {
              const g = gradeMap[String(q.question_number)]
              if (g?.score != null) {
                s += g.score
                n += 1
              }
            }
          }
          return n ? s / n : 0
        })()
      : 0

  const handleStart = () => {
    if (!resolved) return
    try {
      sessionStorage.setItem(introStorageKey(resolved.id), "1")
    } catch {
      /* ignore */
    }
    setStarted(true)
  }

  if (loading || !resolved) {
    return <GenericRouteSkeleton rows={4} />
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-theme-gradient p-6 text-center text-theme-secondary">
        책을 찾을 수 없습니다.
      </div>
    )
  }

  const bookBase = `/book/${resolved.id}/${resolved.user_id}`

  if (!blocks?.length) {
    return (
      <div className="min-h-screen bg-theme-gradient pb-24">
        <div className="container mx-auto max-w-2xl px-4 py-4">
          <BookSubpageHeader
            pageTitle="이해도 점검"
            contextTitle={book.title}
            fallbackPath={bookBase}
            leading={
              <ClipboardCheck className="h-6 w-6 text-accent-theme" aria-hidden />
            }
          />
          <p className="text-theme-secondary">
            이 책 제목으로 등록된 이해도 점검이 없습니다.
          </p>
        </div>
      </div>
    )
  }

  const currentBlock = blocks[tab]
  const href = (qi: number) =>
    `${bookBase}/reading-exam/${tab}/${qi}${querySuffix}`

  return (
    <div className="min-h-screen bg-theme-gradient pb-24">
      <div className="container mx-auto px-4 py-4 max-w-2xl">
        <BookSubpageHeader
          pageTitle="이해도 점검"
          contextTitle={book.title}
          fallbackPath={bookBase}
          leading={
            <ClipboardCheck className="h-6 w-6 text-accent-theme" aria-hidden />
          }
        />

        {!started ? (
          <div className="rounded-lg border border-theme-tertiary bg-theme-secondary p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-theme-primary mb-3">안내</h2>
            <ul className="text-sm text-theme-secondary space-y-2 list-disc pl-5 mb-5">
              <li>
                같은 책 제목(띄어쓰기를 제거한 정규화 키)을 쓰는 모든 독자에게 동일한
                문제가 열립니다. 풀이·채점 기록은 내 책에만 저장됩니다.
              </li>
              <li>
                아래에서 페이지 구간을 고른 뒤, 문항을 한 개씩 풀어 나갑니다. 입력한
                답안은 잠시 후 자동으로 저장됩니다.
              </li>
              <li>각 문항은 AI 채점을 한 번만 받을 수 있습니다.</li>
            </ul>
            <button
              type="button"
              onClick={handleStart}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-accent-theme text-white font-medium hover:bg-accent-theme-secondary transition-colors"
            >
              <Play className="h-5 w-5" />
              시작하기
            </button>
          </div>
        ) : (
          <>
            {graded > 0 && (
              <div className="mb-4 rounded-lg border border-theme-tertiary bg-theme-secondary p-4 text-sm">
                <p className="text-theme-primary font-medium">
                  채점 완료 {graded} / {total}문항 · 평균 {avg.toFixed(1)}점 / 10
                </p>
                <p className="text-theme-secondary mt-1">{labelForAverageScore(avg)}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2 mb-4">
              {blocks.map((b, i) => (
                <button
                  key={b.range}
                  type="button"
                  onClick={() => setTab(i)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    tab === i
                      ? "bg-accent-theme text-white"
                      : "bg-theme-tertiary text-theme-secondary"
                  }`}
                >
                  {b.range}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {(currentBlock?.quizzes ?? []).map((q, qi) => {
                const row = gradeMap[String(q.question_number)]
                const done = !!row
                return (
                  <button
                    key={q.question_number}
                    type="button"
                    onClick={() => router.push(href(qi))}
                    className="w-full text-left rounded-lg border border-theme-tertiary bg-theme-secondary p-4 hover:border-accent-theme transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-theme-primary">
                        {q.question_number}. {q.question.slice(0, 80)}
                        {q.question.length > 80 ? "…" : ""}
                      </span>
                      <span
                        className={`text-xs shrink-0 px-2 py-0.5 rounded ${
                          done
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {done && row ? `${row.score}점` : "미채점"}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function ReadingExamHubPage(props: {
  params: Promise<{ id: string; user_id: string }>
}) {
  return (
    <Suspense fallback={<GenericRouteSkeleton rows={4} />}>
      <ReadingExamHubContent {...props} />
    </Suspense>
  )
}
