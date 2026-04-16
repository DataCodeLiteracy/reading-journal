"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { BookService } from "@/services/bookService"
import { ReadingContentPackService } from "@/services/readingContentPackService"
import { ReadingExcerptProgressService } from "@/services/readingExcerptProgressService"
import type { Book } from "@/types/book"
import type { ReadingContentPack, ReadingExcerptChapterResult } from "@/types/readingContent"
import { normalizeBookTitleKey } from "@/utils/bookTitleKey"
import { gradeReadingExcerpt } from "@/lib/readingAiClient"
import { GenericRouteSkeleton } from "@/components/skeletons"

const MAX_AI_GRADES_PER_CHAPTER = 3

export default function ReadingExcerptChapterPage({
  params,
}: {
  params: Promise<{ id: string; user_id: string; chapterIndex: string }>
}) {
  const router = useRouter()
  const { userUid } = useAuth()
  const [resolved, setResolved] = useState<{
    id: string
    user_id: string
    chapterIndex: number
  } | null>(null)
  const [book, setBook] = useState<Book | null>(null)
  const [pack, setPack] = useState<ReadingContentPack | null>(null)
  const [result, setResult] = useState<ReadingExcerptChapterResult | null>(null)
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    params.then((p) => {
      const ci = parseInt(p.chapterIndex, 10)
      if (Number.isNaN(ci)) {
        setResolved(null)
        return
      }
      setResolved({ id: p.id, user_id: p.user_id, chapterIndex: ci })
    })
  }, [params])

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
        const pr = await ReadingExcerptProgressService.get(userUid, resolved.id)
        const ch = p?.excerptChapterSummaries?.[resolved.chapterIndex]
        if (!ch) return
        const saved =
          pr?.chapters?.[resolved.chapterIndex] ??
          (pr?.chapters as Record<string, ReadingExcerptChapterResult> | undefined)?.[
            String(resolved.chapterIndex)
          ]
        if (saved) {
          setResult(saved)
          setText(saved.userText)
        } else {
          setResult(null)
          setText("")
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [resolved, userUid])

  if (!resolved || loading) return <GenericRouteSkeleton rows={4} />

  const ch = pack?.excerptChapterSummaries?.[resolved.chapterIndex]
  if (!book || !ch) {
    return (
      <div className="p-6 text-theme-secondary">
        챕터를 찾을 수 없습니다.{" "}
        <button
          type="button"
          className="text-accent-theme"
          onClick={() =>
            router.push(`/book/${resolved.id}/${resolved.user_id}/reading-excerpt`)
          }
        >
          목록
        </button>
      </div>
    )
  }

  const chapters = pack?.excerptChapterSummaries ?? []
  const hasNextChapter = resolved.chapterIndex + 1 < chapters.length

  const attemptsUsed = result?.attemptsUsed ?? (result ? 1 : 0)
  const lastSnap =
    (result?.lastGradedUserText ?? "").trim() ||
    (result ? (result.userText ?? "").trim() : "")
  const remainingGrades = Math.max(0, MAX_AI_GRADES_PER_CHAPTER - attemptsUsed)
  const trimmed = text.trim()

  const handleSubmit = async () => {
    if (!userUid) return
    if (!trimmed) {
      setError("요약을 입력해 주세요.")
      return
    }
    if (result) {
      if (attemptsUsed >= MAX_AI_GRADES_PER_CHAPTER) {
        setError("이 챕터는 AI 채점을 3회 모두 사용했습니다.")
        return
      }
      if (trimmed === lastSnap) {
        setError("요약 내용을 바꾼 뒤에만 다시 채점할 수 있습니다.")
        return
      }
    }
    setError(null)
    setSubmitting(true)
    try {
      const { score, feedback } = await gradeReadingExcerpt({
        bookTitle: book.title,
        chapterTitle: ch.chapter_title,
        referenceSummary: ch.summary,
        keyKeywords: ch.key_keywords ?? [],
        userSummary: trimmed,
      })
      const nextAttempts = attemptsUsed + 1
      const row: ReadingExcerptChapterResult = {
        userText: trimmed,
        score,
        feedback,
        gradedAt: new Date().toISOString(),
        attemptsUsed: nextAttempts,
        lastGradedUserText: trimmed,
      }
      const titleKey = normalizeBookTitleKey(book.title)
      await ReadingExcerptProgressService.upsert(userUid, resolved.id, titleKey, {
        currentChapterIndex: resolved.chapterIndex,
        chapters: { [resolved.chapterIndex]: row },
      })
      setResult(row)
      setText(trimmed)
    } catch (e) {
      setError(e instanceof Error ? e.message : "제출 실패")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-theme-gradient pb-24">
      <div className="container mx-auto px-4 py-4 max-w-2xl">
        <button
          type="button"
          onClick={() =>
            router.push(`/book/${resolved.id}/${resolved.user_id}/reading-excerpt`)
          }
          className="mb-4 inline-flex items-center gap-2 text-sm text-theme-secondary"
        >
          <ArrowLeft className="h-4 w-4" /> 챕터 목록
        </button>

        <h1 className="text-lg font-semibold text-theme-primary mb-2">{ch.chapter_title}</h1>
        <p className="text-xs font-medium text-accent-theme mb-2">
          이 챕터 AI 채점: {remainingGrades}회 남음 (최대 {MAX_AI_GRADES_PER_CHAPTER}회)
        </p>
        <p className="text-xs text-theme-tertiary mb-4">
          참고 키워드: {(ch.key_keywords ?? []).join(", ")}
        </p>

        <div className="rounded-lg border border-theme-tertiary bg-theme-tertiary/30 p-3 mb-4 text-sm text-theme-secondary max-h-40 overflow-y-auto">
          <p className="text-xs font-medium text-theme-tertiary mb-1">참고 요약 (채점 기준)</p>
          <p className="whitespace-pre-wrap">{ch.summary}</p>
        </div>

        {result ? (
          <div className="rounded-lg border border-theme-tertiary bg-theme-secondary p-4 mb-4">
            <p className="text-sm text-theme-secondary">
              채점 완료 · {attemptsUsed}/{MAX_AI_GRADES_PER_CHAPTER}회 사용
            </p>
            <p className="text-2xl font-bold text-accent-theme mt-2">{result.score}점 / 10</p>
            <p className="text-sm text-theme-primary mt-2 whitespace-pre-wrap">{result.feedback}</p>
            <p className="mt-3 text-sm text-theme-secondary whitespace-pre-wrap">
              마지막 제출 요약: {lastSnap || "(없음)"}
            </p>
            {hasNextChapter && (
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/book/${resolved.id}/${resolved.user_id}/reading-excerpt/${resolved.chapterIndex + 1}`
                  )
                }
                className="mt-4 w-full py-3 rounded-lg border border-accent-theme/40 bg-accent-theme/10 text-accent-theme font-medium hover:bg-accent-theme/20"
              >
                다음 챕터로
              </button>
            )}
          </div>
        ) : null}

        <label className="block text-sm font-medium text-theme-primary mb-2">나만의 요약 작성</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full min-h-[180px] border border-theme-tertiary rounded-lg p-3 bg-theme-primary text-theme-primary"
        />
        {result && attemptsUsed >= MAX_AI_GRADES_PER_CHAPTER ? (
          <p className="text-sm text-theme-secondary mt-2">
            AI 채점을 모두 사용했습니다. 요약은 계속 수정할 수 있습니다.
          </p>
        ) : null}
        {result && attemptsUsed < MAX_AI_GRADES_PER_CHAPTER && trimmed === lastSnap ? (
          <p className="text-sm text-theme-secondary mt-2">
            요약을 수정하면 AI로 다시 채점할 수 있습니다. (남은 {remainingGrades}회)
          </p>
        ) : null}
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        <button
          type="button"
          disabled={
            submitting ||
            !trimmed ||
            (Boolean(result) &&
              (attemptsUsed >= MAX_AI_GRADES_PER_CHAPTER || trimmed === lastSnap))
          }
          onClick={handleSubmit}
          className="mt-4 w-full py-3 rounded-lg bg-accent-theme text-white font-medium disabled:opacity-50"
        >
          {submitting
            ? "채점 중…"
            : result
              ? `AI 다시 채점 (${remainingGrades}회 남음)`
              : "제출 및 AI 채점"}
        </button>
      </div>
    </div>
  )
}
