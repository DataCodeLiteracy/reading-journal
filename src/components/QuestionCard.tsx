"use client"

import { BookQuestion } from "@/types/question"
import { HelpCircle, Edit, Trash2 } from "lucide-react"

interface QuestionCardProps {
  question: BookQuestion
  onEdit?: (question: BookQuestion) => void
  onDelete?: (questionId: string) => void
  showChapterPath?: boolean
  showActions?: boolean
}

export default function QuestionCard({
  question,
  onEdit,
  onDelete,
  showChapterPath = true,
  showActions = false,
}: QuestionCardProps) {
  const getQuestionTypeLabel = (type: string): string => {
    switch (type) {
      case "comprehension":
        return "이해"
      case "analysis":
        return "분석"
      case "synthesis":
        return "종합"
      case "application":
        return "적용"
      default:
        return type
    }
  }

  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty) {
      case "easy":
        return "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
      case "medium":
        return "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400"
      case "hard":
        return "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400"
      default:
        return "bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-400"
    }
  }

  return (
    <div className='bg-theme-secondary rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow'>
      <div className='flex items-start gap-3'>
        <div className='p-2 bg-blue-100 dark:bg-blue-900/20 rounded-full flex-shrink-0'>
          <HelpCircle className='h-5 w-5 text-blue-500' />
        </div>

        <div className='flex-1 min-w-0'>
          {showChapterPath && question.chapterPath.length > 0 && (
            <div className='text-xs text-theme-secondary mb-2'>
              {question.chapterPath.join(" > ")}
            </div>
          )}

          <p className='text-theme-primary font-medium mb-2'>
            {question.questionText}
          </p>

          <div className='flex items-center gap-2 flex-wrap'>
            <span
              className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(
                question.difficulty
              )}`}
            >
              {question.difficulty === "easy"
                ? "쉬움"
                : question.difficulty === "medium"
                  ? "보통"
                  : "어려움"}
            </span>
            <span className='text-xs text-theme-secondary px-2 py-1 bg-theme-tertiary rounded-full'>
              {getQuestionTypeLabel(question.questionType)}
            </span>
          </div>
        </div>

        {showActions && (onEdit || onDelete) && (
          <div className='flex items-center gap-2 flex-shrink-0'>
            {onEdit && (
              <button
                onClick={() => onEdit(question)}
                className='p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors'
                title='질문 수정'
              >
                <Edit className='h-4 w-4' />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(question.id)}
                className='p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors'
                title='질문 삭제'
              >
                <Trash2 className='h-4 w-4' />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

