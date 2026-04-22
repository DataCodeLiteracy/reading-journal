"use client"

import { useState, useRef, useEffect } from "react"
import { X, BookOpen, Lock, Globe } from "lucide-react"
import { Quote } from "@/types/content"
import { PURPOSE_LABELS } from "@/utils/quoteDisplay"
import {
  QUOTE_HIGHLIGHT_OPTIONS,
  QUOTE_PURPOSE_META,
  type QuoteHighlightKind,
} from "@/constants/readingMeta"
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock"

interface QuoteModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (quote: Omit<Quote, "id" | "created_at" | "updated_at" | "likesCount" | "commentsCount">) => void
  bookId: string
  bookTitle?: string
  existingQuote?: Quote | null
  /** 완독 직후: 가장 기억에 남는 문장·이유 작성 유도 */
  showMemorableLineGuide?: boolean
}

function parseGeneralThoughts(raw: string | undefined): { reason: string; purposes: string[] } {
  if (!raw || typeof raw !== "string") return { reason: "", purposes: [] }
  const s = raw.trim()
  const parts = s.split(/\s*\/\s*/)
  const reason = parts[0]?.trim() ?? ""
  const tagStr = parts.slice(1).join(" / ").trim()
  const purposes = tagStr
    ? tagStr
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter((k) => PURPOSE_LABELS[k])
    : []
  return { reason, purposes }
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
  const [generalThoughtsPurposes, setGeneralThoughtsPurposes] = useState<string[]>([])
  const [page, setPage] = useState<number | "">("")
  const [isPublic, setIsPublic] = useState(false)
  const quoteTextRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isOpen) {
      if (existingQuote) {
        setQuoteText(existingQuote.quoteText || "")
        setHighlightKind(existingQuote.highlightKind ?? "none")
        setPassageRecordReason(existingQuote.passageRecordReason ?? "")
        setThoughts(existingQuote.thoughts || "")
        const { reason, purposes } = parseGeneralThoughts(existingQuote.generalThoughts)
        setGeneralThoughtsReason(reason)
        setGeneralThoughtsPurposes(purposes)
        setPage(existingQuote.page ?? "")
        setIsPublic(existingQuote.isPublic || false)
      } else {
        setQuoteText("")
        setHighlightKind("none")
        setPassageRecordReason("")
        setThoughts("")
        setGeneralThoughtsReason("")
        setGeneralThoughtsPurposes([])
        setPage("")
        setIsPublic(false)
      }
      // 모달이 열릴 때 구절 텍스트 입력란에 포커스
      setTimeout(() => {
        quoteTextRef.current?.focus()
      }, 100)
    }
  }, [isOpen, existingQuote])

  useBodyScrollLock(isOpen)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!quoteText.trim()) {
      alert("구절을 입력해주세요.")
      return
    }

    const reason = generalThoughtsReason.trim()
    const purposeStr = generalThoughtsPurposes.length ? generalThoughtsPurposes.join(", ") : ""
    const generalThoughtsValue =
      reason || purposeStr ? (reason && purposeStr ? `${reason} / ${purposeStr}` : reason || purposeStr) : undefined

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

    onSave(quoteData)
    // 폼 초기화는 부모 컴포넌트에서 처리
  }

  const handleClose = () => {
    setQuoteText("")
    setHighlightKind("none")
    setPassageRecordReason("")
    setThoughts("")
    setGeneralThoughtsReason("")
    setGeneralThoughtsPurposes([])
    setPage("")
    setIsPublic(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-none bg-theme-backdrop p-4'>
      <div className='modal-legacy-panel rounded-xl border border-slate-200/90 bg-white dark:border-slate-600/80 dark:bg-gray-800 w-full max-w-2xl max-h-[90vh] flex flex-col'>
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
        <form onSubmit={handleSubmit} className='flex-1 overflow-y-auto p-4 sm:p-6 min-h-0'>
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

            {/* 하이라이트 종류 */}
            <div>
              <label className='mb-2 block text-sm font-medium text-gray-900 dark:text-white'>
                하이라이트 종류
              </label>
              <p className='mb-2 text-xs text-gray-500 dark:text-gray-400'>
                이 구절을 왜 특히 남기고 싶은지, 한 가지를 골라 주세요. 나중에 목록에서
                찾기 쉽게 쓰입니다.
              </p>
              <div className='max-h-52 space-y-2 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-gray-600 dark:bg-gray-700/50'>
                {QUOTE_HIGHLIGHT_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className='flex cursor-pointer gap-2 rounded-md p-2 hover:bg-white/80 dark:hover:bg-gray-600/50'
                  >
                    <input
                      type='radio'
                      name='highlightKind'
                      checked={highlightKind === opt.value}
                      onChange={() => setHighlightKind(opt.value)}
                      className='mt-1 border-gray-300 text-accent-theme focus:ring-accent-theme'
                    />
                    <span className='min-w-0'>
                      <span className='block text-sm font-medium text-gray-900 dark:text-white'>
                        {opt.label}
                      </span>
                      <span className='mt-0.5 block text-xs leading-snug text-gray-500 dark:text-gray-400'>
                        {opt.description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className='mb-2 block text-sm font-medium text-gray-900 dark:text-white'>
                이 구절을 기록한 이유 (선택)
              </label>
              <textarea
                value={passageRecordReason}
                onChange={(e) => setPassageRecordReason(e.target.value)}
                placeholder='예: 다음 장으로 이어지는 복선이라 저장해 두고 싶다, 문장 리듬이 좋다…'
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
                placeholder='이 구절이 왜 인상 깊었는지, 어떤 생각이 들었는지 적어보세요...'
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
              <p className='text-xs text-gray-500 dark:text-gray-400 mt-1 mb-2'>
                구절과 무관하게 책을 읽다가 느낀 점을 자유롭게 적어주세요.
              </p>
              <label className='mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300'>
                읽는 중 느낀 점 — 목적 태그 (선택)
              </label>
              <p className='mb-2 text-xs text-gray-500 dark:text-gray-400'>
                위 문단과 함께, 어떤 관점에서 적었는지 태그로 골라 주세요. 여러 개 선택
                가능합니다.
              </p>
              <div className='max-h-48 space-y-2 overflow-y-auto rounded-lg bg-gray-50 p-2 dark:bg-gray-700/50'>
                {QUOTE_PURPOSE_META.map(({ slug, label, description }) => (
                  <label
                    key={slug}
                    className='flex cursor-pointer gap-2 rounded-md p-2 hover:bg-white/80 dark:hover:bg-gray-600/50'
                  >
                    <input
                      type='checkbox'
                      checked={generalThoughtsPurposes.includes(slug)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setGeneralThoughtsPurposes((prev) => [...prev, slug])
                        } else {
                          setGeneralThoughtsPurposes((prev) => prev.filter((p) => p !== slug))
                        }
                      }}
                      className='mt-1 rounded border-gray-300 text-accent-theme focus:ring-accent-theme dark:border-gray-600'
                    />
                    <span className='min-w-0'>
                      <span className='block text-sm font-medium text-gray-800 dark:text-gray-200'>
                        {label}
                      </span>
                      <span className='mt-0.5 block text-xs leading-snug text-gray-500 dark:text-gray-400'>
                        {description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                해당하는 목적을 선택하세요 (여러 개 선택 가능).
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
              onClick={handleSubmit}
              className='flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors'
            >
              {existingQuote ? "수정하기" : "저장하기"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

