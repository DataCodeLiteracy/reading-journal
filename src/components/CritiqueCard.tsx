"use client"

import { useState, useEffect } from "react"
import { Critique } from "@/types/content"
import { PenSquare, Trash2, Lock, Globe, Heart, MessageSquare } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { LikeService } from "@/services/likeService"
import { CritiqueService } from "@/services/critiqueService"
import CommentSection from "@/components/CommentSection"

interface CritiqueCardProps {
  critique: Critique
  bookTitle?: string
  onEdit?: (critique: Critique) => void
  onDelete?: (critiqueId: string) => void
  showBookTitle?: boolean
}

export default function CritiqueCard({
  critique,
  bookTitle,
  onEdit,
  onDelete,
  showBookTitle = false,
}: CritiqueCardProps) {
  const { userUid } = useAuth()
  const isOwner = userUid === critique.user_id
  const [isLiked, setIsLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(critique.likesCount || 0)
  const [isTogglingLike, setIsTogglingLike] = useState(false)

  // 좋아요 상태 확인
  useEffect(() => {
    if (critique.isPublic && userUid && !isOwner) {
      LikeService.getUserLike(userUid, "critique", critique.id).then((like) => {
        setIsLiked(!!like)
      })
    }
  }, [critique.id, critique.isPublic, userUid, isOwner])

  const handleToggleLike = async () => {
    if (!userUid || isOwner || !critique.isPublic || isTogglingLike) return

    try {
      setIsTogglingLike(true)
      if (isLiked) {
        await LikeService.removeLike(userUid, "critique", critique.id)
        setIsLiked(false)
        setLikesCount((prev) => Math.max(0, prev - 1))
      } else {
        await LikeService.addLike(userUid, "critique", critique.id)
        setIsLiked(true)
        setLikesCount((prev) => prev + 1)
      }

      // 최신 데이터로 업데이트
      const updatedCritique = await CritiqueService.getCritique(critique.id)
      if (updatedCritique) {
        setLikesCount(updatedCritique.likesCount || 0)
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
          {critique.title && (
            <h4 className='text-base font-semibold text-theme-primary mb-2'>
              {critique.title}
            </h4>
          )}
          <div className='flex items-center gap-2'>
            {critique.isPublic ? (
              <Globe className='h-3 w-3 text-blue-500' />
            ) : (
              <Lock className='h-3 w-3 text-gray-400' />
            )}
            <span className='text-xs text-theme-tertiary'>
              {critique.isPublic ? "공개" : "비공개"}
            </span>
            {critique.created_at && (
              <span className='text-xs text-theme-tertiary'>
                • {new Date(critique.created_at).toLocaleDateString("ko-KR")}
              </span>
            )}
          </div>
        </div>
        {isOwner && (onEdit || onDelete) && (
          <div className='flex items-center gap-2 flex-shrink-0'>
            {onEdit && (
              <button
                onClick={() => onEdit(critique)}
                className='p-1 text-theme-secondary hover:text-blue-500 transition-colors'
                title='수정'
              >
                <PenSquare className='h-4 w-4' />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(critique.id)}
                className='p-1 text-theme-secondary hover:text-red-500 transition-colors'
                title='삭제'
              >
                <Trash2 className='h-4 w-4' />
              </button>
            )}
          </div>
        )}
      </div>

      {/* 서평 내용 */}
      <div className='mb-3'>
        <p className='text-sm text-theme-primary whitespace-pre-wrap leading-relaxed'>
          {critique.content}
        </p>
      </div>

      {/* 좋아요/댓글 수 (공개된 경우만) */}
      {critique.isPublic && (
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
              <span className='text-xs'>{critique.commentsCount || 0}</span>
            </div>
          </div>
          <CommentSection
            contentType='critique'
            contentId={critique.id}
            isPublic={critique.isPublic}
            initialCommentsCount={critique.commentsCount || 0}
          />
        </>
      )}
    </div>
  )
}

