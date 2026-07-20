"use client"

import { useState, useRef, useEffect } from "react"
import { X, Lock, Globe } from "lucide-react"
import { Quote } from "@/types/content"
import { QUOTE_HIGHLIGHT_OPTIONS, quoteRecordReasonPlaceholder, quoteThoughtsPlaceholder, type QuoteHighlightKind } from "@/constants/readingMeta"
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock"
import DescribedSelect from "@/components/DescribedSelect"
import RecordTypeSuggestModal from "@/components/RecordTypeSuggestModal"
import { RECORD_TYPE_SUGGEST_MIN_CHARS } from "@/lib/recordTypeSuggestPrompts"

interface QuoteModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (
    quote: Omit<Quote, "id" | "created_at" | "updated_at" | "likesCount" | "commentsCount">
  ) => Promise<void>
  bookId: string
  bookTitle?: string
  existingQuote?: Quote | null
  /** 완독 직후: 가장 기억에 남는 문장·이유 작성 유도 */
  showMemorableLineGuide?: boolean
}

function extractGeneralThoughtsText(raw: string | undefined): string {
  if (!raw || typeof raw !== "string") return ""
  return raw.trim().split(/\s*\/\s*/)[0]?.trim() ?? ""
}

export default function QuoteModal({
  isOpen,
  onClose,
  onSave,
  bookId,
  bookTitle,
  existingQuote,
  showMemorableLineGuide = false,
}: QuoteModalProps) {
  const [quoteText, setQuoteText] = useState("")
  const [highlightKind, setHighlightKind] = useState<QuoteHighlightKind>("none")
  const [passageRecordReason, setPassageRecordReason] = useState("")
  const [thoughts, setThoughts] = useState("")
  const [generalThoughtsReason, setGeneralThoughtsReason] = useState("")
  const [page, setPage] = useState<number | "">("")
  const [isPublic, setIsPublic] = useState(false)
  const [typeSuggestOpen, setTypeSuggestOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const savingRef = useRef(false)
  const quoteTextRef = useRef<HTMLTextAreaElement>(null)

  const canSuggestType = quoteText.trim().length >= RECORD_TYPE_SUGGEST_MIN_CHARS

  useEffect(() => {
    if (isOpen) {
      if (existingQuote) {
        setQuoteText(existingQuote.quoteText || "")
        setHighlightKind(existingQuote.highlightKind ?? "none")
        setPassageRecordReason(existingQuote.passageRecordReason ?? "")
        setThoughts(existingQuote.thoughts || "")
        setGeneralThoughtsReason(extractGeneralThoughtsText(existingQuote.generalThoughts))
        setPage(existingQuote.page ?? "")
        setIsPublic(existingQuote.isPublic || false)
      } else {
        setQuoteText("")
        setHighlightKind("none")
        setPassageRecordReason("")
        setThoughts("")
        setGeneralThoughtsReason("")
        setPage("")
        setIsPublic(false)
      }
      // 모달이 열릴 때 구절 텍스트 입력란에 포커스
      setIsSaving(false)
      savingRef.current = false
      setTimeout(() => {
        quoteTextRef.current?.focus()
      }, 100)
    }
  }, [isOpen, existingQuote])

  useBodyScrollLock(isOpen)

  const recordReasonPlaceholder = quoteRecordReasonPlaceholder(highlightKind)
  const thoughtsPlaceholder = quoteThoughtsPlaceholder(highlightKind)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (savingRef.current) return
    if (!quoteText.trim()) {
      alert("구절을 입력해주세요.")
      return
    }

    const generalThoughtsValue = generalThoughtsReason.trim() || undefined

    const quoteData: Omit<Quote, "id" | "created_at" | "updated_at" | "likesCount" | "commentsCount"> = {
      bookId,
      user_id: "", // 부모 컴포넌트에서 설정
      quoteText: quoteText.trim(),
      highlightKind: highlightKind === "none" ? undefined : highlightKind,
      passageRecordReason: passageRecordReason.trim() || undefined,
      thoughts: thoughts.trim() || undefined,
      generalThoughts: generalThoughtsValue,
      page: page === "" || Number.isNaN(Number(page)) ? undefined : Number(page),
      isPublic,
    }

    savingRef.current = true
    setIsSaving(true)
    try {
      await onSave(quoteData)
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : "구절 기록을 저장하는 중 오류가 발생했습니다.")
    } finally {
      savingRef.current = false
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    setQuoteText("")
    setHighlightKind("none")
    setPassageRecordReason("")
    setThoughts("")
    setGeneralThoughtsReason("")
    setPage("")
    setIsPublic(false)
    setTypeSuggestOpen(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-none bg-theme-backdrop p-4'>
      <div className='modal-legacy-panel rounded-xl border border-slate-200/90 bg-white dark:border-slate-600/80 dark:bg-gray-800 w-full max-w-2xl max-h-[calc(min(85dvh,100dvh-2rem)-105px)] sm:max-h-[calc(min(90dvh,100dvh-2rem)-105px)] flex flex-col'>
        {/* 헤더 */}
        <div className='flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0'>
          <div className='flex-1 min-w-0'>
            <h2 className='text-lg sm:text-xl font-semibold text-gray-900 dark:text-white'>
              {existingQuote ? "구절 기록 수정" : "구절 기록 작성"}
            </h2>
            {bookTitle && (
              <p className='text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1'>
                {bookTitle}
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            className='text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0 ml-2'
          >
            <X className='h-5 w-5 sm:h-6 sm:w-6' />
          </button>
        </div>

        {/* 내용 - 스크롤 가능 */}
        <form
          id='quote-modal-form'
          onSubmit={handleSubmit}
          className='flex-1 overflow-y-auto p-4 sm:p-6 min-h-0'
        >
          <div className='space-y-4'>
            {showMemorableLineGuide && !existingQuote ? (
              <div className='rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-100'>
                <p className='font-medium'>완독 직후 · 구절 기록</p>
                <p className='mt-1.5 leading-relaxed'>
                  가장 기억에 남는 문장을 적고, 아래「이 구절을 기록한 이유」「구절에 대한 느낌/생각」에 왜 남기고 싶은지 덧붙여 보세요. 지금 적지 않아도
                  나중에 이 화면에서 언제든 추가할 수 있어요.
                </p>
              </div>
            ) : null}
            {/* 구절 텍스트 */}
            <div>
              <label className='block text-sm font-medium text-gray-900 dark:text-white mb-2'>
                구절 <span className='text-red-500'>*</span>
              </label>
              <textarea
                ref={quoteTextRef}
                value={quoteText}
                onChange={(e) => setQuoteText(e.target.value)}
                placeholder='인상 깊었던 구절을 타이핑해주세요...'
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-theme focus:border-transparent resize-none'
                rows={4}
                required
              />
              <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                책에서 인상 깊었던 구절을 그대로 타이핑해주세요.
              </p>
            </div>

            {/* 몇 페이지 구절인지 */}
            <div>
              <label className='block text-sm font-medium text-gray-900 dark:text-white mb-2'>
                페이지 (선택)
              </label>
              <input
                type='number'
                min={1}
                value={page === "" ? "" : page}
                onChange={(e) => {
                  const v = e.target.value
                  setPage(v === "" ? "" : parseInt(v, 10))
                }}
                placeholder='예: 42'
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-theme focus:border-transparent'
              />
              <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                구절이 있는 페이지 번호를 입력하세요.
              </p>
            </div>

            {/* 구절 유형 */}
            <div>
              <div className='mb-0.5 flex min-h-6 items-center justify-between gap-2'>
                <label className='text-sm font-medium leading-none text-gray-900 dark:text-white'>
                  구절 유형 (선택)
                </label>
                {canSuggestType ? (
                  <button
                    type='button'
                    onClick={() => setTypeSuggestOpen(true)}
                    className='inline-flex h-6 shrink-0 items-center rounded-md border border-violet-200 bg-violet-50 px-2 text-[11px] font-medium leading-none text-violet-700 transition-colors hover:bg-violet-100 dark:border-violet-800/60 dark:bg-violet-950/40 dark:text-violet-200 dark:hover:bg-violet-900/50'
                  >
                    AI 유형 추천
                  </button>
                ) : null}
              </div>
              <DescribedSelect<QuoteHighlightKind>
                value={highlightKind}
                onChangeAction={setHighlightKind}
                options={QUOTE_HIGHLIGHT_OPTIONS}
                aria-label='구절 유형'
              />
            </div>

            <div>
              <label className='mb-2 block text-sm font-medium text-gray-900 dark:text-white'>
                이 구절을 기록한 이유 (선택)
              </label>
              <textarea
                value={passageRecordReason}
                onChange={(e) => setPassageRecordReason(e.target.value)}
                placeholder={recordReasonPlaceholder}
                className='w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-theme dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400'
                rows={2}
              />
              <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                「구절에 대한 느낌」과 달리, <strong>남기려는 동기</strong>를 적는 칸이에요.
              </p>
            </div>

            {/* 구절에 대한 느낌/생각 */}
            <div>
              <label className='block text-sm font-medium text-gray-900 dark:text-white mb-2'>
                구절에 대한 느낌/생각
              </label>
              <textarea
                value={thoughts}
                onChange={(e) => setThoughts(e.target.value)}
                placeholder={thoughtsPlaceholder}
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-theme focus:border-transparent resize-none'
                rows={4}
              />
            </div>

            {/* 책 읽는 중 느낀 점 */}
            <div>
              <label className='block text-sm font-medium text-gray-900 dark:text-white mb-2'>
                책 읽는 중 느낀 점
              </label>
              <textarea
                value={generalThoughtsReason}
                onChange={(e) => setGeneralThoughtsReason(e.target.value)}
                placeholder='구절과 무관하게 책을 읽다가 느낀 점이나 생각을 적어보세요...'
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-theme focus:border-transparent resize-none'
                rows={3}
              />
              <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                구절과 무관하게 책을 읽다가 느낀 점을 자유롭게 적어주세요.
              </p>
            </div>

            {/* 공개 설정 */}
            <div className='flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg'>
              <div className='flex items-center gap-2'>
                {isPublic ? (
                  <Globe className='h-5 w-5 text-blue-500' />
                ) : (
                  <Lock className='h-5 w-5 text-gray-400' />
                )}
                <div>
                  <label className='text-sm font-medium text-gray-900 dark:text-white cursor-pointer'>
                    공개하기
                  </label>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                    {isPublic
                      ? "다른 독서자들이 이 기록을 볼 수 있습니다"
                      : "나만 볼 수 있습니다"}
                  </p>
                </div>
              </div>
              <button
                type='button'
                onClick={() => setIsPublic(!isPublic)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isPublic ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isPublic ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </form>

        {/* 하단 버튼 */}
        <div className='p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-shrink-0'>
          <div className='flex gap-3'>
            <button
              type='button'
              onClick={handleClose}
              className='flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors'
            >
              취소
            </button>
            <button
              type='submit'
              form='quote-modal-form'
              disabled={isSaving}
              className='flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:cursor-not-allowed disabled:opacity-50'
            >
              {isSaving ? "저장 중..." : existingQuote ? "수정하기" : "저장하기"}
            </button>
          </div>
        </div>
      </div>

      <RecordTypeSuggestModal
        isOpen={typeSuggestOpen}
        onClose={() => setTypeSuggestOpen(false)}
        mode='quote'
        sourceText={quoteText}
        onSuggested={(kind) => setHighlightKind(kind as QuoteHighlightKind)}
      />
    </div>
  )
}

