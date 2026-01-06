"use client"

import { useState, useEffect } from "react"
import { RecordContent } from "@/services/recordService"
import { BookOpen, Heart, MessageSquare, User, Globe, HelpCircle, PenSquare, Star } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { LikeService } from "@/services/likeService"

interface RecordContentCardProps {
  content: RecordContent
}

const contentTypeLabels: Record<RecordContent["contentType"], string> = {
  quote: "구절 기록",
  critique: "서평",
  review: "리뷰",
  question: "질문",
}

const contentTypeIcons: Record<RecordContent["contentType"], typeof BookOpen> = {
  quote: PenSquare,
  critique: Star,
  review: Star,
  question: HelpCircle,
}

const contentTypeColors: Record<RecordContent["contentType"], string> = {
  quote: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  critique: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  review: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  question: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
}

export default function RecordContentCard({ content }: RecordContentCardProps) {
  const router = useRouter()
  const { userUid } = useAuth()
  const [isLiked, setIsLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(content.likesCount || 0)
  const [isTogglingLike, setIsTogglingLike] = useState(false)
  const isOwner = userUid === content.user_id

  const Icon = contentTypeIcons[content.contentType]

  // 좋아요 상태 확인
  useEffect(() => {
    if (userUid && !isOwner && content.contentType !== "review") {
      LikeService.getUserLike(userUid, content.contentType, content.id).then(
        (like) => {
          setIsLiked(!!like)
        }
      )
    }
  }, [content.id, content.contentType, userUid, isOwner])

  const handleToggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!userUid || isOwner || content.contentType === "review" || isTogglingLike) return

    try {
      setIsTogglingLike(true)
      if (isLiked) {
        await LikeService.removeLike(userUid, content.contentType, content.id)
        setIsLiked(false)
        setLikesCount((prev) => Math.max(0, prev - 1))
      } else {
        await LikeService.addLike(userUid, content.contentType, content.id)
        setIsLiked(true)
        setLikesCount((prev) => prev + 1)
      }
    } catch (error) {
      console.error("Error toggling like:", error)
    } finally {
      setIsTogglingLike(false)
    }
  }

  const handleCardClick = () => {
    if (content.contentType === "question") {
      router.push(`/book/${content.bookId}/${content.user_id}/questions`)
    } else {
      router.push(`/book/${content.bookId}/${content.user_id}`)
    }
  }

  return (
    <div
      onClick={handleCardClick}
      className='bg-theme-secondary rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer'
    >
      <div className='flex items-start gap-3'>
        <div className={`p-2 rounded-lg flex-shrink-0 ${contentTypeColors[content.contentType]}`}>
          <Icon className='h-5 w-5' />
        </div>

        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-2 mb-2'>
            <span
              className={`text-xs px-2 py-1 rounded-full ${contentTypeColors[content.contentType]}`}
            >
              {contentTypeLabels[content.contentType]}
            </span>
            {content.bookStatus && (
              <span className='text-xs text-theme-secondary'>
                {content.bookStatus === "reading"
                  ? "읽는 중"
                  : content.bookStatus === "completed"
                    ? "완독"
                    : content.bookStatus}
              </span>
            )}
          </div>

          <h3 className='font-semibold text-theme-primary mb-1 line-clamp-2'>
            {content.title || content.content.substring(0, 50)}
          </h3>

          <p className='text-sm text-theme-secondary mb-2 line-clamp-2'>
            {content.content}
          </p>

          <div className='flex items-center gap-4 text-xs text-theme-tertiary mb-2'>
            <div className='flex items-center gap-1'>
              <BookOpen className='h-3 w-3' />
              <span className='truncate'>{content.bookTitle}</span>
            </div>
            {content.bookAuthor && (
              <span className='truncate'>{content.bookAuthor}</span>
            )}
          </div>

          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              {content.userPhotoURL ? (
                <img
                  src={content.userPhotoURL}
                  alt={content.userName}
                  className='w-5 h-5 rounded-full'
                />
              ) : (
                <div className='w-5 h-5 rounded-full bg-theme-tertiary flex items-center justify-center'>
                  <User className='h-3 w-3 text-theme-secondary' />
                </div>
              )}
              <span className='text-xs text-theme-secondary'>{content.userName}</span>
            </div>

            <div className='flex items-center gap-3'>
              {content.contentType !== "review" && (
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
              )}
              <div className='flex items-center gap-1 text-theme-secondary'>
                <MessageSquare className='h-4 w-4' />
                <span className='text-xs'>{content.commentsCount || 0}</span>
              </div>
            </div>
          </div>

          {content.created_at && (
            <div className='mt-2 text-xs text-theme-tertiary'>
              {new Date(content.created_at).toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

