"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, Sparkles, X } from "lucide-react"
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock"
import { suggestRecordType } from "@/lib/readingAiClient"

type RecordTypeSuggestModalProps = {
  isOpen: boolean
  onClose: () => void
  mode: "quote" | "question"
  sourceText: string
  onSuggested: (kind: string, label: string) => void
}

export default function RecordTypeSuggestModal({
  isOpen,
  onClose,
  mode,
  sourceText,
  onSuggested,
}: RecordTypeSuggestModalProps) {
  const [error, setError] = useState<string | null>(null)
  const runIdRef = useRef(0)

  useBodyScrollLock(isOpen)

  useEffect(() => {
    if (!isOpen) return

    setError(null)
    const runId = ++runIdRef.current
    const text = sourceText.trim()

    void (async () => {
      try {
        const result = await suggestRecordType({ mode, text })
        if (runId !== runIdRef.current) return
        onSuggested(result.kind, result.label)
        onClose()
      } catch (e) {
        if (runId !== runIdRef.current) return
        setError(e instanceof Error ? e.message : "유형 추천에 실패했습니다.")
      }
    })()

    return () => {
      runIdRef.current += 1
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open 시 1회만 분석
  }, [isOpen, mode, sourceText])

  if (!isOpen) return null

  const modeLabel = mode === "quote" ? "구절" : "질문"

  return (
    <div
      className='fixed inset-0 z-[110] flex items-center justify-center overflow-hidden overscroll-none bg-theme-backdrop p-4'
      role='presentation'
      onClick={onClose}
    >
      <div
        className='modal-legacy-panel w-full max-w-md rounded-xl border border-slate-200/90 bg-white p-5 shadow-xl dark:border-slate-600/80 dark:bg-gray-800'
        role='dialog'
        aria-modal='true'
        aria-labelledby='record-type-suggest-title'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='mb-4 flex items-start justify-between gap-3'>
          <div className='flex min-w-0 items-start gap-2'>
            <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/40'>
              <Sparkles className='h-4 w-4 text-violet-600 dark:text-violet-300' aria-hidden />
            </div>
            <div className='min-w-0'>
              <h2
                id='record-type-suggest-title'
                className='text-base font-semibold text-gray-900 dark:text-white'
              >
                AI 유형 추천
              </h2>
              <p className='mt-0.5 text-xs text-gray-500 dark:text-gray-400'>
                {error ? "추천에 실패했습니다" : `${modeLabel}을 분석하고 있어요`}
              </p>
            </div>
          </div>
          <button
            type='button'
            onClick={onClose}
            className='shrink-0 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300'
            aria-label='닫기'
          >
            <X className='h-5 w-5' />
          </button>
        </div>

        <div className='mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-700/50'>
          <p className='mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400'>
            분석 중인 {modeLabel}
          </p>
          <p className='max-h-32 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-gray-900 dark:text-gray-100'>
            {sourceText.trim()}
          </p>
        </div>

        {error ? (
          <div className='space-y-3'>
            <p className='text-sm text-red-600 dark:text-red-400'>{error}</p>
            <button
              type='button'
              onClick={onClose}
              className='w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
            >
              닫기
            </button>
          </div>
        ) : (
          <div className='flex items-center justify-center gap-2 py-2 text-sm text-gray-600 dark:text-gray-300'>
            <Loader2 className='h-4 w-4 animate-spin text-violet-500' aria-hidden />
            <span>유형을 파악하는 중…</span>
          </div>
        )}
      </div>
    </div>
  )
}
