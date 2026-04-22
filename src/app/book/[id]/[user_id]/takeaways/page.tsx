"use client"

import { useEffect, useMemo, useState } from "react"
import { Tag, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { BookService } from "@/services/bookService"
import { ReadingContentPackService } from "@/services/readingContentPackService"
import { ReadingExcerptProgressService } from "@/services/readingExcerptProgressService"
import type { Book } from "@/types/book"
import type { ReadingContentPack, ReadingExcerptProgress } from "@/types/readingContent"
import { excerptChapterKeywordTextClass } from "@/utils/excerptChapterKeywordColors"
import {
  collectExcerptKeywordsByChapter,
  collectExcerptKeywordsForPreview,
  countExcerptKeywordSlots,
  keywordToHashtag,
} from "@/utils/readingExcerptKeywords"
import { GenericRouteSkeleton } from "@/components/skeletons"
import { BookSubpageHeader } from "@/components/BookSubpageHeader"
import { withReturnQuery } from "@/utils/navigateBack"
import { KeywordsBottomSheet } from "@/components/KeywordsBottomSheet"

const KEYWORD_PREVIEW_MAX = 15

export default function BookTakeawaysPage({
  params,
}: {
  params: Promise<{ id: string; user_id: string }>
}) {
  const router = useRouter()
  const { userUid } = useAuth()
  const [resolved, setResolved] = useState<{ id: string; user_id: string } | null>(
    null,
  )
  const [book, setBook] = useState<Book | null>(null)
  const [pack, setPack] = useState<ReadingContentPack | null>(null)
  const [progress, setProgress] = useState<ReadingExcerptProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [keywordsSheetOpen, setKeywordsSheetOpen] = useState(false)

  useEffect(() => {
    params.then(setResolved)
  }, [params])

  useEffect(() => {
    if (!resolved) return
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const b = await BookService.getBook(resolved.id)
        if (cancelled || !b) {
          if (!cancelled && !b) setBook(null)
          return
        }
        setBook(b)
        const p = await ReadingContentPackService.getByBookTitle(b.title)
        if (cancelled) return
        setPack(p)
        if (userUid) {
          const pr = await ReadingExcerptProgressService.get(userUid, resolved.id)
          if (!cancelled) setProgress(pr)
        } else {
          setProgress(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [resolved, userUid])

  const base = resolved
    ? `/book/${resolved.id}/${resolved.user_id}`
    : ""
  const isOwner = Boolean(resolved && userUid && userUid === resolved.user_id)
  const keywordBlocks = useMemo(
    () => collectExcerptKeywordsByChapter(pack?.excerptChapterSummaries),
    [pack?.excerptChapterSummaries],
  )
  const previewChips = useMemo(
    () =>
      collectExcerptKeywordsForPreview(
        pack?.excerptChapterSummaries,
        KEYWORD_PREVIEW_MAX,
      ),
    [pack?.excerptChapterSummaries],
  )
  const totalKeywordSlots = useMemo(
    () => countExcerptKeywordSlots(pack?.excerptChapterSummaries),
    [pack?.excerptChapterSummaries],
  )
  const hasMoreKeywords = totalKeywordSlots > KEYWORD_PREVIEW_MAX
  const coreLines = progress?.coreMessages ?? []

  const goReadingExcerpt = () => {
    const here =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : `${base}/takeaways`
    router.push(withReturnQuery(`${base}/reading-excerpt`, here))
  }

  if (loading || !resolved) return <GenericRouteSkeleton rows={5} />

  if (!book) {
    return (
      <div className='min-h-screen bg-theme-gradient p-6'>
        <p className='text-theme-secondary'>책을 찾을 수 없습니다.</p>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-theme-gradient pb-24'>
      <div className='container mx-auto max-w-2xl px-4 py-4'>
        <BookSubpageHeader
          pageTitle='핵심'
          contextTitle={book.title}
          fallbackPath={base}
          leading={<Sparkles className='h-6 w-6 text-amber-500' aria-hidden />}
        />

        <section className='mb-10' aria-labelledby='core-heading'>
          <h2
            id='core-heading'
            className='mb-3 flex items-center gap-2 text-base font-semibold text-theme-primary'
          >
            <Sparkles className='h-4 w-4 text-amber-500' aria-hidden />
            핵심 메시지
          </h2>
          {!isOwner ? (
            <p className='rounded-lg border border-theme-tertiary bg-theme-secondary p-4 text-sm text-theme-secondary'>
              핵심 메시지는 이 책을 등록한 본인만 기록할 수 있습니다. 로그인한 뒤
              내 책에서 확인해 주세요.
            </p>
          ) : coreLines.length === 0 ? (
            <div className='rounded-lg border border-theme-tertiary bg-theme-secondary p-4 text-sm text-theme-secondary'>
              <p className='mb-2'>아직 적은 핵심 메시지가 없습니다.</p>
              <button
                type='button'
                onClick={goReadingExcerpt}
                className='text-accent-theme underline hover:no-underline'
              >
                발췌 요약에서 추가하기
              </button>
            </div>
          ) : (
            <ul className='space-y-2'>
              {coreLines.map((line, i) => (
                <li
                  key={`${i}-${line.slice(0, 24)}`}
                  className='rounded-lg border border-theme-tertiary bg-theme-secondary px-4 py-3 text-sm leading-relaxed text-theme-primary whitespace-pre-wrap'
                >
                  {line}
                </li>
              ))}
            </ul>
          )}
          {isOwner && coreLines.length > 0 && (
            <button
              type='button'
              onClick={goReadingExcerpt}
              className='mt-4 text-sm text-accent-theme underline hover:no-underline'
            >
              발췌 요약에서 편집하기
            </button>
          )}
        </section>

        <section aria-labelledby='kw-heading'>
          <h2
            id='kw-heading'
            className='mb-3 flex items-center gap-2 text-base font-semibold text-theme-primary'
          >
            <Tag className='h-4 w-4 text-theme-tertiary' aria-hidden />
            키워드
          </h2>
          <p className='mb-3 text-xs text-theme-tertiary'>
            발췌 요약 자료에서 모은 키워드입니다. 같은 제목의 책이면 공통으로 보입니다.
            미리보기와「전체」에서는 챕터마다 다른 색으로 구분됩니다.
          </p>
          {keywordBlocks.length === 0 ? (
            <p className='rounded-lg border border-theme-tertiary bg-theme-secondary p-4 text-sm text-theme-secondary'>
              등록된 키워드가 없습니다.
            </p>
          ) : (
            <>
              <div
                className='relative rounded-xl border border-theme-tertiary bg-theme-secondary/80 p-3 sm:p-4'
                style={{ minHeight: "7.5rem", maxHeight: "9.5rem" }}
              >
                <div className='relative flex max-h-[8.5rem] min-h-[6rem] flex-wrap content-start gap-x-2.5 gap-y-1.5 overflow-hidden'>
                  {previewChips.map(({ keyword, chapterIndex }, i) => (
                    <span
                      key={`${i}-${chapterIndex}-${keyword}`}
                      className={`inline-flex max-w-full shrink-0 text-sm font-medium tracking-tight ${excerptChapterKeywordTextClass(chapterIndex)}`}
                      title={keywordToHashtag(keyword)}
                    >
                      {keywordToHashtag(keyword)}
                    </span>
                  ))}
                </div>
                {hasMoreKeywords ? (
                  <div
                    className='pointer-events-none absolute bottom-0 left-0 right-0 h-10 rounded-b-xl bg-gradient-to-t from-theme-secondary via-theme-secondary/90 to-transparent'
                    aria-hidden
                  />
                ) : null}
              </div>
              <div className='mt-3'>
                <button
                  type='button'
                  onClick={() => setKeywordsSheetOpen(true)}
                  className={
                    hasMoreKeywords
                      ? "rounded-lg border border-accent-theme/40 bg-accent-theme/10 px-3 py-2 text-sm font-medium text-accent-theme transition-colors hover:bg-accent-theme/20"
                      : "rounded-lg border border-theme-tertiary bg-theme-tertiary/50 px-3 py-2 text-sm font-medium text-theme-primary transition-colors hover:bg-theme-tertiary"
                  }
                >
                  {hasMoreKeywords
                    ? `키워드 전체 보기 (${totalKeywordSlots}개)`
                    : "모든 키워드 보기"}
                </button>
              </div>
            </>
          )}
        </section>
      </div>

      <KeywordsBottomSheet
        open={keywordsSheetOpen}
        onClose={() => setKeywordsSheetOpen(false)}
        blocks={keywordBlocks}
      />
    </div>
  )
}
