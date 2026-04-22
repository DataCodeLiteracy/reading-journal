"use client"

import { Suspense, useEffect, useState, useMemo, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { BookMarked, Play, Save, Plus, Trash2 } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { BookService } from "@/services/bookService"
import { ReadingContentPackService } from "@/services/readingContentPackService"
import { ReadingExcerptProgressService } from "@/services/readingExcerptProgressService"
import type { Book } from "@/types/book"
import type { ReadingContentPack, ReadingExcerptProgress } from "@/types/readingContent"
import { labelForAverageScore } from "@/utils/readingScoreBands"
import { GenericRouteSkeleton } from "@/components/skeletons"
import { normalizeBookTitleKey } from "@/utils/bookTitleKey"
import { BookSubpageHeader } from "@/components/BookSubpageHeader"
import { withReturnQuery } from "@/utils/navigateBack"
import {
  getPostCompleteReadingStage,
  setPostCompleteReadingStage,
} from "@/utils/postCompleteReadingFlow"

function introStorageKey(bookId: string) {
  return `readingExcerptStarted:${bookId}`
}

function ReadingExcerptHubContent({
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
  const [progress, setProgress] = useState<ReadingExcerptProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [started, setStarted] = useState(false)
  const [overallDraft, setOverallDraft] = useState("")
  const [coreDraft, setCoreDraft] = useState("")
  const [savingOverall, setSavingOverall] = useState(false)
  const [savingCore, setSavingCore] = useState(false)
  const [hubError, setHubError] = useState<string | null>(null)
  const [referenceOverallRevealed, setReferenceOverallRevealed] = useState(false)
  const overallSectionRef = useRef<HTMLDivElement>(null)

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
        const pr = await ReadingExcerptProgressService.get(userUid, resolved.id)
        setProgress(pr)
        setOverallDraft(pr?.overallSummaryUserText ?? "")
      } finally {
        setLoading(false)
      }
    })()
  }, [resolved, userUid])

  useEffect(() => {
    if (searchParams.get("focus") !== "overall") return
    setStarted(true)
    if (resolved?.id) {
      try {
        sessionStorage.setItem(introStorageKey(resolved.id), "1")
      } catch {
        /* ignore */
      }
    }
    const t = window.setTimeout(() => {
      overallSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 300)
    return () => window.clearTimeout(t)
  }, [searchParams, resolved?.id])

  const chapters = pack?.excerptChapterSummaries ?? []

  const querySuffix = useMemo(() => {
    const s = searchParams.toString()
    return s ? `?${s}` : ""
  }, [searchParams])

  const bookBase = resolved
    ? `/book/${resolved.id}/${resolved.user_id}`
    : ""

  useEffect(() => {
    if (!resolved || !chapters.length || !progress?.chapters) return
    const cmap = progress.chapters as Record<string, { score?: number }>
    let done = 0
    for (let i = 0; i < chapters.length; i++) {
      if (cmap[String(i)]?.score != null) done++
    }
    if (done > 0) {
      setStarted(true)
      try {
        sessionStorage.setItem(introStorageKey(resolved.id), "1")
      } catch {
        /* ignore */
      }
    }
  }, [resolved?.id, pack?.excerptChapterSummaries, progress?.chapters])

  /** 발췌 자료가 없어도 완독 직후에는 구절 단계로 안내 */
  useEffect(() => {
    if (!resolved || !book || loading) return
    if (chapters.length > 0) return
    if (book.status !== "completed") return
    if (getPostCompleteReadingStage(resolved.id) !== "excerpt") return
    setPostCompleteReadingStage(resolved.id, "quotes")
    router.replace(
      withReturnQuery(`${bookBase}/quotes?postCompleteFlow=1`, bookBase),
    )
  }, [resolved, book, loading, chapters.length, router, bookBase])

  const avg = useMemo(() => {
    const ch = progress?.chapters
    if (!ch || !chapters.length) return 0
    let s = 0
    let n = 0
    for (let i = 0; i < chapters.length; i++) {
      const r = ch[i] ?? (ch as Record<string, { score?: number }>)[String(i)]
      if (r?.score != null) {
        s += r.score
        n += 1
      }
    }
    return n ? s / n : 0
  }, [progress?.chapters, chapters])

  const doneCount = useMemo(() => {
    const ch = progress?.chapters
    if (!ch) return 0
    let c = 0
    for (let i = 0; i < chapters.length; i++) {
      const r = ch[i] ?? (ch as Record<string, unknown>)[String(i)]
      if (r && typeof r === "object" && "score" in r) c += 1
    }
    return c
  }, [progress?.chapters, chapters])

  const handleStart = () => {
    if (!resolved) return
    try {
      sessionStorage.setItem(introStorageKey(resolved.id), "1")
    } catch {
      /* ignore */
    }
    setStarted(true)
  }

  const refreshProgress = async () => {
    if (!resolved || !userUid) return
    const pr = await ReadingExcerptProgressService.get(userUid, resolved.id)
    setProgress(pr)
    setOverallDraft(pr?.overallSummaryUserText ?? "")
  }

  const saveOverall = async () => {
    if (!resolved || !userUid || !book) return
    setSavingOverall(true)
    setHubError(null)
    try {
      const titleKey = normalizeBookTitleKey(book.title)
      await ReadingExcerptProgressService.upsert(userUid, resolved.id, titleKey, {
        overallSummaryUserText: overallDraft.trim(),
      })
      await refreshProgress()
    } catch (e) {
      setHubError(e instanceof Error ? e.message : "저장하지 못했습니다.")
    } finally {
      setSavingOverall(false)
    }
  }

  const addCoreMessage = async () => {
    const line = coreDraft.trim()
    if (!resolved || !userUid || !book || !line) return
    setSavingCore(true)
    setHubError(null)
    try {
      const titleKey = normalizeBookTitleKey(book.title)
      const next = [...(progress?.coreMessages ?? []), line]
      await ReadingExcerptProgressService.upsert(userUid, resolved.id, titleKey, {
        coreMessages: next,
      })
      setCoreDraft("")
      await refreshProgress()

      if (
        book.status === "completed" &&
        getPostCompleteReadingStage(resolved.id) === "excerpt" &&
        next.length >= 1
      ) {
        setPostCompleteReadingStage(resolved.id, "quotes")
        const shelf = `/book/${resolved.id}/${resolved.user_id}`
        router.push(
          withReturnQuery(`${shelf}/quotes?postCompleteFlow=1`, shelf),
        )
      }
    } catch (e) {
      setHubError(e instanceof Error ? e.message : "저장하지 못했습니다.")
    } finally {
      setSavingCore(false)
    }
  }

  const removeCoreAt = async (index: number) => {
    if (!resolved || !userUid || !book) return
    setSavingCore(true)
    setHubError(null)
    try {
      const titleKey = normalizeBookTitleKey(book.title)
      const next = (progress?.coreMessages ?? []).filter((_, i) => i !== index)
      await ReadingExcerptProgressService.upsert(userUid, resolved.id, titleKey, {
        coreMessages: next,
      })
      await refreshProgress()
    } catch (e) {
      setHubError(e instanceof Error ? e.message : "저장하지 못했습니다.")
    } finally {
      setSavingCore(false)
    }
  }

  if (loading || !resolved) return <GenericRouteSkeleton rows={4} />

  if (!book) {
    return <div className="p-6 text-theme-secondary">책을 찾을 수 없습니다.</div>
  }

  if (!chapters.length) {
    return (
      <div className="min-h-screen bg-theme-gradient pb-24">
        <div className="container mx-auto max-w-2xl px-4 py-4">
          <BookSubpageHeader
            pageTitle="발췌 요약"
            contextTitle={book.title}
            fallbackPath={bookBase}
            leading={
              <BookMarked className="h-6 w-6 text-accent-theme" aria-hidden />
            }
          />
          <p className="text-theme-secondary">
            이 책 제목으로 등록된 발췌 요약이 없습니다.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-theme-gradient pb-24">
      <div className="container mx-auto px-4 py-4 max-w-2xl">
        <BookSubpageHeader
          pageTitle="발췌 요약"
          contextTitle={book.title}
          fallbackPath={bookBase}
          leading={
            <BookMarked className="h-6 w-6 text-accent-theme" aria-hidden />
          }
        />

        {!started ? (
          <div className="rounded-lg border border-theme-tertiary bg-theme-secondary p-5 shadow-sm mt-4">
            <h2 className="text-sm font-semibold text-theme-primary mb-3">안내</h2>
            <ul className="text-sm text-theme-secondary space-y-2 list-disc pl-5 mb-5">
              <li>
                같은 책 제목(정규화 키)을 쓰는 모든 독자에게 동일한 챕터 자료가 보입니다.
                작성·채점 기록은 내 책에만 저장됩니다.
              </li>
              <li>
                각 챕터에서 참고 요약을 읽고 나만의 요약을 작성하면 AI가 10점 만점과 한 줄
                피드백을 남깁니다.
              </li>
              <li>챕터당 제출·채점은 한 번만 가능합니다.</li>
              <li>
                시작 후에는 책 전체 요약·핵심 메시지를 적을 수 있고, 책 상세의「핵심」에서
                키워드와 함께 모아 볼 수 있습니다.
              </li>
            </ul>
            {pack?.excerptBookMetadata?.overall_summary && (
              <p className="text-xs text-theme-tertiary mb-4">
                JSON에 등록된 참고용 전체 요약은 처음에는 가려 두었다가, 탭하면 볼 수 있습니다.
                리뷰 AI 채점에도 활용됩니다.
              </p>
            )}
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
            <div
              ref={overallSectionRef}
              id="overall-summary"
              className="mt-4 space-y-4"
            >
              {hubError && (
                <p className="text-sm text-red-600 dark:text-red-400">{hubError}</p>
              )}
              <div className="rounded-lg border border-theme-tertiary bg-theme-secondary p-4 shadow-sm">
                {pack?.excerptBookMetadata?.overall_summary ? (
                  <div className="mb-5 pb-5 border-b border-theme-tertiary/50">
                    <p className="mb-2 text-xs font-medium text-theme-tertiary">
                      참고용 전체 요약 (등록본)
                    </p>
                    <div className="relative overflow-hidden">
                      <p
                        className={`whitespace-pre-wrap text-sm text-theme-secondary transition-[filter,opacity] duration-200 ${
                          referenceOverallRevealed
                            ? "max-h-[28rem] overflow-y-auto"
                            : "pointer-events-none max-h-32 blur-md opacity-55 select-none"
                        }`}
                        aria-hidden={!referenceOverallRevealed}
                      >
                        {pack.excerptBookMetadata.overall_summary}
                      </p>
                      {!referenceOverallRevealed ? (
                        <button
                          type="button"
                          onClick={() => setReferenceOverallRevealed(true)}
                          className="absolute inset-0 z-[1] flex cursor-pointer items-center justify-center bg-theme-secondary/70 px-3 py-10 text-center text-sm font-medium text-theme-primary backdrop-blur-sm transition-colors hover:bg-theme-secondary/85"
                        >
                          탭하여 참고용 전체 요약 보기
                        </button>
                      ) : null}
                    </div>
                    {referenceOverallRevealed ? (
                      <button
                        type="button"
                        onClick={() => setReferenceOverallRevealed(false)}
                        className="mt-2 text-xs text-theme-tertiary underline hover:text-theme-secondary"
                      >
                        다시 가리기
                      </button>
                    ) : null}
                  </div>
                ) : null}
                <h2 className="mb-2 text-sm font-semibold text-theme-primary">
                  나의 전체 요약
                </h2>
                <p className="mb-2 text-xs text-theme-tertiary">
                  책 전체를 한 번에 짚는 메모입니다. 챕터별 AI 채점과는 별도로 저장됩니다.
                </p>
                <textarea
                  value={overallDraft}
                  onChange={(e) => setOverallDraft(e.target.value)}
                  className="w-full min-h-[120px] rounded-lg border border-theme-tertiary bg-theme-primary p-3 text-sm text-theme-primary"
                  placeholder="이 책 전체를 돌아보며 적는 요약…"
                />
                <button
                  type="button"
                  onClick={() => void saveOverall()}
                  disabled={savingOverall}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-accent-theme px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-theme-secondary disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {savingOverall ? "저장 중…" : "전체 요약 저장"}
                </button>
              </div>
              <div className="rounded-lg border border-theme-tertiary bg-theme-secondary p-4 shadow-sm">
                <h2 className="mb-2 text-sm font-semibold text-theme-primary">핵심 메시지</h2>
                <p className="mb-3 text-xs text-theme-tertiary">
                  한 문장 또는 두 문장씩 여러 개를 추가할 수 있습니다. 책 상세「핵심」에서
                  모아서 볼 수 있어요.
                </p>
                <ul className="mb-3 space-y-2">
                  {(progress?.coreMessages ?? []).map((line, i) => (
                    <li
                      key={`${i}-${line.slice(0, 20)}`}
                      className="flex gap-2 rounded-md bg-theme-tertiary/40 px-3 py-2 text-sm text-theme-primary"
                    >
                      <span className="min-w-0 flex-1 whitespace-pre-wrap">{line}</span>
                      <button
                        type="button"
                        onClick={() => void removeCoreAt(i)}
                        disabled={savingCore}
                        className="shrink-0 text-theme-tertiary hover:text-red-600 disabled:opacity-50"
                        aria-label={`${i + 1}번 메시지 삭제`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    value={coreDraft}
                    onChange={(e) => setCoreDraft(e.target.value)}
                    className="form-control min-w-0 flex-1"
                    placeholder="새 핵심 메시지 (한 줄)"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        void addCoreMessage()
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => void addCoreMessage()}
                    disabled={savingCore || !coreDraft.trim()}
                    className="inline-flex shrink-0 items-center justify-center gap-1 rounded-lg border border-accent-theme/50 bg-accent-theme/10 px-4 py-2 text-sm font-medium text-accent-theme disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                    추가
                  </button>
                </div>
              </div>
            </div>

            {doneCount > 0 && (
              <div className="mb-4 rounded-lg border border-theme-tertiary bg-theme-secondary p-4 text-sm mt-4">
                <p className="text-theme-primary font-medium">
                  제출 완료 {doneCount} / {chapters.length}챕터 · 평균 {avg.toFixed(1)}점 / 10
                </p>
                <p className="text-theme-secondary mt-1">{labelForAverageScore(avg)}</p>
              </div>
            )}

            <h2 className="mb-2 mt-6 text-sm font-semibold text-theme-primary">챕터별 요약</h2>
            <ul className="space-y-2 mt-2">
              {chapters.map((ch, i) => {
                const r =
                  progress?.chapters?.[i] ??
                  (progress?.chapters as Record<string, unknown> | undefined)?.[String(i)] as
                    | { score: number }
                    | undefined
                const done = r != null && typeof (r as { score?: number }).score === "number"
                return (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/book/${resolved.id}/${resolved.user_id}/reading-excerpt/${i}${querySuffix}`,
                        )
                      }
                      className="w-full text-left rounded-lg border border-theme-tertiary bg-theme-secondary p-4 hover:border-accent-theme"
                    >
                      <div className="flex justify-between gap-2">
                        <span className="text-sm font-medium text-theme-primary">
                          {i + 1}. {ch.chapter_title}
                        </span>
                        <span
                          className={`text-xs shrink-0 px-2 py-0.5 rounded ${
                            done ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {done ? `${(r as { score: number }).score}점` : "미제출"}
                        </span>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}

export default function ReadingExcerptHubPage(props: {
  params: Promise<{ id: string; user_id: string }>
}) {
  return (
    <Suspense fallback={<GenericRouteSkeleton rows={4} />}>
      <ReadingExcerptHubContent {...props} />
    </Suspense>
  )
}
