"use client"

import { useState, useEffect } from "react"
import { PublicContent, ContentType } from "@/types/content"
import { BookOpen, Heart, MessageSquare, User, Globe } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { LikeService } from "@/services/likeService"

interface PublicContentCardProps {
  content: PublicContent
}

const contentTypeLabels: Record<ContentType, string> = {
  quote: "구절 기록",
  critique: "서평",
  review: "리뷰",
  question: "질문",
  answer: "답변",
}

const contentTypeColors: Record<ContentType, string> = {
  quote: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  critique: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  review: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  question: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  answer: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
}

export default function PublicContentCard({ content }: PublicContentCardProps) {
  const router = useRouter()
  const { userUid } = useAuth()
  const [isLiked, setIsLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(content.likesCount || 0)
  const [isTogglingLike, setIsTogglingLike] = useState(false)
  const isOwner = userUid === content.user_id

  // 좋아요 상태 확인
  useEffect(() => {
    if (userUid && !isOwner) {
      LikeService.getUserLike(userUid, content.contentType, content.id).then(
        (like) => {
          setIsLiked(!!like)
        }
      )
    }
  }, [content.id, content.contentType, userUid, isOwner])

  const handleToggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation() // 카드 클릭 이벤트 방지
    if (!userUid || isOwner || isTogglingLike) return

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

  const handleClick = () => {
    // 콘텐츠 타입에 따라 적절한 페이지로 이동
    if (content.contentType === "review") {
      router.push(`/book/${content.bookId}/${content.user_id}`)
    } else if (content.contentType === "question") {
      router.push(`/book/${content.bookId}/${content.user_id}/questions`)
    } else {
      router.push(`/book/${content.bookId}/${content.user_id}`)
    }
  }

  return (
    <div
      onClick={handleClick}
      className='bg-theme-secondary rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer'
    >
      {/* 헤더 */}
      <div className='flex items-start justify-between mb-3'>
        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-2 mb-2'>
            <span
              className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${contentTypeColors[content.contentType]}`}
            >
              {contentTypeLabels[content.contentType]}
            </span>
            {content.created_at && (
              <span className='text-xs text-theme-tertiary'>
                {new Date(content.created_at).toLocaleDateString("ko-KR")}
              </span>
            )}
          </div>
          <div className='flex items-center gap-2 mb-1'>
            {content.userPhotoURL ? (
              <img
                src={content.userPhotoURL}
                alt={content.userName}
                className='w-6 h-6 rounded-full'
              />
            ) : (
              <div className='w-6 h-6 rounded-full bg-theme-tertiary flex items-center justify-center'>
                <User className='h-3 w-3 text-theme-secondary' />
              </div>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                router.push(`/user/${content.user_id}`)
              }}
              className='text-sm font-medium text-theme-primary hover:underline'
            >
              {content.userName}
            </button>
          </div>
          <div className='flex items-center gap-1 text-xs text-theme-tertiary'>
            <BookOpen className='h-3 w-3' />
            <span className='truncate'>{content.bookTitle}</span>
            {content.bookAuthor && (
              <span className='truncate'> • {content.bookAuthor}</span>
            )}
          </div>
        </div>
      </div>

      {/* 콘텐츠 */}
      <div className='mb-3'>
        {content.title && content.title !== content.content && (
          <h4 className='text-base font-semibold text-theme-primary mb-2'>
            {content.title}
          </h4>
        )}
        <p className='text-sm text-theme-primary line-clamp-3 whitespace-pre-wrap'>
          {content.content}
        </p>
      </div>

      {/* 좋아요/댓글 수 */}
      <div className='flex items-center gap-4 pt-3 border-t border-theme-tertiary'>
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
          <span className='text-xs'>{content.commentsCount || 0}</span>
        </div>
      </div>
    </div>
  )
}

