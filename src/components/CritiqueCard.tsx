"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Critique } from "@/types/content"
import { PenSquare, Trash2, Lock, Globe, Heart, MessageSquare, ChevronRight } from "lucide-react"
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
  /** 목록에서 사용 시 false로 두고 상세 페이지에서만 의견 표시 */
  showCommentSection?: boolean
  /** 목록에서 카드 클릭 시 이동할 상세 페이지 URL */
  detailHref?: string
}

export default function CritiqueCard({
  critique,
  bookTitle,
  onEdit,
  onDelete,
  showBookTitle = false,
  showCommentSection = true,
  detailHref,
}: CritiqueCardProps) {
  const router = useRouter()
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
    <div
      role={detailHref ? "button" : undefined}
      tabIndex={detailHref ? 0 : undefined}
      onClick={(e) => {
        if (detailHref && !(e.target as HTMLElement).closest("button")) {
          router.push(detailHref)
        }
      }}
      onKeyDown={(e) => {
        if (detailHref && (e.key === "Enter" || e.key === " ") && !(e.target as HTMLElement).closest("button")) {
          e.preventDefault()
          router.push(detailHref)
        }
      }}
      className={`rounded-lg border transition-shadow p-4 ${detailHref ? "border-theme-tertiary hover:border-accent-theme/50 hover:shadow-md hover:bg-theme-tertiary/50 active:opacity-95 bg-theme-secondary cursor-pointer" : "border-theme-tertiary bg-theme-secondary shadow-sm hover:shadow-md"}`}
    >
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
                onClick={(e) => { e.stopPropagation(); onEdit(critique) }}
                className='p-1 text-theme-secondary hover:text-blue-500 transition-colors'
                title='수정'
              >
                <PenSquare className='h-4 w-4' />
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(critique.id) }}
                className='p-1 text-theme-secondary hover:text-red-500 transition-colors'
                title='삭제'
              >
                <Trash2 className='h-4 w-4' />
              </button>
            )}
            {detailHref && <ChevronRight className='h-4 w-4 text-theme-tertiary' />}
          </div>
        )}
        {detailHref && !(isOwner && (onEdit || onDelete)) && (
          <ChevronRight className='h-4 w-4 text-theme-tertiary flex-shrink-0' />
        )}
      </div>

      {/* 서평 내용 */}
      <div className='mb-3'>
        <p className={`text-sm text-theme-primary whitespace-pre-wrap leading-relaxed ${detailHref ? "line-clamp-3" : ""}`}>
          {critique.content}
        </p>
      </div>

      {/* 좋아요/댓글 수 (공개된 경우만) */}
      {critique.isPublic && (
        <>
          <div className='flex items-center gap-4 pt-3 border-t border-theme-tertiary'>
                {isOwner ? (
                  <span className='flex items-center gap-1 text-theme-secondary' title='본인 게시물'>
                    <Heart className='h-4 w-4 text-red-500 fill-red-500' />
                    <span className='text-xs'>{likesCount}</span>
                  </span>
                ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleToggleLike()
                }}
                disabled={!userUid || isTogglingLike}
                className={`flex items-center gap-1 transition-colors text-theme-secondary ${!userUid ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                title={isLiked ? "좋아요 취소" : "좋아요"}
              >
                <Heart className={`h-4 w-4 ${isLiked ? "text-red-500 fill-red-500" : "text-red-500"}`} />
                <span className='text-xs'>{likesCount}</span>
              </button>
            )}
            <div className='flex items-center gap-1 text-theme-secondary'>
              <MessageSquare className='h-4 w-4' />
              <span className='text-xs'>{critique.commentsCount || 0}</span>
            </div>
          </div>
          {showCommentSection && (
            <CommentSection
              contentType='critique'
              contentId={critique.id}
              isPublic={critique.isPublic}
              initialCommentsCount={critique.commentsCount || 0}
            />
          )}
        </>
      )}
    </div>
  )
}

