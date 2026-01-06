"use client"

import { useState, useEffect } from "react"
import { Quote } from "@/types/content"
import { PenSquare, Trash2, Lock, Globe, Heart, MessageSquare } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { LikeService } from "@/services/likeService"
import { QuoteService } from "@/services/quoteService"
import CommentSection from "@/components/CommentSection"

interface QuoteCardProps {
  quote: Quote
  bookTitle?: string
  onEdit?: (quote: Quote) => void
  onDelete?: (quoteId: string) => void
  showBookTitle?: boolean
}

export default function QuoteCard({
  quote,
  bookTitle,
  onEdit,
  onDelete,
  showBookTitle = false,
}: QuoteCardProps) {
  const { userUid } = useAuth()
  const isOwner = userUid === quote.user_id
  const [isLiked, setIsLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(quote.likesCount || 0)
  const [isTogglingLike, setIsTogglingLike] = useState(false)

  // 좋아요 상태 확인
  useEffect(() => {
    if (quote.isPublic && userUid && !isOwner) {
      LikeService.getUserLike(userUid, "quote", quote.id).then((like) => {
        setIsLiked(!!like)
      })
    }
  }, [quote.id, quote.isPublic, userUid, isOwner])

  const handleToggleLike = async () => {
    if (!userUid || isOwner || !quote.isPublic || isTogglingLike) return

    try {
      setIsTogglingLike(true)
      if (isLiked) {
        await LikeService.removeLike(userUid, "quote", quote.id)
        setIsLiked(false)
        setLikesCount((prev) => Math.max(0, prev - 1))
      } else {
        await LikeService.addLike(userUid, "quote", quote.id)
        setIsLiked(true)
        setLikesCount((prev) => prev + 1)
      }

      // 최신 데이터로 업데이트
      const updatedQuote = await QuoteService.getQuote(quote.id)
      if (updatedQuote) {
        setLikesCount(updatedQuote.likesCount || 0)
      }
    } catch (error) {
      console.error("Error toggling like:", error)
    } finally {
      setIsTogglingLike(false)
    }
  }

  return (
    <div className='bg-theme-secondary rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow'>
      {/* 헤더 */}
      <div className='flex items-start justify-between mb-3'>
        <div className='flex-1 min-w-0'>
          {showBookTitle && bookTitle && (
            <p className='text-xs text-theme-tertiary mb-1'>{bookTitle}</p>
          )}
          <div className='flex items-center gap-2'>
            {quote.isPublic ? (
              <Globe className='h-3 w-3 text-blue-500' />
            ) : (
              <Lock className='h-3 w-3 text-gray-400' />
            )}
            <span className='text-xs text-theme-tertiary'>
              {quote.isPublic ? "공개" : "비공개"}
            </span>
            {quote.created_at && (
              <span className='text-xs text-theme-tertiary'>
                • {new Date(quote.created_at).toLocaleDateString("ko-KR")}
              </span>
            )}
          </div>
        </div>
        {isOwner && (onEdit || onDelete) && (
          <div className='flex items-center gap-2 flex-shrink-0'>
            {onEdit && (
              <button
                onClick={() => onEdit(quote)}
                className='p-1 text-theme-secondary hover:text-blue-500 transition-colors'
                title='수정'
              >
                <PenSquare className='h-4 w-4' />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(quote.id)}
                className='p-1 text-theme-secondary hover:text-red-500 transition-colors'
                title='삭제'
              >
                <Trash2 className='h-4 w-4' />
              </button>
            )}
          </div>
        )}
      </div>

      {/* 구절 텍스트 */}
      <div className='mb-3'>
        <div className='bg-theme-tertiary rounded-lg p-3 mb-2'>
          <p className='text-theme-primary italic leading-relaxed whitespace-pre-wrap'>
            "{quote.quoteText}"
          </p>
        </div>
      </div>

      {/* 구절에 대한 느낌/생각 */}
      {quote.thoughts && (
        <div className='mb-3'>
          <p className='text-xs font-medium text-theme-secondary mb-1'>
            구절에 대한 느낌
          </p>
          <p className='text-sm text-theme-primary whitespace-pre-wrap leading-relaxed'>
            {quote.thoughts}
          </p>
        </div>
      )}

      {/* 책 읽는 중 느낀 점 */}
      {quote.generalThoughts && (
        <div className='mb-3'>
          <p className='text-xs font-medium text-theme-secondary mb-1'>
            책 읽는 중 느낀 점
          </p>
          <p className='text-sm text-theme-primary whitespace-pre-wrap leading-relaxed'>
            {quote.generalThoughts}
          </p>
        </div>
      )}

      {/* 좋아요/댓글 수 (공개된 경우만) */}
      {quote.isPublic && (
        <>
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
              <span className='text-xs'>{quote.commentsCount || 0}</span>
            </div>
          </div>
          <CommentSection
            contentType='quote'
            contentId={quote.id}
            isPublic={quote.isPublic}
            initialCommentsCount={quote.commentsCount || 0}
          />
        </>
      )}
    </div>
  )
}

