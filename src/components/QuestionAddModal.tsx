"use client"

import { useState, useEffect } from "react"
import { Plus, Lock, Globe } from "lucide-react"
import { BookQuestion, QuestionType, Difficulty } from "@/types/question"
import FormModalFrame from "@/components/FormModalFrame"
import Select, { type SelectOption } from "@/components/Select"
import {
  QUESTION_DIFFICULTY_HELP,
  QUESTION_FOCUS_OPTIONS,
  QUESTION_TYPE_HELP,
  type QuestionFocusKind,
} from "@/constants/readingMeta"

interface QuestionAddModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (question: Omit<BookQuestion, "id" | "created_at" | "updated_at" | "order">) => Promise<void>
  bookId: string
  existingQuestions?: BookQuestion[] // order 계산용
  /** 읽기 준비 단계 직후 등 안내 문구 */
  bannerMessage?: string | null
  /** 저장 시 함께 넣을 단계(예: 읽기 준비 질문) */
  defaultReadingPhase?: BookQuestion["readingPhase"]
}

export default function QuestionAddModal({
  isOpen,
  onClose,
  onSave,
  bookId,
  existingQuestions = [],
  bannerMessage = null,
  defaultReadingPhase,
}: QuestionAddModalProps) {
  const [questionText, setQuestionText] = useState("")
  const [questionFocus, setQuestionFocus] = useState<QuestionFocusKind>("none")
  const [questionReason, setQuestionReason] = useState("")
  const [hasChapter, setHasChapter] = useState<boolean | null>(null) // null: 선택 안함, true: 있음, false: 없음
  const [chapterPath, setChapterPath] = useState<string[]>([""])
  const [questionType, setQuestionType] = useState<QuestionType>("general")
  const [difficulty, setDifficulty] = useState<Difficulty>("easy")
  const [isPublic, setIsPublic] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setQuestionText("")
      setQuestionFocus("none")
      setQuestionReason("")
      setHasChapter(null)
      setChapterPath([""])
      setQuestionType("general")
      setDifficulty("easy")
      setIsPublic(false)
      setError(null)
    }
  }, [isOpen])

  const handleChapterPathChange = (index: number, value: string): void => {
    const newPath = [...chapterPath]
    newPath[index] = value

    // 빈 값이면 그 이후 경로 제거
    if (!value.trim() && index < newPath.length - 1) {
      newPath.splice(index + 1)
    }

    // 최대 5단계까지만
    if (newPath.length < 5 && value.trim() && index === newPath.length - 1) {
      newPath.push("")
    }

    setChapterPath(newPath)
  }

  const handleHasChapterChange = (hasChapter: boolean): void => {
    setHasChapter(hasChapter)
    if (!hasChapter) {
      // 목차가 없으면 ["전체"]로 설정
      setChapterPath(["전체"])
    } else {
      // 목차가 있으면 빈 경로로 시작
      setChapterPath([""])
    }
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setError(null)

    if (!questionText.trim()) {
      setError("질문 텍스트를 입력해주세요.")
      return
    }

    if (hasChapter === null) {
      setError("목차 유무를 선택해주세요.")
      return
    }

    let normalizedPath: string[]

    if (!hasChapter) {
      // 목차가 없으면 ["전체"]로 설정
      normalizedPath = ["전체"]
    } else {
      // 목차가 있으면 입력된 경로 사용
      const finalChapterPath = chapterPath.filter((path) => path.trim() !== "")
      if (finalChapterPath.length === 0) {
        setError("목차 경로를 입력해주세요.")
        return
      }
      normalizedPath = finalChapterPath
    }

    try {
      setIsSaving(true)
      await onSave({
        bookId,
        questionText: questionText.trim(),
        chapterPath: normalizedPath,
        questionFocus: questionFocus === "none" ? undefined : questionFocus,
        questionReason: questionReason.trim() || undefined,
        questionType,
        difficulty,
        isPublic,
        ...(defaultReadingPhase ? { readingPhase: defaultReadingPhase } : {}),
      })
      onClose()
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "질문을 저장하는 중 오류가 발생했습니다."
      setError(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  const questionTypeOptions: SelectOption<QuestionType>[] = [
    { value: "general", label: "일반" },
    { value: "comprehension", label: "사실 파악" },
    { value: "analysis", label: "인과·비교" },
    { value: "synthesis", label: "주제·메시지" },
    { value: "application", label: "실생활 적용" },
  ]

  return (
    <FormModalFrame
      isOpen={isOpen}
      onClose={onClose}
      title="새 질문 추가"
      size="wide"
      headerStart={
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
          <Plus className="h-5 w-5 text-blue-500" aria-hidden />
        </div>
      }
    >
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {bannerMessage ? (
          <div className='mb-4 rounded-lg border border-accent-theme/40 bg-accent-theme/10 p-3 text-sm text-theme-secondary'>
            {bannerMessage}
          </div>
        ) : null}

        <div className='mb-4 rounded-lg border border-theme-tertiary bg-theme-tertiary/40 p-3 text-xs leading-relaxed text-theme-secondary'>
          <span className='font-medium text-theme-primary'>질문 유형</span>은 질문의{" "}
          <em>형식</em>(사실 파악·인과·주제 등)이고,{" "}
          <span className='font-medium text-theme-primary'>질문의 초점</span>은 지금 무엇을{" "}
          <em>궁금해하는지</em>(내용·해석·문장·연결 등)에 가깝습니다. 둘 다 안 골라도
          되지만, 나중에 모아보기 쉽게 적어 두면 도움이 됩니다.
        </div>

        <form onSubmit={handleSubmit} className="form-modal-fieldset space-y-3 sm:space-y-4">
          <div>
            <label className="mb-0.5 block text-sm font-medium text-theme-primary">
              질문 텍스트 *
            </label>
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              className="form-control form-control-textarea resize-none"
              placeholder="질문을 입력하세요"
              rows={4}
              required
            />
          </div>

          <div>
            <label className='mb-2 block text-sm font-medium text-theme-primary'>
              질문의 초점 (선택)
            </label>
            <p className='mb-2 text-xs text-theme-secondary'>
              이 질문이 주로 무엇을 겨냥하는지 한 가지를 골라 주세요.
            </p>
            <div className='max-h-48 space-y-1.5 overflow-y-auto rounded-lg border border-theme-tertiary bg-theme-primary/30 p-2'>
              {QUESTION_FOCUS_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className='flex cursor-pointer gap-2 rounded-md p-2 hover:bg-theme-tertiary/50'
                >
                  <input
                    type='radio'
                    name='questionFocus'
                    checked={questionFocus === opt.value}
                    onChange={() => setQuestionFocus(opt.value)}
                    className='mt-1 border-theme-tertiary text-accent-theme focus:ring-accent-theme'
                  />
                  <span className='min-w-0'>
                    <span className='block text-sm font-medium text-theme-primary'>
                      {opt.label}
                    </span>
                    <span className='mt-0.5 block text-xs leading-snug text-theme-secondary'>
                      {opt.description}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className='mb-0.5 block text-sm font-medium text-theme-primary'>
              질문과 함께 남기는 나의 생각 (선택)
            </label>
            <textarea
              value={questionReason}
              onChange={(e) => setQuestionReason(e.target.value)}
              className='form-control form-control-textarea resize-none'
              placeholder='예: 이 질문을 적는 나의 생각, 책이 던지는 핵심 질문에 대한 내 해석이나 궁금증…'
              rows={3}
            />
            <p className='mt-1 text-xs text-theme-tertiary'>
              질문 문장과 별도로, 왜 이걸 남기는지·어떤 생각에서 나왔는지 적어 두면 나중에 읽을 때 도움이 됩니다.
            </p>
          </div>

          <div>
            <label className="mb-0.5 block text-sm font-medium text-theme-primary">
              목차 유무 *
            </label>
            <div className='flex gap-3 mb-4'>
              <button
                type='button'
                onClick={() => handleHasChapterChange(false)}
                className={`flex-1 px-4 py-2 rounded-md transition-colors ${
                  hasChapter === false
                    ? "bg-accent-theme text-white"
                    : "bg-theme-tertiary text-theme-secondary hover:bg-theme-tertiary/80"
                }`}
              >
                목차 없음
              </button>
              <button
                type='button'
                onClick={() => handleHasChapterChange(true)}
                className={`flex-1 px-4 py-2 rounded-md transition-colors ${
                  hasChapter === true
                    ? "bg-accent-theme text-white"
                    : "bg-theme-tertiary text-theme-secondary hover:bg-theme-tertiary/80"
                }`}
              >
                목차 있음
              </button>
            </div>

            {hasChapter === true && (
              <div>
                <label className='block text-sm font-medium text-theme-primary mb-2'>
                  목차 경로 * (최대 5단계)
                </label>
                <div className='space-y-2'>
                  {chapterPath.map((path, index) => (
                    <div key={index} className='flex items-center gap-2'>
                      <span className='text-xs text-theme-secondary w-8'>
                        {index + 1}단계
                      </span>
                      <input
                        type="text"
                        value={path}
                        onChange={(e) => handleChapterPathChange(index, e.target.value)}
                        className="form-control min-w-0 flex-1"
                        placeholder={
                          index === 0
                            ? "예: 5부"
                            : `예: ${index === 1 ? "1장" : index === 2 ? "1절" : index === 3 ? "1항" : "1목"}`
                        }
                      />
                    </div>
                  ))}
                </div>
                <p className='text-xs text-theme-secondary mt-2'>
                  예: ["5부", "1장", "1절"]
                </p>
              </div>
            )}

            {hasChapter === false && (
              <div className='p-3 bg-theme-tertiary rounded-lg'>
                <p className='text-sm text-theme-secondary'>
                  목차가 없는 책입니다. 질문은 "전체"로 분류됩니다.
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="mb-0.5 block text-sm font-medium text-theme-primary">
              질문 유형 *
            </label>
            <Select<QuestionType>
              value={questionType}
              onChange={setQuestionType}
              options={questionTypeOptions}
              variant="form-modal"
            />
            <p className='mt-1.5 text-xs leading-relaxed text-theme-secondary'>
              {QUESTION_TYPE_HELP[questionType]}
            </p>
          </div>

          <div>
            <label className="mb-0.5 block text-sm font-medium text-theme-primary">
              난이도 *
            </label>
            <div className='flex gap-3'>
              {(["easy", "medium", "hard"] as Difficulty[]).map((level) => (
                <button
                  key={level}
                  type='button'
                  onClick={() => setDifficulty(level)}
                  className={`flex-1 px-4 py-2 rounded-md transition-colors ${
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

          {/* 공개 설정 */}
          <div>
            <div className="flex items-center justify-between rounded-lg bg-theme-tertiary p-3">
              <div className='flex items-center gap-2'>
                {isPublic ? (
                  <Globe className='h-5 w-5 text-blue-500' />
                ) : (
                  <Lock className='h-5 w-5 text-gray-400' />
                )}
                <div>
                  <label className='text-sm font-medium text-theme-primary cursor-pointer'>
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

          <div className="mt-4 flex justify-end gap-2 sm:mt-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-theme-secondary px-4 py-2 text-sm font-medium text-theme-primary transition-colors hover:bg-theme-tertiary"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSaving || !questionText.trim()}
              className="flex items-center justify-center gap-2 rounded-md bg-accent-theme px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-theme-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  저장 중...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  저장하기
                </>
              )}
            </button>
          </div>
        </form>
    </FormModalFrame>
  )
}

