"use client"

import { Suspense, useEffect, useState, useMemo, useRef, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { BookMarked, Play, Save, Plus, Trash2, ChevronRight, ChevronDown } from "lucide-react"
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
import { sortBookTocEntries } from "@/utils/bookToc"
import {
  getPostCompleteReadingStage,
  setPostCompleteReadingStage,
} from "@/utils/postCompleteReadingFlow"

function introStorageKey(bookId: string) {
  return `readingExcerptStarted:${bookId}`
}

/** path 기준으로 직계 자식이 있는지 확인 */
function hasDirectChildren(path: string, entries: { path: string }[]): boolean {
  return entries.some((e) => {
    const parts = e.path.split(".")
    return parts.length > 1 && parts.slice(0, -1).join(".") === path
  })
}

/** path의 모든 조상이 expandedPaths에 있는지 확인 */
function isVisible(path: string, expandedPaths: Set<string>): boolean {
  const parts = path.split(".")
  for (let d = 1; d < parts.length; d++) {
    if (!expandedPaths.has(parts.slice(0, d).join("."))) return false
  }
  return true
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
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())
  const overallSectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => { params.then(setResolved) }, [params])

  useEffect(() => {
    if (!resolved) return
    try {
      if (typeof window !== "undefined" && sessionStorage.getItem(introStorageKey(resolved.id)) === "1") {
        setStarted(true)
      }
    } catch { /* ignore */ }
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
      try { sessionStorage.setItem(introStorageKey(resolved.id), "1") } catch { /* ignore */ }
    }
    const t = window.setTimeout(() => {
      overallSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 300)
    return () => window.clearTimeout(t)
  }, [searchParams, resolved?.id])

  const jsonChapters = pack?.excerptChapterSummaries ?? []
  const sortedTocEntries = useMemo(() => sortBookTocEntries(book?.tocOutline ?? []), [book])
  const hasJson = jsonChapters.length > 0
  const isTocMode = !hasJson && sortedTocEntries.length > 0

  // 계층 표시용 공통 엔트리 목록 (JSON path 또는 TOC path 사용)
  const displayEntries = useMemo((): Array<{ path: string; title: string; index: number }> => {
    if (hasJson) {
      return jsonChapters.map((ch, i) => ({
        path: ch.path ?? String(i + 1),
        title: ch.title,
        index: i,
      }))
    }
    return sortedTocEntries.map((e, i) => ({
      path: e.path,
      title: e.title,
      index: i,
    }))
  }, [hasJson, jsonChapters, sortedTocEntries])

  const effectiveCount = displayEntries.length

  const querySuffix = useMemo(() => {
    const s = searchParams.toString()
    return s ? `?${s}` : ""
  }, [searchParams])

  const bookBase = resolved ? `/book/${resolved.id}/${resolved.user_id}` : ""

  const toggleExpanded = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }, [])

  const maxDepth = useMemo(
    () => Math.max(1, ...displayEntries.map((e) => e.path.split(".").length)),
    [displayEntries]
  )

  const expandToDepth = useCallback((targetDepth: number) => {
    if (targetDepth <= 1) { setExpandedPaths(new Set()); return }
    const paths = new Set<string>()
    for (const e of displayEntries) {
      if (e.path.split(".").length < targetDepth) paths.add(e.path)
    }
    setExpandedPaths(paths)
  }, [displayEntries])

  // 자동 시작 감지
  useEffect(() => {
    if (!resolved || !effectiveCount || !progress?.chapters) return
    const cmap = progress.chapters as Record<string, { score?: number; userText?: string }>
    let done = 0
    for (let i = 0; i < effectiveCount; i++) {
      const r = cmap[String(i)]
      if (hasJson ? r?.score != null : r?.userText) done++
    }
    if (done > 0) {
      setStarted(true)
      try { sessionStorage.setItem(introStorageKey(resolved.id), "1") } catch { /* ignore */ }
    }
  }, [resolved?.id, hasJson, effectiveCount, progress?.chapters])

  /** 완독 직후 리디렉션 */
  useEffect(() => {
    if (!resolved || !book || loading) return
    if (hasJson || isTocMode) return
    if (book.status !== "completed") return
    if (getPostCompleteReadingStage(resolved.id) !== "excerpt") return
    setPostCompleteReadingStage(resolved.id, "quotes")
    router.replace(withReturnQuery(`${bookBase}/quotes?postCompleteFlow=1`, bookBase))
  }, [resolved, book, loading, hasJson, isTocMode, router, bookBase])

  const avg = useMemo(() => {
    if (!hasJson) return 0
    const ch = progress?.chapters
    if (!ch || !jsonChapters.length) return 0
    let s = 0, n = 0
    for (let i = 0; i < jsonChapters.length; i++) {
      const r = ch[i] ?? (ch as Record<string, { score?: number }>)[String(i)]
      if (r?.score != null) { s += r.score; n++ }
    }
    return n ? s / n : 0
  }, [hasJson, progress?.chapters, jsonChapters])

  const { doneCount, draftCount } = useMemo(() => {
    const ch = progress?.chapters
    if (!ch) return { doneCount: 0, draftCount: 0 }
    let done = 0, draft = 0
    for (let i = 0; i < effectiveCount; i++) {
      const r = (ch[i] ?? (ch as Record<string, unknown>)[String(i)]) as { score?: number; userText?: string } | undefined
      if (!r) continue
      if (r.score != null) done++
      else if (r.userText) draft++
    }
    return { doneCount: done, draftCount: draft }
  }, [progress?.chapters, effectiveCount])

  const handleStart = () => {
    if (!resolved) return
    try { sessionStorage.setItem(introStorageKey(resolved.id), "1") } catch { /* ignore */ }
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
      await ReadingExcerptProgressService.upsert(userUid, resolved.id, normalizeBookTitleKey(book.title), {
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
      const next = [...(progress?.coreMessages ?? []), line]
      await ReadingExcerptProgressService.upsert(userUid, resolved.id, normalizeBookTitleKey(book.title), {
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
        router.push(withReturnQuery(`${bookBase}/quotes?postCompleteFlow=1`, bookBase))
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
      const next = (progress?.coreMessages ?? []).filter((_, i) => i !== index)
      await ReadingExcerptProgressService.upsert(userUid, resolved.id, normalizeBookTitleKey(book.title), {
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
  if (!book) return <div className="p-6 text-theme-secondary">책을 찾을 수 없습니다.</div>

  if (!hasJson && !isTocMode) {
    return (
      <div className="min-h-screen bg-theme-gradient pb-24">
        <div className="container mx-auto max-w-2xl px-4 py-4">
          <BookSubpageHeader
            pageTitle="발췌 요약"
            contextTitle={book.title}
            fallbackPath={bookBase}
            leading={<BookMarked className="h-6 w-6 text-accent-theme" aria-hidden />}
          />
          <p className="text-theme-secondary">
            이 책 제목으로 등록된 발췺요약이 없습니다.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-theme-gradient pb-24">
      <div className="container mx-auto px-4 py-4 max-w-2xl">
        <BookSubpageHeader
          pageTitle="발췺 요약"
          contextTitle={book.title}
          fallbackPath={bookBase}
          leading={<BookMarked className="h-6 w-6 text-accent-theme" aria-hidden />}
        />

        {!started ? (
          <div className="rounded-lg border border-theme-tertiary bg-theme-secondary p-5 shadow-sm mt-4">
            <h2 className="text-sm font-semibold text-theme-primary mb-3">안내</h2>
            {hasJson ? (
              <ul className="text-sm text-theme-secondary space-y-2 list-disc pl-5 mb-5">
                <li>챕터별 참고 요약을 보고 나만의 요약을 작성하면 AI가 10점 만점과 피드백을 남깁니다.</li>
                <li>챕터당 AI 채점은 최대 3회입니다.</li>
                <li>시작 후에는 책 전체 요약·핵심 메시지도 적을 수 있습니다.</li>
              </ul>
            ) : (
              <ul className="text-sm text-theme-secondary space-y-2 list-disc pl-5 mb-5">
                <li>목차가 등록되어 있습니다. 각 챕터에 나만의 요약을 미리 작성해 두세요.</li>
                <li>발췺 요약 JSON이 등록되면 참고 요약과 AI 채점을 이용할 수 있습니다.</li>
                <li>시작 후에는 책 전체 요약·핵심 메시지도 적을 수 있습니다.</li>
              </ul>
            )}
            {pack?.excerptBookMetadata?.overall_summary && (
              <p className="text-xs text-theme-tertiary mb-4">
                JSON에 등록된 참고용 전체 요약은 처음에는 가려 두었다가, 탭하면 볼 수 있습니다.
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
            <div ref={overallSectionRef} id="overall-summary" className="mt-4 space-y-4">
              {hubError && <p className="text-sm text-red-600 dark:text-red-400">{hubError}</p>}

              {/* 전체 요약 */}
              <div className="rounded-lg border border-theme-tertiary bg-theme-secondary p-4 shadow-sm">
                {pack?.excerptBookMetadata?.overall_summary ? (
                  <div className="mb-5 pb-5 border-b border-theme-tertiary/50">
                    <p className="mb-2 text-xs font-medium text-theme-tertiary">참고용 전체 요약 (등록본)</p>
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
                      {!referenceOverallRevealed && (
                        <button
                          type="button"
                          onClick={() => setReferenceOverallRevealed(true)}
                          className="absolute inset-0 z-[1] flex cursor-pointer items-center justify-center bg-theme-secondary/70 px-3 py-10 text-center text-sm font-medium text-theme-primary backdrop-blur-sm"
                        >
                          탭하여 참고용 전체 요약 보기
                        </button>
                      )}
                    </div>
                    {referenceOverallRevealed && (
                      <button
                        type="button"
                        onClick={() => setReferenceOverallRevealed(false)}
                        className="mt-2 text-xs text-theme-tertiary underline"
                      >
                        다시 가리기
                      </button>
                    )}
                  </div>
                ) : null}
                <h2 className="mb-2 text-sm font-semibold text-theme-primary">나의 전체 요약</h2>
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
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-accent-theme px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {savingOverall ? "저장 중…" : "전체 요약 저장"}
                </button>
              </div>

              {/* 핵심 메시지 */}
              <div className="rounded-lg border border-theme-tertiary bg-theme-secondary p-4 shadow-sm">
                <h2 className="mb-2 text-sm font-semibold text-theme-primary">핵심 메시지</h2>
                <p className="mb-3 text-xs text-theme-tertiary">
                  한 문장 또는 두 문장씩 여러 개를 추가할 수 있습니다. 책 상세「핵심」에서 모아서 볼 수 있어요.
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
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void addCoreMessage() } }}
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

            {/* 진행 현황 */}
            {hasJson && doneCount > 0 && (
              <div className="mb-4 rounded-lg border border-theme-tertiary bg-theme-secondary p-4 text-sm mt-4">
                <p className="text-theme-primary font-medium">
                  채점 완료 {doneCount} / {effectiveCount}챕터 · 평균 {avg.toFixed(1)}점 / 10
                </p>
                <p className="text-theme-secondary mt-1">{labelForAverageScore(avg)}</p>
              </div>
            )}
            {!hasJson && (doneCount > 0 || draftCount > 0) && (
              <div className="mb-4 rounded-lg border border-theme-tertiary bg-theme-secondary p-4 text-sm mt-4">
                <p className="text-theme-primary font-medium">
                  작성 완료 {doneCount + draftCount} / {effectiveCount}챕터
                </p>
                <p className="text-theme-secondary mt-1">JSON이 등록되면 AI 채점을 받을 수 있습니다.</p>
              </div>
            )}

            {/* 챕터별 목록 — 계층 트리 */}
            <div className="flex items-center justify-between mt-6 mb-1">
              <h2 className="text-sm font-semibold text-theme-primary">챕터별 요약</h2>
              {maxDepth > 1 && (
                <div className="flex gap-1">
                  {Array.from({ length: maxDepth }, (_, i) => i + 1).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => expandToDepth(d)}
                      className="text-xs px-2.5 py-1 rounded-full border border-theme-tertiary text-theme-secondary hover:border-accent-theme hover:text-accent-theme transition-colors"
                    >
                      {d}단계
                    </button>
                  ))}
                </div>
              )}
            </div>
            <ul className="space-y-1 mt-1">
              {displayEntries.map((entry) => {
                if (!isVisible(entry.path, expandedPaths)) return null
                const depth = entry.path.split(".").length - 1
                const r = (progress?.chapters?.[entry.index] ??
                  (progress?.chapters as Record<string, unknown> | undefined)?.[String(entry.index)]) as
                  | { score?: number; userText?: string }
                  | undefined
                const graded = r?.score != null
                const hasDraft = !graded && !!r?.userText
                const canExpand = hasDirectChildren(entry.path, displayEntries)

                return (
                  <li key={entry.path} className="flex items-stretch">
                    {depth > 0 && <div style={{ width: `${depth * 2}px`, flexShrink: 0 }} />}
                    <div className="flex-1 flex rounded-lg border border-theme-tertiary bg-theme-secondary overflow-hidden hover:border-accent-theme transition-colors">
                      {/* 제목 영역 — 탭 시 챕터 상세 이동 */}
                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            `/book/${resolved.id}/${resolved.user_id}/reading-excerpt/${entry.index}${querySuffix}`,
                          )
                        }
                        className="flex-1 text-left px-3 py-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className={`min-w-0 font-medium text-theme-primary ${depth === 0 ? "text-sm" : "text-xs"}`}>
                            <span className="text-theme-tertiary mr-1.5">{entry.path}</span>
                            {entry.title}
                          </span>
                          <span
                            className={`text-xs shrink-0 px-2 py-0.5 rounded ${
                              graded
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                : hasDraft
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                                  : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                            }`}
                          >
                            {graded ? `${(r as { score: number }).score}점` : hasDraft ? "저장됨" : "미작성"}
                          </span>
                        </div>
                      </button>
                      {/* 토글 영역 — 자식이 있을 때만 표시 */}
                      {canExpand && (
                        <button
                          type="button"
                          onClick={() => toggleExpanded(entry.path)}
                          className="shrink-0 flex items-center justify-center w-8 border-l border-theme-tertiary text-theme-tertiary hover:text-theme-primary hover:bg-theme-tertiary/30 transition-colors"
                          aria-label={expandedPaths.has(entry.path) ? "접기" : "펼치기"}
                        >
                          {expandedPaths.has(entry.path)
                            ? <ChevronDown className="h-4 w-4" />
                            : <ChevronRight className="h-4 w-4" />}
                        </button>
                      )}
                    </div>
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
