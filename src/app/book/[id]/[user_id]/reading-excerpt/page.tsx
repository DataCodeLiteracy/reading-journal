"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, BookMarked, Play } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { BookService } from "@/services/bookService"
import { ReadingContentPackService } from "@/services/readingContentPackService"
import { ReadingExcerptProgressService } from "@/services/readingExcerptProgressService"
import type { Book } from "@/types/book"
import type { ReadingContentPack, ReadingExcerptProgress } from "@/types/readingContent"
import { labelForAverageScore } from "@/utils/readingScoreBands"
import { GenericRouteSkeleton } from "@/components/skeletons"

function introStorageKey(bookId: string) {
  return `readingExcerptStarted:${bookId}`
}

export default function ReadingExcerptHubPage({
  params,
}: {
  params: Promise<{ id: string; user_id: string }>
}) {
  const router = useRouter()
  const { userUid } = useAuth()
  const [resolved, setResolved] = useState<{ id: string; user_id: string } | null>(null)
  const [book, setBook] = useState<Book | null>(null)
  const [pack, setPack] = useState<ReadingContentPack | null>(null)
  const [progress, setProgress] = useState<ReadingExcerptProgress | null>(null)
  const [loading, setLoading] = useState(true)
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
        const pr = await ReadingExcerptProgressService.get(userUid, resolved.id)
        setProgress(pr)
      } finally {
        setLoading(false)
      }
    })()
  }, [resolved, userUid])

  const chapters = pack?.excerptChapterSummaries ?? []

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

  if (loading || !resolved) return <GenericRouteSkeleton rows={4} />

  if (!book) {
    return <div className="p-6 text-theme-secondary">책을 찾을 수 없습니다.</div>
  }

  if (!chapters.length) {
    return (
      <div className="min-h-screen bg-theme-gradient p-6">
        <button
          type="button"
          onClick={() => router.push(`/book/${resolved.id}/${resolved.user_id}`)}
          className="mb-4 text-theme-secondary"
        >
          ← 돌아가기
        </button>
        <p className="text-theme-secondary">이 책 제목으로 등록된 발췌 요약이 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-theme-gradient pb-24">
      <div className="container mx-auto px-4 py-4 max-w-2xl">
        <button
          type="button"
          onClick={() => router.push(`/book/${resolved.id}/${resolved.user_id}`)}
          className="mb-4 inline-flex items-center gap-2 text-theme-secondary"
        >
          <ArrowLeft className="h-4 w-4" /> 책 상세
        </button>
        <div className="flex items-center gap-2 mb-2">
          <BookMarked className="h-6 w-6 text-accent-theme" />
          <h1 className="text-xl font-bold text-theme-primary">발췌 요약</h1>
        </div>
        <p className="text-sm text-theme-secondary mb-1">{book.title}</p>

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
            </ul>
            {pack?.excerptBookMetadata?.overall_summary && (
              <p className="text-xs text-theme-tertiary mb-4">
                이 책에는 전체 요약(overall_summary)도 등록되어 있으며, 독서 리뷰 화면에서
                리뷰와 비교 채점에 활용됩니다.
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
            {doneCount > 0 && (
              <div className="mb-4 rounded-lg border border-theme-tertiary bg-theme-secondary p-4 text-sm mt-4">
                <p className="text-theme-primary font-medium">
                  제출 완료 {doneCount} / {chapters.length}챕터 · 평균 {avg.toFixed(1)}점 / 10
                </p>
                <p className="text-theme-secondary mt-1">{labelForAverageScore(avg)}</p>
              </div>
            )}

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
                          `/book/${resolved.id}/${resolved.user_id}/reading-excerpt/${i}`
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
