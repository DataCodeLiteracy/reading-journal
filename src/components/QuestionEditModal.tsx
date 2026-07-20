"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Edit, Lock, Globe } from "lucide-react"
import { BookQuestion } from "@/types/question"
import type { BookTocEntry } from "@/types/bookToc"
import FormModalFrame from "@/components/FormModalFrame"
import DescribedSelect from "@/components/DescribedSelect"
import RecordTypeSuggestModal from "@/components/RecordTypeSuggestModal"
import Select, { type SelectOption } from "@/components/Select"
import { RECORD_TYPE_SUGGEST_MIN_CHARS } from "@/lib/recordTypeSuggestPrompts"
import {
  QUESTION_DIFFICULTY_HELP,
  QUESTION_FOCUS_OPTIONS,
  questionReasonPlaceholder,
  type QuestionFocusKind,
} from "@/constants/readingMeta"
import {
  buildTocPickerOptions,
  chapterPathToDisplayText,
  displayTextToChapterPath,
} from "@/utils/questionChapterPath"

interface QuestionEditModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (
    questionId: string,
    question: Partial<Omit<BookQuestion, "id" | "created_at" | "updated_at" | "bookId" | "order">>,
  ) => Promise<void>
  question: BookQuestion
  tocOutline?: BookTocEntry[]
}

export default function QuestionEditModal({
  isOpen,
  onClose,
  onSave,
  question,
  tocOutline = [],
}: QuestionEditModalProps) {
  const [questionText, setQuestionText] = useState(question.questionText)
  const [questionFocus, setQuestionFocus] = useState<QuestionFocusKind>(
    question.questionFocus ?? "none",
  )
  const [questionReason, setQuestionReason] = useState(question.questionReason ?? "")
  const [chapterPartText, setChapterPartText] = useState("")
  const [tocPick, setTocPick] = useState("")
  const [difficulty, setDifficulty] = useState(question.difficulty)
  const [isPublic, setIsPublic] = useState(question.isPublic || false)
  const [isSaving, setIsSaving] = useState(false)
  const savingRef = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [typeSuggestOpen, setTypeSuggestOpen] = useState(false)

  const tocPickerOptions = useMemo(
    () => buildTocPickerOptions(tocOutline, { showPath: true }),
    [tocOutline],
  )
  const hasToc = tocPickerOptions.length > 0
  const canSuggestType = questionText.trim().length >= RECORD_TYPE_SUGGEST_MIN_CHARS

  useEffect(() => {
    if (isOpen) {
      setQuestionText(question.questionText)
      setQuestionFocus(question.questionFocus ?? "none")
      setQuestionReason(question.questionReason ?? "")
      setChapterPartText(chapterPathToDisplayText(question.chapterPath))
      const options = buildTocPickerOptions(tocOutline, { showPath: true })
      const byPath = question.tocPath
        ? options.find((o) => o.value === question.tocPath)
        : undefined
      const byChapter =
        !byPath && question.chapterPath?.length
          ? options.find(
              (o) =>
                JSON.stringify(o.chapterPath) ===
                JSON.stringify(question.chapterPath),
            )
          : undefined
      setTocPick(byPath?.value ?? byChapter?.value ?? "")
      setDifficulty(question.difficulty)
      setIsPublic(question.isPublic || false)
      setError(null)
      setIsSaving(false)
      savingRef.current = false
    }
  }, [isOpen, question, tocOutline])

  const handleTocPick = (path: string) => {
    setTocPick(path)
    if (!path) {
      setChapterPartText("")
      return
    }
    const opt = tocPickerOptions.find((o) => o.value === path)
    if (opt) {
      setChapterPartText(chapterPathToDisplayText(opt.chapterPath))
    }
  }

  const resolveChapterPath = (): string[] => {
    if (tocPick) {
      const opt = tocPickerOptions.find((o) => o.value === tocPick)
      if (opt) return opt.chapterPath
    }
    if (hasToc) return ["전체"]
    return displayTextToChapterPath(chapterPartText)
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (savingRef.current) return
    setError(null)

    if (!questionText.trim()) {
      setError("질문 텍스트를 입력해주세요.")
      return
    }

    try {
      savingRef.current = true
      setIsSaving(true)
      await onSave(question.id, {
        questionText: questionText.trim(),
        chapterPath: resolveChapterPath(),
        ...(tocPick ? { tocPath: tocPick } : { tocPath: "" }),
        questionFocus: questionFocus === "none" ? undefined : questionFocus,
        questionReason: questionReason.trim() || undefined,
        questionType: question.questionType,
        difficulty,
        isPublic,
      })
      onClose()
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "질문을 수정하는 중 오류가 발생했습니다."
      setError(errorMessage)
    } finally {
      savingRef.current = false
      setIsSaving(false)
    }
  }

  const tocSelectOptions: SelectOption<string>[] = [
    { value: "", label: "선택 안 함" },
    ...tocPickerOptions.map((o) => ({ value: o.value, label: o.label })),
  ]

  const reasonPlaceholder = questionReasonPlaceholder(questionFocus)

  return (
    <>
      <FormModalFrame
        isOpen={isOpen}
        onClose={onClose}
        title='질문 수정'
        size='wide'
        headerStart={
          <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30'>
            <Edit className='h-5 w-5 text-blue-500' aria-hidden />
          </div>
        }
      >
      {error && (
        <div className='mb-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20'>
          <p className='text-sm text-red-700 dark:text-red-400'>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className='form-modal-fieldset space-y-3 sm:space-y-4'>
        <div>
          <label className='mb-0.5 block text-sm font-medium text-theme-primary'>
            질문 <span className='text-red-500'>*</span>
          </label>
          <textarea
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            className='form-control form-control-textarea resize-none'
            placeholder='질문을 입력하세요'
            rows={4}
            required
          />
        </div>

        <div>
          <div className='mb-0.5 flex min-h-6 items-center justify-between gap-2'>
            <label className='text-sm font-medium leading-none text-theme-primary'>
              질문 유형 (선택)
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
          <DescribedSelect<QuestionFocusKind>
            value={questionFocus}
            onChangeAction={setQuestionFocus}
            options={QUESTION_FOCUS_OPTIONS}
            aria-label='질문 유형'
          />
        </div>

        {hasToc ? (
          <div>
            <label className='mb-0.5 block text-sm font-medium text-theme-primary'>
              목차 (선택)
            </label>
            <Select
              value={tocPick}
              onChangeAction={handleTocPick}
              options={tocSelectOptions}
              placeholder='선택 안 함'
              variant='form-modal'
              truncate={false}
              aria-label='목차 선택'
            />
          </div>
        ) : (
          <div>
            <label className='mb-0.5 block text-sm font-medium text-theme-primary'>
              어느 부분? (선택)
            </label>
            <input
              type='text'
              value={chapterPartText}
              onChange={(e) => setChapterPartText(e.target.value)}
              className='form-control'
              placeholder='예: 3장, 중반, p.42 — 대략만 적어도 돼요'
            />
            <p className='mt-1 text-xs text-theme-secondary'>
              비워 두면 「전체」로 저장됩니다.
            </p>
          </div>
        )}

        <div>
          <label className='mb-0.5 block text-sm font-medium text-theme-primary'>
            질문과 함께 남기는 나의 생각 (선택)
          </label>
          <textarea
            value={questionReason}
            onChange={(e) => setQuestionReason(e.target.value)}
            className='form-control form-control-textarea resize-none'
            placeholder={reasonPlaceholder}
            rows={3}
          />
        </div>

        <div>
          <label className='mb-0.5 block text-sm font-medium text-theme-primary'>
            난이도 (선택)
          </label>
          <div className='flex gap-3'>
            {(["easy", "medium", "hard"] as const).map((level) => (
              <button
                key={level}
                type='button'
                onClick={() => setDifficulty(level)}
                className={`flex-1 rounded-md px-4 py-2 transition-colors ${
                  difficulty === level
                    ? level === "easy"
                      ? "bg-green-500 text-white"
                      : level === "medium"
                        ? "bg-yellow-500 text-white"
                        : "bg-red-500 text-white"
                    : "bg-theme-tertiary text-theme-secondary hover:bg-theme-tertiary/80"
                }`}
              >
                {level === "easy" ? "쉬움" : level === "medium" ? "보통" : "어려움"}
              </button>
            ))}
          </div>
          <p className='mt-1.5 text-xs leading-relaxed text-theme-secondary'>
            {QUESTION_DIFFICULTY_HELP[difficulty]}
          </p>
        </div>

        <div>
          <div className='flex items-center justify-between rounded-lg bg-theme-tertiary p-3'>
            <div className='flex items-center gap-2'>
              {isPublic ? (
                <Globe className='h-5 w-5 text-blue-500' />
              ) : (
                <Lock className='h-5 w-5 text-gray-400' />
              )}
              <div>
                <label className='cursor-pointer text-sm font-medium text-theme-primary'>
                  공개하기
                </label>
                <p className='text-xs text-theme-tertiary'>
                  {isPublic
                    ? "다른 독서자들이 이 질문을 볼 수 있습니다"
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

        <div className='mt-4 flex justify-end gap-2 sm:mt-6'>
          <button
            type='button'
            onClick={onClose}
            className='rounded-md bg-theme-secondary px-4 py-2 text-sm font-medium text-theme-primary transition-colors hover:bg-theme-tertiary'
          >
            취소
          </button>
          <button
            type='submit'
            disabled={isSaving || !questionText.trim()}
            className='flex items-center justify-center gap-2 rounded-md bg-accent-theme px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-theme-secondary disabled:cursor-not-allowed disabled:opacity-50'
          >
            {isSaving ? (
              <>
                <div className='h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent' />
                저장 중...
              </>
            ) : (
              <>
                <Edit className='h-4 w-4' />
                수정하기
              </>
            )}
          </button>
        </div>
      </form>
      </FormModalFrame>

      <RecordTypeSuggestModal
        isOpen={isOpen && typeSuggestOpen}
        onClose={() => setTypeSuggestOpen(false)}
        mode='question'
        sourceText={questionText}
        onSuggested={(kind) => setQuestionFocus(kind as QuestionFocusKind)}
      />
    </>
  )
}
