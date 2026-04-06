"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, BookOpen, PenSquare, Heart, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { Book } from "@/types/book"
import { Critique } from "@/types/content"
import { useAuth } from "@/contexts/AuthContext"
import { BookService } from "@/services/bookService"
import { CritiqueService } from "@/services/critiqueService"
import { LikeService } from "@/services/likeService"
import CommentSection from "@/components/CommentSection"
import ConfirmModal from "@/components/ConfirmModal"
import { ApiError } from "@/lib/apiClient"
import { GenericRouteSkeleton } from "@/components/skeletons"

export default function CritiqueDetailPage({
  params,
}: {
  params: Promise<{ id: string; user_id: string; critiqueId: string }>
}) {
  const router = useRouter()
  const { userUid } = useAuth()
  const [resolvedParams, setResolvedParams] = useState<{
    id: string
    user_id: string
    critiqueId: string
  } | null>(null)
  const [book, setBook] = useState<Book | null>(null)
  const [critique, setCritique] = useState<Critique | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLiked, setIsLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(0)
  const [isTogglingLike, setIsTogglingLike] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  useEffect(() => {
    params.then((resolved) => setResolvedParams(resolved))
  }, [params])

  useEffect(() => {
    if (!resolvedParams) return

    const load = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const [bookData, critiqueData] = await Promise.all([
          BookService.getBook(resolvedParams.id),
          CritiqueService.getCritique(resolvedParams.critiqueId),
        ])

        if (!bookData) {
          setError("책을 찾을 수 없습니다.")
          return
        }
        if (!critiqueData || critiqueData.bookId !== resolvedParams.id) {
          setError("서평을 찾을 수 없습니다.")
          return
        }

        const isOwner = userUid === critiqueData.user_id
        if (!critiqueData.isPublic && !isOwner) {
          setError("이 서평은 비공개입니다.")
          return
        }

        setBook(bookData)
        setCritique(critiqueData)
        setLikesCount(critiqueData.likesCount || 0)

        if (userUid && !isOwner && critiqueData.isPublic) {
          const like = await LikeService.getUserLike(userUid, "critique", critiqueData.id)
          setIsLiked(!!like)
        }
      } catch (e) {
        if (e instanceof ApiError) setError(e.message)
        else setError("데이터를 불러오는 중 오류가 발생했습니다.")
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [resolvedParams, userUid])

  const handleToggleLike = async () => {
    if (!critique || !userUid || userUid === critique.user_id || isTogglingLike) return

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
    } catch (error) {
      console.error("Error toggling like:", error)
    } finally {
      setIsTogglingLike(false)
    }
  }

  if (isLoading) {
    return <GenericRouteSkeleton rows={5} />
  }

  if (error || !book || !critique) {
    return (
      <div className='min-h-screen bg-theme-gradient flex items-center justify-center'>
        <div className='text-center'>
          <BookOpen className='h-12 w-12 text-gray-400 mx-auto mb-4' />
          <p className='text-theme-secondary mb-4'>{error ?? "서평을 찾을 수 없습니다."}</p>
          <button
            onClick={() =>
              router.push(
                resolvedParams
                  ? `/book/${resolvedParams.id}/${resolvedParams.user_id}`
                  : "/"
              )
            }
            className='px-4 py-2 bg-accent-theme text-white rounded-lg hover:bg-accent-theme-secondary transition-colors'
          >
            돌아가기
          </button>
        </div>
      </div>
    )
  }

  const isOwner = userUid === critique.user_id

  return (
    <div className='min-h-screen bg-theme-gradient pb-20'>
      <div className='container mx-auto px-4 py-4'>
        <div className='flex items-center gap-4 mb-6'>
          <button
            onClick={() =>
              router.push(`/book/${resolvedParams!.id}/${resolvedParams!.user_id}`)
            }
            className='p-2 rounded-full bg-theme-secondary shadow-sm hover:shadow-md transition-shadow'
          >
            <ArrowLeft className='h-5 w-5 text-theme-secondary' />
          </button>
          <div className='flex-1 min-w-0'>
            <h1 className='text-xl font-semibold text-theme-primary truncate'>
              {book.title}
            </h1>
            <p className='text-sm text-theme-secondary'>서평</p>
          </div>
          {isOwner && (
            <div className='flex items-center gap-2'>
              <button
                onClick={() =>
                  router.push(
                    `/book/${resolvedParams!.id}/${resolvedParams!.user_id}/critiques/${resolvedParams!.critiqueId}/edit`
                  )
                }
                className='p-2 rounded-full bg-theme-secondary shadow-sm hover:shadow-md transition-shadow'
                title='수정'
              >
                <PenSquare className='h-5 w-5 text-theme-secondary' />
              </button>
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className='p-2 rounded-full bg-theme-secondary shadow-sm hover:shadow-md transition-shadow text-red-500 hover:text-red-600'
                title='삭제'
              >
                <Trash2 className='h-5 w-5' />
              </button>
            </div>
          )}
        </div>

        <div className='bg-theme-secondary rounded-lg shadow-sm p-4'>
          <p className='text-xs text-theme-tertiary mb-2'>{book.title}</p>
          {critique.title && (
            <h2 className='text-lg font-semibold text-theme-primary mb-3'>
              {critique.title}
            </h2>
          )}
          <div className='text-theme-primary whitespace-pre-wrap text-sm leading-relaxed mb-4'>
            {critique.content}
          </div>

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
                    onClick={handleToggleLike}
                    disabled={!userUid || isTogglingLike}
                    className={`flex items-center gap-1 transition-colors text-theme-secondary ${!userUid ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                    title={isLiked ? "좋아요 취소" : "좋아요"}
                  >
                    <Heart className={`h-4 w-4 ${isLiked ? "text-red-500 fill-red-500" : "text-red-500"}`} />
                    <span className='text-xs'>{likesCount}</span>
                  </button>
                )}
              </div>
              <CommentSection
                contentType='critique'
                contentId={critique.id}
                isPublic={critique.isPublic}
                initialCommentsCount={critique.commentsCount ?? 0}
              />
            </>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={async () => {
          if (!critique || !resolvedParams) return
          await CritiqueService.deleteCritique(critique.id)
          router.push(`/book/${resolvedParams.id}/${resolvedParams.user_id}`)
        }}
        title='서평 삭제'
        message='이 서평을 삭제하시겠습니까? 삭제하면 달린 의견(댓글)도 모두 삭제됩니다.'
        confirmText='삭제'
        cancelText='취소'
        icon={Trash2}
      />
    </div>
  )
}
