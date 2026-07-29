"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { X, Lock, Globe } from "lucide-react"
import { Quote } from "@/types/content"
import type { BookTocEntry } from "@/types/bookToc"
import {
  QUOTE_HIGHLIGHT_OPTIONS,
  quoteRecordReasonPlaceholder,
  quoteThoughtsPlaceholder,
  type QuoteHighlightKind,
} from "@/constants/readingMeta"
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock"
import DescribedSelect from "@/components/DescribedSelect"
import RecordTypeSuggestModal from "@/components/RecordTypeSuggestModal"
import Select, { type SelectOption } from "@/components/Select"
import { RECORD_TYPE_SUGGEST_MIN_CHARS } from "@/lib/recordTypeSuggestPrompts"
import { buildTocPickerOptions } from "@/utils/questionChapterPath"

interface QuoteModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (
    quote: Omit<
      Quote,
      "id" | "created_at" | "updated_at" | "likesCount" | "commentsCount"
    >,
  ) => Promise<void>
  bookId: string
  bookTitle?: string
  tocOutline?: BookTocEntry[]
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
  tocOutline = [],
  existingQuote,
  showMemorableLineGuide = false,
}: QuoteModalProps) {
  const [quoteText, setQuoteText] = useState("")
  const [highlightKind, setHighlightKind] = useState<QuoteHighlightKind>("none")
  const [tocPick, setTocPick] = useState("")
  const [passageRecordReason, setPassageRecordReason] = useState("")
  const [thoughts, setThoughts] = useState("")
  const [generalThoughtsReason, setGeneralThoughtsReason] = useState("")
  const [page, setPage] = useState<number | "">("")
  const [isPublic, setIsPublic] = useState(true)
  const [typeSuggestOpen, setTypeSuggestOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const savingRef = useRef(false)
  const quoteTextRef = useRef<HTMLTextAreaElement>(null)

  const tocPickerOptions = useMemo(
    () => buildTocPickerOptions(tocOutline, { showPath: true }),
    [tocOutline],
  )
  const hasToc = tocPickerOptions.length > 0
  const canSuggestType = quoteText.trim().length >= RECORD_TYPE_SUGGEST_MIN_CHARS

  const tocSelectOptions: SelectOption<string>[] = [
    { value: "", label: "선택 안 함" },
    ...tocPickerOptions.map((o) => ({ value: o.value, label: o.label })),
  ]

  useEffect(() => {
    if (isOpen) {
      if (existingQuote) {
        setQuoteText(existingQuote.quoteText || "")
        setHighlightKind(existingQuote.highlightKind ?? "none")
        setPassageRecordReason(existingQuote.passageRecordReason ?? "")
        setThoughts(existingQuote.thoughts || "")
        setGeneralThoughtsReason(
          extractGeneralThoughtsText(existingQuote.generalThoughts),
        )
        setPage(existingQuote.page ?? "")
        setIsPublic(existingQuote.isPublic || false)
        const options = buildTocPickerOptions(tocOutline, { showPath: true })
        const byPath = existingQuote.tocPath
          ? options.find((o) => o.value === existingQuote.tocPath)
          : undefined
        const byChapter =
          !byPath && existingQuote.chapterPath?.length
            ? options.find(
                (o) =>
                  JSON.stringify(o.chapterPath) ===
                  JSON.stringify(existingQuote.chapterPath),
              )
            : undefined
        setTocPick(byPath?.value ?? byChapter?.value ?? "")
      } else {
        setQuoteText("")
        setHighlightKind("none")
        setPassageRecordReason("")
        setThoughts("")
        setGeneralThoughtsReason("")
        setPage("")
        setTocPick("")
        setIsPublic(true)
      }
      setIsSaving(false)
      savingRef.current = false
      setTimeout(() => {
        quoteTextRef.current?.focus()
      }, 100)
    }
  }, [isOpen, existingQuote, tocOutline])

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
    const selected = tocPickerOptions.find((o) => o.value === tocPick)

    const quoteData: Omit<
      Quote,
      "id" | "created_at" | "updated_at" | "likesCount" | "commentsCount"
    > = {
      bookId,
      user_id: "",
      quoteText: quoteText.trim(),
      highlightKind: highlightKind === "none" ? undefined : highlightKind,
      passageRecordReason: passageRecordReason.trim() || undefined,
      thoughts: thoughts.trim() || undefined,
      generalThoughts: generalThoughtsValue,
      page: page === "" || Number.isNaN(Number(page)) ? undefined : Number(page),
      isPublic,
      ...(selected
        ? { chapterPath: selected.chapterPath, tocPath: selected.value }
        : { chapterPath: [], tocPath: "" }),
    }

    savingRef.current = true
    setIsSaving(true)
    try {
      await onSave(quoteData)
    } catch (err) {
      console.error(err)
      alert(
        err instanceof Error
          ? err.message
          : "구절 기록을 저장하는 중 오류가 발생했습니다.",
      )
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
    setTocPick("")
    setIsPublic(true)
    setTypeSuggestOpen(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-none bg-theme-backdrop p-4">
      <div className="modal-legacy-panel flex max-h-[calc(min(85dvh,100dvh-2rem)-105px)] min-h-0 w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white dark:border-slate-600/80 dark:bg-gray-800 sm:max-h-[calc(min(90dvh,100dvh-2rem)-105px)]">
        <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700 sm:p-6">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white sm:text-xl">
              {existingQuote ? "구절 기록 수정" : "구절 기록 작성"}
            </h2>
            {bookTitle && (
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 sm:text-sm">
                {bookTitle}
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="ml-2 flex-shrink-0 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

        <form
          id="quote-modal-form"
          onSubmit={handleSubmit}
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-4 sm:p-6"
        >
          <div className="space-y-4">
            {showMemorableLineGuide && !existingQuote ? (
              <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-100">
                <p className="font-medium">완독 직후 · 구절 기록</p>
                <p className="mt-1.5 leading-relaxed">
                  가장 기억에 남는 문장을 적고, 아래「이 구절을 기록한
                  이유」「구절에 대한 느낌/생각」에 왜 남기고 싶은지 덧붙여
                  보세요. 지금 적지 않아도 나중에 이 화면에서 언제든 추가할 수
                  있어요.
                </p>
              </div>
            ) : null}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
                구절 <span className="text-red-500">*</span>
              </label>
              <textarea
                ref={quoteTextRef}
                value={quoteText}
                onChange={(e) => setQuoteText(e.target.value)}
                placeholder="인상 깊었던 구절을 타이핑해주세요..."
                className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-theme dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                rows={4}
                required
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                책에서 인상 깊었던 구절을 그대로 타이핑해주세요.
              </p>
            </div>

            <div>
              <div className="mb-0.5 flex min-h-6 items-center justify-between gap-2">
                <label className="text-sm font-medium leading-none text-gray-900 dark:text-white">
                  구절 유형 (선택)
                </label>
                {canSuggestType ? (
                  <button
                    type="button"
                    onClick={() => setTypeSuggestOpen(true)}
                    className="inline-flex h-6 shrink-0 items-center rounded-md border border-violet-200 bg-violet-50 px-2 text-[11px] font-medium leading-none text-violet-700 transition-colors hover:bg-violet-100 dark:border-violet-800/60 dark:bg-violet-950/40 dark:text-violet-200 dark:hover:bg-violet-900/50"
                  >
                    AI 유형 추천
                  </button>
                ) : null}
              </div>
              <DescribedSelect<QuoteHighlightKind>
                value={highlightKind}
                onChangeAction={setHighlightKind}
                options={QUOTE_HIGHLIGHT_OPTIONS}
                aria-label="구절 유형"
              />
            </div>

            {hasToc ? (
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
                  목차 (선택)
                </label>
                <Select
                  value={tocPick}
                  onChangeAction={setTocPick}
                  options={tocSelectOptions}
                  aria-label="목차 선택"
                  variant="form-modal"
                  truncate={false}
                />
              </div>
            ) : null}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
                페이지 (선택)
              </label>
              <input
                type="number"
                min={1}
                value={page === "" ? "" : page}
                onChange={(e) => {
                  const v = e.target.value
                  setPage(v === "" ? "" : parseInt(v, 10))
                }}
                placeholder="예: 42"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-theme dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                구절이 있는 페이지 번호를 입력하세요.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
                이 구절을 기록한 이유 (선택)
              </label>
              <textarea
                value={passageRecordReason}
                onChange={(e) => setPassageRecordReason(e.target.value)}
                placeholder={recordReasonPlaceholder}
                className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-theme dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                rows={2}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                「구절에 대한 느낌」과 달리, <strong>남기려는 동기</strong>를
                적는 칸이에요.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
                구절에 대한 느낌/생각
              </label>
              <textarea
                value={thoughts}
                onChange={(e) => setThoughts(e.target.value)}
                placeholder={thoughtsPlaceholder}
                className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-theme dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                rows={4}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
                책 읽는 중 느낀 점
              </label>
              <textarea
                value={generalThoughtsReason}
                onChange={(e) => setGeneralThoughtsReason(e.target.value)}
                placeholder="구절과 무관하게 책을 읽다가 느낀 점이나 생각을 적어보세요..."
                className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-theme dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                rows={3}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                구절과 무관하게 책을 읽다가 느낀 점을 자유롭게 적어주세요.
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
              <div className="flex items-center gap-2">
                {isPublic ? (
                  <Globe className="h-5 w-5 text-blue-500" />
                ) : (
                  <Lock className="h-5 w-5 text-gray-400" />
                )}
                <div>
                  <label className="cursor-pointer text-sm font-medium text-gray-900 dark:text-white">
                    공개하기
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {isPublic
                      ? "다른 독서자들이 이 기록을 볼 수 있습니다"
                      : "나만 볼 수 있습니다"}
                  </p>
                </div>
              </div>
              <button
                type="button"
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

        <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800 sm:p-6">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              취소
            </button>
            <button
              type="submit"
              form="quote-modal-form"
              disabled={isSaving}
              className="flex-1 rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving
                ? "저장 중..."
                : existingQuote
                  ? "수정하기"
                  : "저장하기"}
            </button>
          </div>
        </div>
      </div>

      <RecordTypeSuggestModal
        isOpen={typeSuggestOpen}
        onClose={() => setTypeSuggestOpen(false)}
        mode="quote"
        sourceText={quoteText}
        onSuggested={(kind) => setHighlightKind(kind as QuoteHighlightKind)}
      />
    </div>
  )
}
