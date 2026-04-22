"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { BookQuestion } from "@/types/question"
import {
  HelpCircle,
  Edit,
  Trash2,
  Heart,
  MessageSquare,
  Globe,
  ChevronRight,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { LikeService } from "@/services/likeService"
import { QuestionService } from "@/services/questionService"
import CommentSection from "@/components/CommentSection"
import {
  questionFocusDescription,
  questionFocusLabel,
  readingPhaseLabel,
} from "@/constants/readingMeta"

interface QuestionCardProps {
  question: BookQuestion
  onEdit?: (question: BookQuestion) => void
  onDelete?: (questionId: string) => void
  showChapterPath?: boolean
  showActions?: boolean
  /** 링크 시 상세 페이지로 이동, 클릭 가능 표시(> 아이콘) */
  detailHref?: string
  /** 상세 페이지에서 카드 밖에 답변 영역을 둘 때 false */
  showCommentSection?: boolean
}

function getQuestionTypeLabel(type: string): string {
  switch (type) {
    case "general":
      return "일반"
    case "comprehension":
      return "사실 파악"
    case "analysis":
      return "인과·비교"
    case "synthesis":
      return "주제·메시지"
    case "application":
      return "실생활 적용"
    default:
      return type
  }
}

function getDifficultyColor(difficulty: string): string {
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

function MetaBadges({
  question,
  isPublic,
}: {
  question: BookQuestion
  isPublic: boolean
}) {
  return (
    <div className='flex flex-wrap items-center gap-1.5'>
      <span
        className={`rounded-full px-2 py-0.5 text-[11px] font-medium leading-tight sm:text-xs ${getDifficultyColor(
          question.difficulty,
        )}`}
      >
        {question.difficulty === "easy"
          ? "쉬움"
          : question.difficulty === "medium"
            ? "보통"
            : "어려움"}
      </span>
      <span className='rounded-full bg-theme-tertiary px-2 py-0.5 text-[11px] font-medium leading-tight text-theme-secondary sm:text-xs'>
        {getQuestionTypeLabel(question.questionType)}
      </span>
      {question.questionFocus && question.questionFocus !== "none" && (
        <span
          className='max-w-full rounded-full bg-violet-500/15 px-2 py-0.5 text-[11px] font-medium leading-tight text-violet-800 dark:text-violet-200 sm:text-xs'
          title={questionFocusDescription(question.questionFocus)}
        >
          <span className='hidden sm:inline'>초점·</span>
          {questionFocusLabel(question.questionFocus)}
        </span>
      )}
      {question.readingPhase && (
        <span className='rounded-full bg-slate-500/15 px-2 py-0.5 text-[11px] leading-tight text-theme-secondary sm:text-xs'>
          {readingPhaseLabel(question.readingPhase)}
        </span>
      )}
      {isPublic && (
        <span className='inline-flex items-center gap-0.5 rounded-full bg-theme-tertiary/60 px-1.5 py-0.5 text-[11px] text-theme-tertiary sm:text-xs'>
          <Globe className='h-3 w-3 shrink-0 text-blue-500' aria-hidden />
          공개
        </span>
      )}
    </div>
  )
}

export default function QuestionCard({
  question,
  onEdit,
  onDelete,
  showChapterPath = true,
  showActions = false,
  detailHref,
  showCommentSection = true,
}: QuestionCardProps) {
  const { userUid } = useAuth()
  const isOwner = userUid === (question as any).user_id
  const isPublic = (question as any).isPublic || false
  const [isLiked, setIsLiked] = useState(false)
  const [likesCount, setLikesCount] = useState((question as any).likesCount || 0)
  const [isTogglingLike, setIsTogglingLike] = useState(false)

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

  const actionBtnClass =
    "inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 text-blue-500 transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20 sm:min-h-0 sm:min-w-0 sm:p-2"

  const deleteBtnClass =
    "inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20 sm:min-h-0 sm:min-w-0 sm:p-2"

  const coreContent = (
    <>
      {showChapterPath && question.chapterPath.length > 0 && (
        <div className='break-words text-xs leading-snug text-theme-secondary sm:text-sm'>
          {question.chapterPath.join(" › ")}
        </div>
      )}

      <p className='text-base font-medium leading-relaxed text-theme-primary sm:leading-snug'>
        {question.questionText}
      </p>

      {question.questionReason?.trim() && (
        <p className='text-sm leading-relaxed text-theme-secondary sm:text-xs'>
          <span className='font-medium text-theme-tertiary'>왜 이 질문인가 </span>
          <span className='line-clamp-4 sm:line-clamp-2'>{question.questionReason}</span>
        </p>
      )}

      <MetaBadges question={question} isPublic={isPublic} />
    </>
  )

  const statsRow = (
    <div
      className='flex items-center gap-6 border-t border-theme-tertiary pt-3'
      onClick={(e) => e.stopPropagation()}
    >
      {isPublic ? (
        <>
          {isOwner ? (
            <span className='flex items-center gap-1.5 text-sm text-theme-secondary sm:text-xs' title='본인 게시물'>
              <Heart className='h-4 w-4 shrink-0 text-red-500 fill-red-500' aria-hidden />
              {likesCount}
            </span>
          ) : (
            <button
              type='button'
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleToggleLike(e)
              }}
              disabled={!userUid || isTogglingLike}
              className={`flex items-center gap-1.5 text-sm transition-colors sm:text-xs ${
                !userUid ? "cursor-not-allowed text-theme-tertiary opacity-50" : "text-theme-secondary"
              }`}
              title={isLiked ? "좋아요 취소" : "좋아요"}
            >
              <Heart
                className={`h-4 w-4 shrink-0 ${isLiked ? "text-red-500 fill-red-500" : "text-red-500"}`}
                aria-hidden
              />
              {likesCount}
            </button>
          )}
          <div className='flex items-center gap-1.5 text-sm text-theme-secondary sm:text-xs'>
            <MessageSquare className='h-4 w-4 shrink-0' aria-hidden />
            {(question as any).commentsCount || 0}
          </div>
        </>
      ) : (
        <>
          <span className='flex items-center gap-1.5 text-sm text-theme-secondary sm:text-xs'>
            <Heart className='h-4 w-4 shrink-0 text-red-500 fill-red-500' aria-hidden />
            {likesCount}
          </span>
          <div className='flex items-center gap-1.5 text-sm text-theme-secondary sm:text-xs'>
            <MessageSquare className='h-4 w-4 shrink-0' aria-hidden />
            {(question as any).commentsCount || 0}
          </div>
        </>
      )}
    </div>
  )

  const cardShell = detailHref
    ? "border-theme-tertiary bg-theme-secondary hover:border-accent-theme/50 hover:shadow-md"
    : "bg-theme-secondary shadow-sm hover:shadow-md"

  return (
    <div
      className={`rounded-xl border transition-shadow ${cardShell} p-3 sm:rounded-lg sm:p-4`}
    >
      {detailHref ? (
        <div className='flex flex-col gap-3'>
          <div className='flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:gap-3'>
            <Link
              href={detailHref}
              className='group flex min-w-0 flex-1 items-start gap-2 sm:gap-3'
            >
              <div className='shrink-0 rounded-full bg-blue-100 p-1.5 dark:bg-blue-900/20 sm:p-2'>
                <HelpCircle className='h-4 w-4 text-blue-500 sm:h-5 sm:w-5' aria-hidden />
              </div>
              <div className='min-w-0 flex-1 space-y-2'>{coreContent}</div>
              <ChevronRight
                className='mt-0.5 h-5 w-5 shrink-0 text-theme-tertiary transition-colors group-hover:text-accent-theme sm:mt-1'
                aria-hidden
              />
            </Link>
            {showActions && (onEdit || onDelete) && (
              <div
                className='flex shrink-0 items-center justify-end gap-0.5 sm:flex-col sm:items-stretch sm:justify-start sm:gap-1'
                onClick={(e) => e.stopPropagation()}
              >
                {onEdit && (
                  <button
                    type='button'
                    onClick={(e) => {
                      e.preventDefault()
                      onEdit(question)
                    }}
                    className={actionBtnClass}
                    title='질문 수정'
                  >
                    <Edit className='h-5 w-5 sm:h-4 sm:w-4' />
                  </button>
                )}
                {onDelete && (
                  <button
                    type='button'
                    onClick={(e) => {
                      e.preventDefault()
                      onDelete(question.id)
                    }}
                    className={deleteBtnClass}
                    title='질문 삭제'
                  >
                    <Trash2 className='h-5 w-5 sm:h-4 sm:w-4' />
                  </button>
                )}
              </div>
            )}
          </div>
          {statsRow}
        </div>
      ) : (
        <>
          <div className='flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start'>
            <div className='flex min-w-0 flex-1 items-start gap-2 sm:gap-3'>
              <div className='shrink-0 rounded-full bg-blue-100 p-1.5 dark:bg-blue-900/20 sm:p-2'>
                <HelpCircle className='h-4 w-4 text-blue-500 sm:h-5 sm:w-5' aria-hidden />
              </div>
              <div className='min-w-0 flex-1 space-y-2'>
                {coreContent}

                {isPublic && (
                  <>
                    <div className='flex items-center gap-4 border-t border-theme-tertiary pt-3'>
                      {isOwner ? (
                        <span
                          className='flex items-center gap-1 text-theme-secondary'
                          title='본인 게시물'
                        >
                          <Heart className='h-4 w-4 text-red-500 fill-red-500' />
                          <span className='text-xs'>{likesCount}</span>
                        </span>
                      ) : (
                        <button
                          type='button'
                          onClick={handleToggleLike}
                          disabled={!userUid || isTogglingLike}
                          className={`flex items-center gap-1 transition-colors text-theme-secondary ${
                            !userUid ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                          }`}
                          title={isLiked ? "좋아요 취소" : "좋아요"}
                        >
                          <Heart
                            className={`h-4 w-4 ${isLiked ? "text-red-500 fill-red-500" : "text-red-500"}`}
                          />
                          <span className='text-xs'>{likesCount}</span>
                        </button>
                      )}
                      <div className='flex items-center gap-1 text-theme-secondary'>
                        <MessageSquare className='h-4 w-4' />
                        <span className='text-xs'>{(question as any).commentsCount || 0}</span>
                      </div>
                    </div>
                    {showCommentSection && (
                      <CommentSection
                        contentType='question'
                        contentId={question.id}
                        isPublic={isPublic}
                        initialCommentsCount={(question as any).commentsCount || 0}
                      />
                    )}
                  </>
                )}
              </div>
            </div>

            {showActions && (onEdit || onDelete) && (
              <div className='flex shrink-0 justify-end gap-0.5 sm:flex-col sm:justify-start sm:gap-1'>
                {onEdit && (
                  <button
                    type='button'
                    onClick={() => onEdit(question)}
                    className={actionBtnClass}
                    title='질문 수정'
                  >
                    <Edit className='h-5 w-5 sm:h-4 sm:w-4' />
                  </button>
                )}
                {onDelete && (
                  <button
                    type='button'
                    onClick={() => onDelete(question.id)}
                    className={deleteBtnClass}
                    title='질문 삭제'
                  >
                    <Trash2 className='h-5 w-5 sm:h-4 sm:w-4' />
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
