"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Globe, Lock, StickyNote } from "lucide-react"
import FormModalFrame from "@/components/FormModalFrame"
import Select, { type SelectOption } from "@/components/Select"
import type { BookTocEntry } from "@/types/bookToc"
import type { BookMemo } from "@/types/memo"
import {
  buildTocPickerOptions,
  memoTocDisplayText,
} from "@/utils/questionChapterPath"

type Props = {
  isOpen: boolean
  onClose: () => void
  onSave: (
    memo: Omit<BookMemo, "id" | "created_at" | "updated_at">,
  ) => Promise<void>
  bookId: string
  bookTitle?: string
  tocOutline?: BookTocEntry[]
  existingMemo?: BookMemo | null
}

export default function MemoModal({
  isOpen,
  onClose,
  onSave,
  bookId,
  bookTitle,
  tocOutline = [],
  existingMemo,
}: Props) {
  const [content, setContent] = useState("")
  const [tocPick, setTocPick] = useState("")
  const [isPublic, setIsPublic] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const savingRef = useRef(false)
  const contentRef = useRef<HTMLTextAreaElement>(null)

  const tocPickerOptions = useMemo(
    () => buildTocPickerOptions(tocOutline, { showPath: true }),
    [tocOutline],
  )
  const hasToc = tocPickerOptions.length > 0

  useEffect(() => {
    if (!isOpen) return
    if (existingMemo) {
      setContent(existingMemo.content || "")
      setTocPick(existingMemo.tocPath || "")
      setIsPublic(existingMemo.isPublic !== false)
    } else {
      setContent("")
      setTocPick("")
      setIsPublic(true)
    }
    setError(null)
    setIsSaving(false)
    savingRef.current = false
    setTimeout(() => contentRef.current?.focus(), 100)
  }, [isOpen, existingMemo])

  const tocSelectOptions: SelectOption<string>[] = [
    { value: "", label: hasToc ? "목차 없음 (나중에 연결)" : "목차 없음" },
    ...tocPickerOptions.map((o) => ({ value: o.value, label: o.label })),
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (savingRef.current) return
    if (!content.trim()) {
      setError("메모 내용을 입력해주세요.")
      return
    }

    const selected = tocPickerOptions.find((o) => o.value === tocPick)

    savingRef.current = true
    setIsSaving(true)
    setError(null)
    try {
      await onSave({
        bookId,
        user_id: "",
        content: content.trim(),
        isPublic,
        ...(selected
          ? { chapterPath: selected.chapterPath, tocPath: selected.value }
          : { chapterPath: undefined, tocPath: undefined }),
      })
      onClose()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "메모를 저장하는 중 오류가 발생했습니다.",
      )
    } finally {
      savingRef.current = false
      setIsSaving(false)
    }
  }

  return (
    <FormModalFrame
      isOpen={isOpen}
      onClose={onClose}
      title={existingMemo ? "메모 수정" : "메모 작성"}
      size="wide"
      headerStart={
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/30">
          <StickyNote className="h-5 w-5 text-teal-600 dark:text-teal-400" aria-hidden />
        </div>
      }
      interactionLocked={isSaving}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {bookTitle ? (
          <p className="text-sm text-theme-secondary">{bookTitle}</p>
        ) : null}

        {!hasToc ? (
          <p className="rounded-lg bg-theme-tertiary px-3 py-2 text-xs text-theme-secondary">
            아직 등록된 목차가 없어요. 목차 없이 메모를 남긴 뒤, 목차를 등록하고
            수정할 때 연결할 수 있어요.
          </p>
        ) : null}

        <div>
          <label className="mb-1 block text-sm font-medium text-theme-primary">
            목차 (선택)
          </label>
          <Select
            value={tocPick}
            onChangeAction={setTocPick}
            options={tocSelectOptions}
            aria-label="목차 선택"
            variant="toolbar"
            disabled={!hasToc}
          />
          {existingMemo?.chapterPath?.length && !tocPick ? (
            <p className="mt-1 text-xs text-theme-secondary">
              이전 연결:{" "}
              {memoTocDisplayText(existingMemo.tocPath, existingMemo.chapterPath)}
            </p>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-theme-primary">
            메모 <span className="text-red-500">*</span>
          </label>
          <textarea
            ref={contentRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            placeholder="책을 읽으며 떠오른 생각, 궁금한 점, 메모를 적어보세요…"
            className="form-control form-control-textarea"
            required
          />
        </div>

        <div className="flex items-center justify-between rounded-lg bg-theme-tertiary p-3">
          <div className="flex items-center gap-2">
            {isPublic ? (
              <Globe className="h-5 w-5 text-blue-500" aria-hidden />
            ) : (
              <Lock className="h-5 w-5 text-theme-tertiary" aria-hidden />
            )}
            <div>
              <p className="text-sm font-medium text-theme-primary">공개하기</p>
              <p className="text-xs text-theme-secondary">
                {isPublic
                  ? "다른 독서자가 볼 수 있어요 (독서 모임 노트에는 안 나와요)"
                  : "나만 볼 수 있어요"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsPublic(!isPublic)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isPublic ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"
            }`}
            aria-pressed={isPublic}
            aria-label="메모 공개 여부"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isPublic ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 rounded-lg border border-theme-tertiary bg-theme-primary px-4 py-2.5 text-sm font-medium text-theme-primary disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex-1 rounded-lg bg-accent-theme px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isSaving ? "저장 중…" : existingMemo ? "수정하기" : "저장하기"}
          </button>
        </div>
      </form>
    </FormModalFrame>
  )
}
