"use client"

import { useState, useEffect } from "react"
import { X, Edit, HelpCircle } from "lucide-react"
import { BookQuestion, QuestionType, Difficulty } from "@/types/question"

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
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setQuestionText(question.questionText)
      setChapterPath([...question.chapterPath])
      setQuestionType(question.questionType)
      setDifficulty(question.difficulty)
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

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 bg-theme-backdrop flex items-center justify-center z-50'>
      <div className='bg-theme-secondary rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto shadow-lg'>
        <div className='flex items-center gap-3 mb-4'>
          <div className='p-2 bg-blue-100 dark:bg-blue-900/20 rounded-full'>
            <Edit className='h-5 w-5 text-blue-500' />
          </div>
          <h2 className='text-lg font-semibold text-theme-primary flex-1'>
            질문 수정
          </h2>
          <button
            onClick={onClose}
            className='p-1 rounded-full hover:bg-theme-tertiary transition-colors'
          >
            <X className='h-5 w-5 text-theme-secondary' />
          </button>
        </div>

        {error && (
          <div className='mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg'>
            <p className='text-sm text-red-700 dark:text-red-400'>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className='mb-4'>
            <label className='block text-sm font-medium text-theme-primary mb-2'>
              질문 텍스트 *
            </label>
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              className='w-full px-3 py-2 border border-theme-tertiary rounded-md focus:outline-none focus:ring-2 focus:ring-accent-theme bg-theme-primary text-theme-primary placeholder:text-theme-tertiary resize-none'
              placeholder='질문을 입력하세요'
              rows={4}
              required
            />
          </div>

          <div className='mb-4'>
            <label className='block text-sm font-medium text-theme-primary mb-2'>
              목차 경로 * (최대 5단계, 없으면 '전체' 입력)
            </label>
            <div className='space-y-2'>
              {chapterPath.map((path, index) => (
                <div key={index} className='flex items-center gap-2'>
                  <span className='text-xs text-theme-secondary w-8'>
                    {index + 1}단계
                  </span>
                  <input
                    type='text'
                    value={path}
                    onChange={(e) => handleChapterPathChange(index, e.target.value)}
                    className='flex-1 px-3 py-2 border border-theme-tertiary rounded-md focus:outline-none focus:ring-2 focus:ring-accent-theme bg-theme-primary text-theme-primary placeholder:text-theme-tertiary'
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

          <div className='mb-4'>
            <label className='block text-sm font-medium text-theme-primary mb-2'>
              질문 유형 *
            </label>
            <select
              value={questionType}
              onChange={(e) => setQuestionType(e.target.value as QuestionType)}
              className='w-full px-3 py-2 border border-theme-tertiary rounded-md focus:outline-none focus:ring-2 focus:ring-accent-theme bg-theme-primary text-theme-primary'
              required
            >
              <option value='comprehension'>이해 (comprehension)</option>
              <option value='analysis'>분석 (analysis)</option>
              <option value='synthesis'>종합 (synthesis)</option>
              <option value='application'>적용 (application)</option>
            </select>
          </div>

          <div className='mb-6'>
            <label className='block text-sm font-medium text-theme-primary mb-2'>
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

          <div className='flex gap-3'>
            <button
              type='button'
              onClick={onClose}
              className='flex-1 px-4 py-2 border border-theme-tertiary text-theme-primary rounded-md hover:bg-theme-tertiary transition-colors'
            >
              취소
            </button>
            <button
              type='submit'
              disabled={isSaving || !questionText.trim()}
              className='flex-1 px-4 py-2 bg-accent-theme text-white rounded-md hover:bg-accent-theme-secondary disabled:bg-theme-tertiary disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2'
            >
              {isSaving ? (
                <>
                  <div className='animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent' />
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
      </div>
    </div>
  )
}

