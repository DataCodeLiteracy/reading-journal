"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Quote } from "@/types/content"
import { PenSquare, Trash2, Lock, Globe, Heart, MessageSquare, ChevronRight } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { LikeService } from "@/services/likeService"
import { QuoteService } from "@/services/quoteService"
import CommentSection from "@/components/CommentSection"
import { formatGeneralThoughtsForDisplay } from "@/utils/quoteDisplay"

interface QuoteCardProps {
  quote: Quote
  bookTitle?: string
  onEdit?: (quote: Quote) => void
  onDelete?: (quoteId: string) => void
  showBookTitle?: boolean
  /** 링크 시 상세 페이지로 이동, 클릭 가능 표시(> 아이콘) */
  detailHref?: string
  /** 상세 페이지에서 카드 밖에 생각 영역을 둘 때 false */
  showCommentSection?: boolean
}

export default function QuoteCard({
  quote,
  bookTitle,
  onEdit,
  onDelete,
  showBookTitle = false,
  detailHref,
  showCommentSection = true,
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
    <div className={`rounded-lg border transition-shadow ${detailHref ? "border-theme-tertiary hover:border-accent-theme/50 hover:shadow-md bg-theme-secondary" : "bg-theme-secondary shadow-sm hover:shadow-md"} p-4`}>
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
            {quote.page != null && (
              <span className='text-xs text-theme-tertiary'>• p. {quote.page}</span>
            )}
          </div>
        </div>
        <div className='flex items-center gap-2 flex-shrink-0'>
          {isOwner && (onEdit || onDelete) && (
            <>
              {onEdit && (
                <button
                  onClick={(e) => {
                    if (detailHref) {
                      e.preventDefault()
                      e.stopPropagation()
                    }
                    onEdit(quote)
                  }}
                  className='p-1 text-theme-secondary hover:text-blue-500 transition-colors'
                  title='수정'
                >
                  <PenSquare className='h-4 w-4' />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => {
                    if (detailHref) {
                      e.preventDefault()
                      e.stopPropagation()
                    }
                    onDelete(quote.id)
                  }}
                  className='p-1 text-theme-secondary hover:text-red-500 transition-colors'
                  title='삭제'
                >
                  <Trash2 className='h-4 w-4' />
                </button>
              )}
            </>
          )}
          {detailHref && <ChevronRight className='h-5 w-5 text-theme-tertiary' />}
        </div>
      </div>

      {detailHref ? (
        <>
          <Link href={detailHref} className='block group'>
            {/* 구절 텍스트 */}
            <div className='mb-3'>
              <div className='bg-theme-tertiary rounded-lg p-3 mb-2'>
                <p className='text-theme-primary italic leading-relaxed whitespace-pre-wrap'>
                  "{quote.quoteText}"
                </p>
              </div>
            </div>

            {quote.thoughts && (
              <div className='mb-3'>
                <p className='text-xs font-medium text-theme-secondary mb-1'>
                  구절에 대한 느낌
                </p>
                <p className='text-sm text-theme-primary whitespace-pre-wrap leading-relaxed line-clamp-2'>
                  {quote.thoughts}
                </p>
              </div>
            )}

            {(() => {
              const displayText = quote.generalThoughts
                ? formatGeneralThoughtsForDisplay(quote.generalThoughts)
                : ""
              return displayText ? (
                <div className='mb-3'>
                  <p className='text-xs font-medium text-theme-secondary mb-1'>
                    책 읽는 중 느낀 점
                  </p>
                  <p className='text-sm text-theme-primary whitespace-pre-wrap leading-relaxed line-clamp-2'>
                    {displayText}
                  </p>
                </div>
              ) : null
            })()}

          </Link>
          {/* 목록에서도 다른 사람이 좋아요 클릭 가능 (Link 밖에 배치). 비공개는 좋아요 수만 표시 */}
          <div
            className='flex items-center gap-4 pt-2 border-t border-theme-tertiary mt-2'
            onClick={(e) => e.stopPropagation()}
          >
            {quote.isPublic ? (
              <>
                {isOwner ? (
                  <span className='flex items-center gap-1 text-theme-secondary text-xs' title='본인 게시물'>
                    <Heart className='h-4 w-4 text-red-500 fill-red-500' />
                    {likesCount}
                  </span>
                ) : (
                  <button
                    type='button'
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleToggleLike()
                    }}
                    disabled={!userUid || isTogglingLike}
                    className={`flex items-center gap-1 text-xs transition-colors ${
                      isLiked ? "text-red-500" : "text-theme-secondary"
                    } ${!userUid ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                    title={isLiked ? "좋아요 취소" : "좋아요"}
                  >
                    <Heart className={`h-4 w-4 ${isLiked ? "text-red-500 fill-red-500" : "text-red-500"}`} />
                    {likesCount}
                  </button>
                )}
                <span className='flex items-center gap-1 text-theme-secondary text-xs'>
                  <MessageSquare className='h-4 w-4' />
                  {quote.commentsCount || 0}
                </span>
              </>
            ) : (
              <span className='flex items-center gap-1 text-theme-secondary text-xs'>
                <Heart className='h-4 w-4 text-red-500 fill-red-500' />
                {likesCount}
              </span>
            )}
          </div>
        </>
      ) : (
        <>
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
          {(() => {
            const displayText = quote.generalThoughts
              ? formatGeneralThoughtsForDisplay(quote.generalThoughts)
              : ""
            return displayText ? (
              <div className='mb-3'>
                <p className='text-xs font-medium text-theme-secondary mb-1'>
                  책 읽는 중 느낀 점
                </p>
                <p className='text-sm text-theme-primary whitespace-pre-wrap leading-relaxed'>
                  {displayText}
                </p>
              </div>
            ) : null
          })()}

          {/* 좋아요 수: 비공개도 표시. 좋아요 버튼·댓글은 공개만 */}
          <div className='flex items-center gap-4 pt-3 border-t border-theme-tertiary'>
            {quote.isPublic ? (
              <>
                {isOwner ? (
                  <span className='flex items-center gap-1 text-theme-secondary' title='본인 게시물'>
                    <Heart className='h-4 w-4 text-red-500 fill-red-500' />
                    <span className='text-xs'>{likesCount}</span>
                  </span>
                ) : (
                  <button
                    onClick={handleToggleLike}
                    disabled={!userUid || isTogglingLike}
                    className={`flex items-center gap-1 transition-colors ${
                      isLiked ? "text-red-500" : "text-theme-secondary"
                    } ${!userUid ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                    title={isLiked ? "좋아요 취소" : "좋아요"}
                  >
                    <Heart className={`h-4 w-4 ${isLiked ? "text-red-500 fill-red-500" : "text-red-500"}`} />
                    <span className='text-xs'>{likesCount}</span>
                  </button>
                )}
                <div className='flex items-center gap-1 text-theme-secondary'>
                  <MessageSquare className='h-4 w-4' />
                  <span className='text-xs'>{quote.commentsCount || 0}</span>
                </div>
              </>
            ) : (
              <span className='flex items-center gap-1 text-theme-secondary text-xs'>
                <Heart className='h-4 w-4 text-red-500 fill-red-500' />
                <span className='text-xs'>{likesCount}</span>
              </span>
            )}
          </div>
          {quote.isPublic && showCommentSection && (
                <CommentSection
                  contentType='quote'
                  contentId={quote.id}
                  isPublic={quote.isPublic}
                  initialCommentsCount={quote.commentsCount || 0}
                />
              )}
        </>
      )}
    </div>
  )
}

