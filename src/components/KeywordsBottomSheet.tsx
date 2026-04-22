"use client"

import { useMemo } from "react"
import { X } from "lucide-react"
import {
  DraggableBottomSheet,
  useDraggableSheetRequestClose,
} from "@/components/ui/DraggableBottomSheet"
import type { ExcerptChapterKeywordBlock } from "@/utils/readingExcerptKeywords"
import { keywordToHashtag } from "@/utils/readingExcerptKeywords"
import {
  excerptChapterDotClass,
  excerptChapterKeywordTextClass,
} from "@/utils/excerptChapterKeywordColors"

type KeywordsBottomSheetProps = {
  open: boolean
  onClose: () => void
  blocks: ExcerptChapterKeywordBlock[]
}

function KeywordsSheetHeader({
  total,
  onClose,
}: {
  total: number
  onClose: () => void
}) {
  const requestClose = useDraggableSheetRequestClose()

  return (
    <div className='flex shrink-0 items-start justify-between gap-3 bg-bottom-sheet-surface px-4 pb-3 pt-1 sm:px-5'>
      <div className='min-w-0'>
        <h2
          id='keywords-sheet-title'
          className='text-base font-semibold text-theme-primary sm:text-lg'
        >
          키워드 전체
        </h2>
        <p className='mt-0.5 text-xs text-theme-tertiary'>총 {total}개</p>
      </div>
      <button
        type='button'
        onClick={() => (requestClose ?? onClose)()}
        className='shrink-0 rounded-full p-2 text-theme-secondary transition-colors hover:bg-theme-tertiary/60 hover:text-theme-primary'
        aria-label='닫기'
      >
        <X className='h-5 w-5' />
      </button>
    </div>
  )
}

export function KeywordsBottomSheet({
  open,
  onClose,
  blocks,
}: KeywordsBottomSheetProps) {
  const total = useMemo(
    () => blocks.reduce((n, b) => n + b.keywords.length, 0),
    [blocks],
  )

  return (
    <DraggableBottomSheet
      open={open}
      onClose={onClose}
      zIndexClass='z-[220]'
      backdropClassName='bg-theme-backdrop'
      sheetClassName='rounded-t-[1.75rem] border-0 bg-bottom-sheet-surface shadow-[0_-20px_50px_-12px_rgba(0,0,0,0.22),0_-2px_12px_rgba(0,0,0,0.08)] dark:shadow-[0_-24px_56px_-8px_rgba(0,0,0,0.55),0_-2px_14px_rgba(0,0,0,0.35)]'
      contentClassName='flex min-h-0 flex-1 flex-col overflow-hidden p-0'
      aria-labelledby='keywords-sheet-title'
    >
      <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
        <KeywordsSheetHeader total={total} onClose={onClose} />

        <div className='min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,calc(8px+env(safe-area-inset-bottom,0px)))] pt-0 sm:px-5'>
        <div className='space-y-6 pt-4'>
        {blocks.map((b) => (
          <section
            key={b.chapterIndex}
            aria-labelledby={`kw-ch-${b.chapterIndex}`}
          >
            <h3
              id={`kw-ch-${b.chapterIndex}`}
              className='mb-2.5 flex items-start gap-2 text-sm font-semibold leading-snug text-theme-primary'
            >
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${excerptChapterDotClass(b.chapterIndex)}`}
                aria-hidden
              />
              <span className='min-w-0'>{b.chapterTitle}</span>
            </h3>
            <div className='flex flex-wrap gap-x-2.5 gap-y-2 pl-4'>
              {b.keywords.map((k) => (
                <span
                  key={`${b.chapterIndex}-${k}`}
                  className={`break-words text-sm font-medium ${excerptChapterKeywordTextClass(b.chapterIndex)}`}
                >
                  {keywordToHashtag(k)}
                </span>
              ))}
            </div>
          </section>
        ))}
        </div>
        </div>
      </div>
    </DraggableBottomSheet>
  )
}
