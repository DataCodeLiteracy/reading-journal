"use client"

import { useState, useEffect } from "react"
import { BookQuestion } from "@/types/question"
import { HelpCircle, Edit, Trash2, Heart, MessageSquare, Lock, Globe } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { LikeService } from "@/services/likeService"
import { QuestionService } from "@/services/questionService"
import CommentSection from "@/components/CommentSection"

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
  const { userUid } = useAuth()
  const isOwner = userUid === (question as any).user_id
  const isPublic = (question as any).isPublic || false
  const [isLiked, setIsLiked] = useState(false)
  const [likesCount, setLikesCount] = useState((question as any).likesCount || 0)
  const [isTogglingLike, setIsTogglingLike] = useState(false)

  // 좋아요 상태 확인
  useEffect(() => {
    if (isPublic && userUid && !isOwner) {
      LikeService.getUserLike(userUid, "question", question.id).then((like) => {
        setIsLiked(!!like)
      })
    }
  }, [question.id, isPublic, userUid, isOwner])

  const handleToggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!userUid || isOwner || !isPublic || isTogglingLike) return

    try {
      setIsTogglingLike(true)
      if (isLiked) {
        await LikeService.removeLike(userUid, "question", question.id)
        setIsLiked(false)
        setLikesCount((prev: number) => Math.max(0, prev - 1))
      } else {
        await LikeService.addLike(userUid, "question", question.id)
        setIsLiked(true)
        setLikesCount((prev: number) => prev + 1)
      }

      // 최신 데이터로 업데이트
      const updatedQuestion = await QuestionService.getQuestion(question.id)
      if (updatedQuestion) {
        setLikesCount((updatedQuestion as any).likesCount || 0)
      }
    } catch (error) {
      console.error("Error toggling like:", error)
    } finally {
      setIsTogglingLike(false)
    }
  }
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
            {isPublic && (
              <>
                <Globe className='h-3 w-3 text-blue-500' />
                <span className='text-xs text-theme-tertiary'>공개</span>
              </>
            )}
          </div>

          {/* 좋아요/댓글 수 (공개된 경우만) */}
          {isPublic && (
            <>
              <div className='flex items-center gap-4 mt-3 pt-3 border-t border-theme-tertiary'>
                <button
                  onClick={handleToggleLike}
                  disabled={!userUid || isOwner || isTogglingLike}
                  className={`flex items-center gap-1 transition-colors ${
                    isLiked
                      ? "text-red-500 hover:text-red-600"
                      : "text-theme-secondary hover:text-red-500"
                  } ${!userUid || isOwner ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                  title={isOwner ? "본인의 콘텐츠에는 좋아요를 누를 수 없습니다" : isLiked ? "좋아요 취소" : "좋아요"}
                >
                  <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
                  <span className='text-xs'>{likesCount}</span>
                </button>
                <div className='flex items-center gap-1 text-theme-secondary'>
                  <MessageSquare className='h-4 w-4' />
                  <span className='text-xs'>{(question as any).commentsCount || 0}</span>
                </div>
              </div>
              <CommentSection
                contentType='question'
                contentId={question.id}
                isPublic={isPublic}
                initialCommentsCount={(question as any).commentsCount || 0}
              />
            </>
          )}
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

