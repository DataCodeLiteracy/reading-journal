"use client"

import { useState, useEffect } from "react"
import { X, Plus, HelpCircle } from "lucide-react"
import { BookQuestion, QuestionType, Difficulty } from "@/types/question"

interface QuestionAddModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (question: Omit<BookQuestion, "id" | "created_at" | "updated_at" | "order">) => Promise<void>
  bookId: string
  existingQuestions?: BookQuestion[] // order 계산용
}

export default function QuestionAddModal({
  isOpen,
  onClose,
  onSave,
  bookId,
  existingQuestions = [],
}: QuestionAddModalProps) {
  const [questionText, setQuestionText] = useState("")
  const [hasChapter, setHasChapter] = useState<boolean | null>(null) // null: 선택 안함, true: 있음, false: 없음
  const [chapterPath, setChapterPath] = useState<string[]>([""])
  const [questionType, setQuestionType] = useState<QuestionType>("comprehension")
  const [difficulty, setDifficulty] = useState<Difficulty>("easy")
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setQuestionText("")
      setHasChapter(null)
      setChapterPath([""])
      setQuestionType("comprehension")
      setDifficulty("easy")
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
        questionType,
        difficulty,
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

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 bg-theme-backdrop flex items-center justify-center z-50'>
      <div className='bg-theme-secondary rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto shadow-lg'>
        <div className='flex items-center gap-3 mb-4'>
          <div className='p-2 bg-blue-100 dark:bg-blue-900/20 rounded-full'>
            <Plus className='h-5 w-5 text-blue-500' />
          </div>
          <h2 className='text-lg font-semibold text-theme-primary flex-1'>
            새 질문 추가
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
                        type='text'
                        value={path}
                        onChange={(e) => handleChapterPathChange(index, e.target.value)}
                        className='flex-1 px-3 py-2 border border-theme-tertiary rounded-md focus:outline-none focus:ring-2 focus:ring-accent-theme bg-theme-primary text-theme-primary placeholder:text-theme-tertiary'
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
                  <Plus className='h-4 w-4' />
                  저장하기
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

