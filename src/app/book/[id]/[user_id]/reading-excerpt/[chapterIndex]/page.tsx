"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Trash2 } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { BookService } from "@/services/bookService"
import { ReadingContentPackService } from "@/services/readingContentPackService"
import { ReadingExcerptProgressService } from "@/services/readingExcerptProgressService"
import type { Book } from "@/types/book"
import type { ReadingContentPack, ReadingExcerptChapterResult } from "@/types/readingContent"
import { normalizeBookTitleKey } from "@/utils/bookTitleKey"
import { gradeReadingExcerpt } from "@/lib/readingAiClient"
import { GenericRouteSkeleton } from "@/components/skeletons"
import { BookSubpageHeader } from "@/components/BookSubpageHeader"
import { sortBookTocEntries } from "@/utils/bookToc"

const MAX_AI_GRADES_PER_CHAPTER = 3

function ChapterKeywordReveal({ keywords }: { keywords: string[] }) {
  const [open, setOpen] = useState(false)
  if (keywords.length === 0) return null
  if (open) {
    return (
      <div className="mb-4 flex flex-wrap gap-1.5 rounded-lg border border-theme-tertiary bg-theme-secondary p-3">
        {keywords.map((k) => (
          <span
            key={k}
            className="rounded-full bg-theme-tertiary/80 px-2.5 py-1 text-xs font-medium text-theme-primary"
          >
            {k}
          </span>
        ))}
      </div>
    )
  }
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="mb-4 w-full rounded-lg border border-dashed border-theme-tertiary bg-gradient-to-b from-theme-tertiary/60 to-theme-tertiary/30 px-4 py-5 text-center text-sm text-theme-secondary shadow-inner transition hover:border-accent-theme/40 hover:from-theme-tertiary/80"
    >
      <span className="block select-none blur-[6px]" aria-hidden>
        키워드 힌트
      </span>
      <span className="mt-2 block text-xs font-medium text-accent-theme">
        탭하면 이 챕터 키워드 힌트가 나옵니다
      </span>
    </button>
  )
}

function ReadingExcerptChapterContent({
  params,
}: {
  params: Promise<{ id: string; user_id: string; chapterIndex: string }>
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
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
  const [savingDraft, setSavingDraft] = useState(false)
  const [draftSaved, setDraftSaved] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const querySuffix = useMemo(() => {
    const s = searchParams.toString()
    return s ? `?${s}` : ""
  }, [searchParams])

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

  const bookBase = `/book/${resolved.id}/${resolved.user_id}`
  const hubListPath = `${bookBase}/reading-excerpt${querySuffix}`

  if (!book) {
    return (
      <div className="min-h-screen bg-theme-gradient p-6">
        <p className="text-theme-secondary">
          챕터를 찾을 수 없습니다.{" "}
          <button
            type="button"
            className="text-accent-theme underline"
            onClick={() => router.push(hubListPath)}
          >
            목록
          </button>
        </p>
      </div>
    )
  }

  const jsonCh = pack?.excerptChapterSummaries?.[resolved.chapterIndex]
  const sortedTocEntries = sortBookTocEntries(book.tocOutline ?? [])
  const tocCh = sortedTocEntries[resolved.chapterIndex]

  // JSON도 TOC도 없으면 챕터 없음
  if (!jsonCh && !tocCh) {
    return (
      <div className="min-h-screen bg-theme-gradient p-6">
        <p className="text-theme-secondary">
          챕터를 찾을 수 없습니다.{" "}
          <button
            type="button"
            className="text-accent-theme underline"
            onClick={() => router.push(hubListPath)}
          >
            목록
          </button>
        </p>
      </div>
    )
  }

  const chapterTitle = jsonCh?.title ?? tocCh?.title ?? ""
  const jsonChapters = pack?.excerptChapterSummaries ?? []
  const totalChapters = jsonChapters.length || sortedTocEntries.length
  const hasNextChapter = resolved.chapterIndex + 1 < totalChapters

  // TOC 전용 모드 (JSON 없음)
  if (!jsonCh) {
    const handleDeleteDraft = async () => {
      if (!userUid || !result) return
      setDeleting(true)
      setError(null)
      try {
        await ReadingExcerptProgressService.deleteChapterDraft(userUid, resolved.id, resolved.chapterIndex)
        setResult(null)
        setText("")
        setDraftSaved(false)
      } catch (e) {
        setError(e instanceof Error ? e.message : "삭제 실패")
      } finally {
        setDeleting(false)
      }
    }

    const handleSaveDraft = async () => {
      if (!userUid) return
      const trimmed = text.trim()
      if (!trimmed) {
        setError("내용을 입력해 주세요.")
        return
      }
      setError(null)
      setSavingDraft(true)
      setDraftSaved(false)
      try {
        const titleKey = normalizeBookTitleKey(book.title)
        const row: ReadingExcerptChapterResult = {
          userText: trimmed,
        }
        await ReadingExcerptProgressService.upsert(userUid, resolved.id, titleKey, {
          currentChapterIndex: resolved.chapterIndex,
          chapters: { [resolved.chapterIndex]: row },
        })
        setResult(row)
        setText(trimmed)
        setDraftSaved(true)
      } catch (e) {
        setError(e instanceof Error ? e.message : "저장 실패")
      } finally {
        setSavingDraft(false)
      }
    }

    const trimmed = text.trim()

    return (
      <div className="min-h-screen bg-theme-gradient pb-24">
        <div className="container mx-auto px-4 py-4 max-w-2xl">
          <BookSubpageHeader
            pageTitle={chapterTitle}
            contextTitle={book.title}
            fallbackPath={hubListPath}
          />

          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 p-3 text-xs text-blue-700 dark:text-blue-300">
            발췌 요약 JSON이 아직 등록되지 않았습니다. 지금 작성한 내용은 저장되며, JSON 등록 후
            AI 채점을 진행할 수 있습니다.
          </div>

          {result?.userText && result.score == null ? (
            <div className="mb-4 rounded-lg border border-theme-tertiary bg-theme-secondary p-3 text-sm">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-theme-tertiary">저장된 사전 답안</p>
                <button
                  type="button"
                  onClick={() => void handleDeleteDraft()}
                  disabled={deleting}
                  className="flex items-center gap-1 text-xs text-theme-tertiary hover:text-red-600 disabled:opacity-50"
                  aria-label="사전 답안 삭제"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  삭제
                </button>
              </div>
              <p className="whitespace-pre-wrap text-theme-primary">{result.userText}</p>
            </div>
          ) : null}

          <label className="block text-sm font-medium text-theme-primary mb-2">
            나만의 요약 작성 (사전 답안)
          </label>
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setDraftSaved(false)
            }}
            className="w-full min-h-[180px] border border-theme-tertiary rounded-lg p-3 bg-theme-primary text-theme-primary"
            placeholder="이 챕터에 대한 나의 요약을 미리 작성해 두세요…"
          />
          {draftSaved && (
            <p className="text-sm text-green-600 dark:text-green-400 mt-2">저장되었습니다.</p>
          )}
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
          <button
            type="button"
            disabled={savingDraft || !trimmed}
            onClick={() => void handleSaveDraft()}
            className="mt-4 w-full py-3 rounded-lg bg-accent-theme text-white font-medium disabled:opacity-50"
          >
            {savingDraft ? "저장 중…" : "사전 답안 저장"}
          </button>
          {hasNextChapter && (
            <button
              type="button"
              onClick={() =>
                router.push(
                  `${bookBase}/reading-excerpt/${resolved.chapterIndex + 1}${querySuffix}`,
                )
              }
              className="mt-3 w-full py-3 rounded-lg border border-accent-theme/40 bg-accent-theme/10 text-accent-theme font-medium hover:bg-accent-theme/20"
            >
              다음 챕터로
            </button>
          )}
        </div>
      </div>
    )
  }

  // JSON 있는 일반 채점 모드
  const ch = jsonCh
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
        chapterTitle: ch.title,
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
        <BookSubpageHeader
          pageTitle={ch.title}
          contextTitle={book.title}
          fallbackPath={hubListPath}
        />

        <p className="text-xs font-medium text-accent-theme mb-2">
          이 챕터 AI 채점: {remainingGrades}회 남음 (최대 {MAX_AI_GRADES_PER_CHAPTER}회)
        </p>

        <ChapterKeywordReveal keywords={ch.key_keywords ?? []} />

        <div className="rounded-lg border border-theme-tertiary bg-theme-tertiary/30 p-3 mb-4 text-sm text-theme-secondary max-h-40 overflow-y-auto">
          <p className="text-xs font-medium text-theme-tertiary mb-1">참고 요약 (채점 기준)</p>
          <p className="whitespace-pre-wrap">{ch.summary}</p>
        </div>

        {result && result.score != null ? (
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
                    `${bookBase}/reading-excerpt/${resolved.chapterIndex + 1}${querySuffix}`,
                  )
                }
                className="mt-4 w-full py-3 rounded-lg border border-accent-theme/40 bg-accent-theme/10 text-accent-theme font-medium hover:bg-accent-theme/20"
              >
                다음 챕터로
              </button>
            )}
          </div>
        ) : result?.userText ? (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 p-3 text-xs text-blue-700 dark:text-blue-300">
            저장된 사전 답안이 있습니다. 아래에서 수정 후 AI 채점을 진행하세요.
          </div>
        ) : null}

        <label className="block text-sm font-medium text-theme-primary mb-2">나만의 요약 작성</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full min-h-[180px] border border-theme-tertiary rounded-lg p-3 bg-theme-primary text-theme-primary"
        />
        {result && result.score != null && attemptsUsed >= MAX_AI_GRADES_PER_CHAPTER ? (
          <p className="text-sm text-theme-secondary mt-2">
            AI 채점을 모두 사용했습니다. 요약은 계속 수정할 수 있습니다.
          </p>
        ) : null}
        {result && result.score != null && attemptsUsed < MAX_AI_GRADES_PER_CHAPTER && trimmed === lastSnap ? (
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
            (result?.score != null &&
              (attemptsUsed >= MAX_AI_GRADES_PER_CHAPTER || trimmed === lastSnap))
          }
          onClick={handleSubmit}
          className="mt-4 w-full py-3 rounded-lg bg-accent-theme text-white font-medium disabled:opacity-50"
        >
          {submitting
            ? "채점 중…"
            : result?.score != null
              ? `AI 다시 채점 (${remainingGrades}회 남음)`
              : "제출 및 AI 채점"}
        </button>
      </div>
    </div>
  )
}

export default function ReadingExcerptChapterPage(props: {
  params: Promise<{ id: string; user_id: string; chapterIndex: string }>
}) {
  return (
    <Suspense fallback={<GenericRouteSkeleton rows={4} />}>
      <ReadingExcerptChapterContent {...props} />
    </Suspense>
  )
}
