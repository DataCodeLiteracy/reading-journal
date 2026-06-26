"use client"

import { Suspense, useEffect, useState, useCallback, useRef, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { BookService } from "@/services/bookService"
import { ReadingContentPackService } from "@/services/readingContentPackService"
import { ReadingExamProgressService } from "@/services/readingExamProgressService"
import type { Book } from "@/types/book"
import type { ReadingContentPack, ReadingExamProgress } from "@/types/readingContent"
import { normalizeBookTitleKey } from "@/utils/bookTitleKey"
import { nextExamCoords, prevExamCoords } from "@/utils/readingExamNav"
import { gradeReadingExam } from "@/lib/readingAiClient"
import { GenericRouteSkeleton, MinimalShellFallback } from "@/components/skeletons"
import { BookSubpageHeader } from "@/components/BookSubpageHeader"

const MAX_AI_GRADES_PER_QUESTION = 3

function ReadingExamQuestionContent({
  params,
}: {
  params: Promise<{ id: string; user_id: string; rangeIndex: string; qIndex: string }>
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { userUid } = useAuth()
  const [resolved, setResolved] = useState<{
    id: string
    user_id: string
    rangeIndex: number
    qIndex: number
  } | null>(null)

  const [book, setBook] = useState<Book | null>(null)
  const [pack, setPack] = useState<ReadingContentPack | null>(null)
  const [progress, setProgress] = useState<ReadingExamProgress | null>(null)
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(true)
  const [grading, setGrading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const draftSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    params.then((p) => {
      const ri = parseInt(p.rangeIndex, 10)
      const qi = parseInt(p.qIndex, 10)
      if (Number.isNaN(ri) || Number.isNaN(qi)) {
        setResolved(null)
        return
      }
      setResolved({
        id: p.id,
        user_id: p.user_id,
        rangeIndex: ri,
        qIndex: qi,
      })
    })
  }, [params])

  const reloadProgress = useCallback(async () => {
    if (!resolved || !userUid) return
    const pr = await ReadingExamProgressService.get(userUid, resolved.id)
    setProgress(pr)
  }, [resolved, userUid])

  useEffect(() => {
    if (!resolved || !userUid) return
    ;(async () => {
      try {
        setLoading(true)
        const b = await BookService.getBook(resolved.id)
        if (!b) return
        setBook(b)
        const p = await ReadingContentPackService.getForBook(b)
        setPack(p)
        const pr = await ReadingExamProgressService.get(userUid, resolved.id)
        setProgress(pr)
        const blocks = p?.examAssessmentData
        const item = blocks?.[resolved.rangeIndex]?.quizzes?.[resolved.qIndex]
        if (item) {
          const drafts = (pr?.draftAnswers ?? {}) as Record<string, string>
          const draft = drafts[String(item.question_number)] ?? ""
          setText(draft)
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [resolved, userUid])

  useEffect(() => {
    if (!resolved || !pack?.examAssessmentData || !userUid || !book) return
    const item = pack.examAssessmentData[resolved.rangeIndex]?.quizzes?.[resolved.qIndex]
    if (!item) return
    const qn = item.question_number
    if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current)
    draftSaveTimer.current = setTimeout(() => {
      const titleKey = normalizeBookTitleKey(book.title)
      void ReadingExamProgressService.upsert(userUid, resolved.id, titleKey, {
        currentRangeIndex: resolved.rangeIndex,
        currentQuizIndex: resolved.qIndex,
        draftAnswers: { [qn]: text },
      })
    }, 800)
    return () => {
      if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current)
    }
  }, [text, resolved, pack, userUid, book, progress?.grades, progress?.draftAnswers])

  const querySuffix = useMemo(() => {
    const s = searchParams.toString()
    return s ? `?${s}` : ""
  }, [searchParams])

  if (!resolved || loading) {
    return <GenericRouteSkeleton rows={4} />
  }

  const blocks = pack?.examAssessmentData
  if (!book || !blocks?.length) {
    return (
      <div className="min-h-screen bg-theme-gradient p-6 text-theme-secondary text-center">
        데이터를 불러올 수 없습니다.
      </div>
    )
  }

  const item = blocks[resolved.rangeIndex]?.quizzes?.[resolved.qIndex]
  const bookBase = `/book/${resolved.id}/${resolved.user_id}`
  const hubListPath = `${bookBase}/reading-exam${querySuffix}`

  if (!item) {
    return (
      <div className="min-h-screen bg-theme-gradient p-6">
        <button
          type="button"
          onClick={() => router.push(hubListPath)}
          className="text-theme-secondary underline"
        >
          목록
        </button>
        <p className="mt-4 text-theme-secondary">문항을 찾을 수 없습니다.</p>
      </div>
    )
  }

  const qn = item.question_number
  const gm = (progress?.grades ?? {}) as Record<
    string,
    | {
        score: number
        feedback: string
        gradedAt?: string
        attemptsUsed?: number
        lastGradedAnswer?: string
      }
    | undefined
  >
  const graded = gm[String(qn)]
  const attemptsUsed = graded?.attemptsUsed ?? (graded ? 1 : 0)
  const drafts = (progress?.draftAnswers ?? {}) as Record<string, string>
  const lastSnap =
    (graded?.lastGradedAnswer ?? "").trim() ||
    (graded ? (drafts[String(qn)] ?? "").trim() : "")
  const remainingGrades = Math.max(0, MAX_AI_GRADES_PER_QUESTION - attemptsUsed)
  const trimmed = text.trim()
  const titleKey = normalizeBookTitleKey(book.title)

  const prev = prevExamCoords(blocks, resolved.rangeIndex, resolved.qIndex)
  const next = nextExamCoords(blocks, resolved.rangeIndex, resolved.qIndex)

  const path = (ri: number, qi: number) =>
    `${bookBase}/reading-exam/${ri}/${qi}${querySuffix}`

  const handleGrade = async () => {
    if (!userUid) return
    const ans = text.trim()
    if (!ans) {
      setError("답안을 입력해 주세요.")
      return
    }
    if (graded) {
      if (attemptsUsed >= MAX_AI_GRADES_PER_QUESTION) {
        setError("이 문항은 AI 채점을 3회 모두 사용했습니다.")
        return
      }
      if (ans === lastSnap) {
        setError("답안 내용을 바꾼 뒤에만 다시 채점할 수 있습니다.")
        return
      }
    }
    setError(null)
    setGrading(true)
    try {
      const { score, feedback } = await gradeReadingExam({
        bookTitle: book.title,
        question: item.question,
        answerKey: item.answer_key,
        scoringFocus: item.scoring_focus ?? [],
        userAnswer: ans,
      })
      const nextAttempts = attemptsUsed + 1
      await ReadingExamProgressService.setGrade(userUid, resolved.id, titleKey, qn, {
        score,
        feedback,
        gradedAt: new Date().toISOString(),
        attemptsUsed: nextAttempts,
        lastGradedAnswer: ans,
      })
      await ReadingExamProgressService.upsert(userUid, resolved.id, titleKey, {
        draftAnswers: { [qn]: ans },
      })
      await reloadProgress()
    } catch (e) {
      setError(e instanceof Error ? e.message : "채점 실패")
    } finally {
      setGrading(false)
    }
  }

  return (
    <div className="min-h-screen bg-theme-gradient pb-24">
      <div className="container mx-auto px-4 py-4 max-w-2xl">
        <BookSubpageHeader
          pageTitle="이해도 점검"
          contextTitle={`${book.title} · ${blocks[resolved.rangeIndex]?.range} · ${qn}번`}
          fallbackPath={hubListPath}
        />

        <p className="text-xs font-medium text-accent-theme mb-2">
          이 문항 AI 채점: {remainingGrades}회 남음 (최대 {MAX_AI_GRADES_PER_QUESTION}회)
        </p>
        <h2 className="text-lg font-semibold text-theme-primary mb-4 whitespace-pre-wrap">
          {item.question}
        </h2>

        {graded ? (
          <div className="rounded-lg border border-theme-tertiary bg-theme-secondary p-4 mb-4">
            <p className="text-sm text-theme-secondary">
              채점 완료 · {attemptsUsed}/{MAX_AI_GRADES_PER_QUESTION}회 사용
            </p>
            <p className="text-2xl font-bold text-accent-theme mt-2">{graded.score}점 / 10</p>
            <p className="text-sm text-theme-primary mt-2 whitespace-pre-wrap">{graded.feedback}</p>
            <p className="mt-3 text-sm text-theme-secondary whitespace-pre-wrap">
              마지막 제출 답안: {lastSnap || "(없음)"}
            </p>
            {next && (
              <button
                type="button"
                onClick={() => router.push(path(next.rangeIndex, next.qIndex))}
                className="mt-4 w-full py-3 rounded-lg border border-accent-theme/40 bg-accent-theme/10 text-accent-theme font-medium hover:bg-accent-theme/20"
              >
                다음 문항으로
              </button>
            )}
          </div>
        ) : null}

        <label className="block text-sm font-medium text-theme-primary mb-2">답안 작성</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full min-h-[160px] border border-theme-tertiary rounded-lg p-3 bg-theme-primary text-theme-primary mb-2"
          placeholder="답안을 서술해 주세요."
        />
        <p className="text-xs text-theme-tertiary mb-3">입력 내용은 자동 저장됩니다.</p>
        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
        {graded && attemptsUsed >= MAX_AI_GRADES_PER_QUESTION ? (
          <p className="text-sm text-theme-secondary mb-2">
            이 문항은 AI 채점을 모두 사용했습니다. 답안은 계속 수정·저장할 수 있습니다.
          </p>
        ) : null}
        {graded && attemptsUsed < MAX_AI_GRADES_PER_QUESTION && trimmed === lastSnap ? (
          <p className="text-sm text-theme-secondary mb-2">
            답안을 수정하면 AI로 다시 채점할 수 있습니다. (남은 {remainingGrades}회)
          </p>
        ) : null}
        <button
          type="button"
          disabled={
            grading ||
            !trimmed ||
            (Boolean(graded) &&
              (attemptsUsed >= MAX_AI_GRADES_PER_QUESTION || trimmed === lastSnap))
          }
          onClick={handleGrade}
          className="w-full py-3 rounded-lg bg-accent-theme text-white font-medium disabled:opacity-50"
        >
          {grading
            ? "채점 중…"
            : graded
              ? `AI 다시 채점 (${remainingGrades}회 남음)`
              : "제출 및 AI 채점"}
        </button>

        <div className="flex gap-2 mt-6">
          <button
            type="button"
            disabled={!prev}
            onClick={() =>
              prev && router.push(path(prev.rangeIndex, prev.qIndex))
            }
            className="flex-1 flex items-center justify-center gap-1 py-3 border border-theme-tertiary rounded-lg disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> 이전
          </button>
          <button
            type="button"
            disabled={!next}
            onClick={() =>
              next && router.push(path(next.rangeIndex, next.qIndex))
            }
            className="flex-1 flex items-center justify-center gap-1 py-3 border border-theme-tertiary rounded-lg disabled:opacity-40"
          >
            다음 <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ReadingExamQuestionPage(props: {
  params: Promise<{ id: string; user_id: string; rangeIndex: string; qIndex: string }>
}) {
  return (
    <Suspense fallback={<MinimalShellFallback />}>
      <ReadingExamQuestionContent {...props} />
    </Suspense>
  )
}
