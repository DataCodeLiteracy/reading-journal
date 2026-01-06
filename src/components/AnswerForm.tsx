"use client"

import { useState } from "react"
import { Send, MessageSquare } from "lucide-react"

interface AnswerFormProps {
  questionId: string
  onSubmit: (answerText: string) => Promise<void>
  onCancel?: () => void
  initialValue?: string
  placeholder?: string
  submitText?: string
  cancelText?: string
}

export default function AnswerForm({
  questionId,
  onSubmit,
  onCancel,
  initialValue = "",
  placeholder = "답변을 입력하세요...",
  submitText = "저장",
  cancelText = "취소",
}: AnswerFormProps) {
  const [answerText, setAnswerText] = useState(initialValue)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()

    if (!answerText.trim()) {
      setError("답변을 입력해주세요.")
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)
      await onSubmit(answerText.trim())
      setAnswerText("")
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "답변 저장 중 오류가 발생했습니다."
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = (): void => {
    setAnswerText(initialValue)
    setError(null)
    onCancel?.()
  }

  return (
    <form onSubmit={handleSubmit} className='space-y-3'>
      <div>
        <label
          htmlFor={`answer-${questionId}`}
          className='block text-sm font-medium text-theme-primary mb-2'
        >
          <MessageSquare className='h-4 w-4 inline mr-1' />
          답변 작성
        </label>
        <textarea
          id={`answer-${questionId}`}
          value={answerText}
          onChange={(e) => {
            setAnswerText(e.target.value)
            setError(null)
          }}
          placeholder={placeholder}
          rows={4}
          className='w-full p-3 border border-theme-tertiary rounded-lg bg-theme-tertiary text-theme-primary resize-none focus:outline-none focus:ring-2 focus:ring-accent-theme'
        />
        {error && (
          <p className='mt-1 text-sm text-red-500 dark:text-red-400'>{error}</p>
        )}
      </div>

      <div className='flex gap-2'>
        {onCancel && (
          <button
            type='button'
            onClick={handleCancel}
            className='flex-1 px-4 py-2 border border-theme-tertiary text-theme-primary rounded-lg hover:bg-theme-tertiary transition-colors'
          >
            {cancelText}
          </button>
        )}
        <button
          type='submit'
          disabled={isSubmitting || !answerText.trim()}
          className='flex-1 px-4 py-2 bg-accent-theme hover:bg-accent-theme-secondary text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
        >
          {isSubmitting ? (
            <>
              <div className='animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent' />
              저장 중...
            </>
          ) : (
            <>
              <Send className='h-4 w-4' />
              {submitText}
            </>
          )}
        </button>
      </div>
    </form>
  )
}

