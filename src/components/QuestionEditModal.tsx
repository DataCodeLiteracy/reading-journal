"use client"

import { useState, useEffect } from "react"
import { Edit, Lock, Globe } from "lucide-react"
import { BookQuestion, QuestionType, Difficulty } from "@/types/question"
import FormModalFrame from "@/components/FormModalFrame"
import Select, { type SelectOption } from "@/components/Select"

interface QuestionEditModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (
    questionId: string,
    question: Partial<Omit<BookQuestion, "id" | "created_at" | "updated_at" | "bookId" | "order">>
  ) => Promise<void>
  question: BookQuestion
}

export default function QuestionEditModal({
  isOpen,
  onClose,
  onSave,
  question,
}: QuestionEditModalProps) {
  const [questionText, setQuestionText] = useState(question.questionText)
  const [chapterPath, setChapterPath] = useState<string[]>(question.chapterPath)
  const [questionType, setQuestionType] = useState<QuestionType>(question.questionType)
  const [difficulty, setDifficulty] = useState<Difficulty>(question.difficulty)
  const [isPublic, setIsPublic] = useState((question as any).isPublic || false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setQuestionText(question.questionText)
      setChapterPath([...question.chapterPath])
      setQuestionType(question.questionType)
      setDifficulty(question.difficulty)
      setIsPublic((question as any).isPublic || false)
      setError(null)
    }
  }, [isOpen, question])

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

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setError(null)

    if (!questionText.trim()) {
      setError("질문 텍스트를 입력해주세요.")
      return
    }

    // chapterPath에서 빈 값 제거
    const finalChapterPath = chapterPath.filter((path) => path.trim() !== "")
    if (finalChapterPath.length === 0) {
      setError("목차 경로를 입력해주세요. (없으면 '전체'로 입력)")
      return
    }

    // '전체'로 입력된 경우
    const normalizedPath = finalChapterPath.length === 1 && finalChapterPath[0] === "전체"
      ? ["전체"]
      : finalChapterPath

    try {
      setIsSaving(true)
      await onSave(question.id, {
        questionText: questionText.trim(),
        chapterPath: normalizedPath,
        questionType,
        difficulty,
        isPublic,
      })
      onClose()
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "질문을 수정하는 중 오류가 발생했습니다."
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
      title="질문 수정"
      size="wide"
      headerStart={
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
          <Edit className="h-5 w-5 text-blue-500" aria-hidden />
        </div>
      }
    >
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

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
            <label className="mb-0.5 block text-sm font-medium text-theme-primary">
              목차 경로 * (최대 5단계, 없으면 '전체' 입력)
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
                        ? "예: 5부 또는 전체"
                        : `예: ${index === 1 ? "1장" : index === 2 ? "1절" : index === 3 ? "1항" : "1목"}`
                    }
                  />
                </div>
              ))}
              {chapterPath.length < 5 && chapterPath[chapterPath.length - 1]?.trim() && (
                <button
                  type='button'
                  onClick={() => setChapterPath([...chapterPath, ""])}
                  className='text-xs text-accent-theme hover:underline'
                >
                  + 경로 추가
                </button>
              )}
            </div>
            <p className='text-xs text-theme-secondary mt-2'>
              예: ["5부", "1장", "1절"] 또는 ["전체"]
            </p>
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
                  <Edit className="h-4 w-4" />
                  수정하기
                </>
              )}
            </button>
          </div>
        </form>
    </FormModalFrame>
  )
}

