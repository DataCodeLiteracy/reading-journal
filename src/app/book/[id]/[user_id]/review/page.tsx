"use client"

import { useState, useEffect } from "react"
import {
  Star,
  BookOpen,
  Save,
  Calendar,
  Clock,
  AlertCircle,
  Lock,
  Globe,
  Heart,
  MessageSquare,
  PenSquare,
  Trash2,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { Book } from "@/types/book"
import { ReadingSession } from "@/types/user"
import { useAuth } from "@/contexts/AuthContext"
import { BookService } from "@/services/bookService"
import { ReadingSessionService } from "@/services/readingSessionService"
import { LikeService } from "@/services/likeService"
import CommentSection from "@/components/CommentSection"
import ConfirmModal from "@/components/ConfirmModal"
import { ApiError } from "@/lib/apiClient"
import { GenericRouteSkeleton } from "@/components/skeletons"
import { ReadingContentPackService } from "@/services/readingContentPackService"
import { gradeReadingReview } from "@/lib/readingAiClient"
import { BookSubpageHeader } from "@/components/BookSubpageHeader"
import { navigateBackSmart } from "@/utils/navigateBack"

export default function ReviewPage({
  params,
}: {
  params: Promise<{ id: string; user_id: string }>
}) {
  const router = useRouter()
  const { userUid } = useAuth()
  const [book, setBook] = useState<Book | null>(null)
  const [readingSessions, setReadingSessions] = useState<ReadingSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resolvedParams, setResolvedParams] = useState<{
    id: string
    user_id: string
  } | null>(null)

  const [review, setReview] = useState("")
  const [rating, setRating] = useState(0)
  const [isPublic, setIsPublic] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isReviewLiked, setIsReviewLiked] = useState(false)
  const [reviewLikesCount, setReviewLikesCount] = useState(0)
  const [isDeleteReviewModalOpen, setIsDeleteReviewModalOpen] = useState(false)
  const [overallSummaryRef, setOverallSummaryRef] = useState<string | null>(null)
  const [gradingAi, setGradingAi] = useState(false)
  const [gradingError, setGradingError] = useState<string | null>(null)

  useEffect(() => {
    params.then((resolved) => {
      setResolvedParams(resolved)
    })
  }, [params])

  useEffect(() => {
    if (!resolvedParams) return

    const loadBook = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const [bookData, sessionsData] = await Promise.all([
          BookService.getBook(resolvedParams.id),
          ReadingSessionService.getBookReadingSessions(resolvedParams.id),
        ])

        if (!bookData) {
          setError("책을 찾을 수 없습니다.")
          return
        }

        setBook(bookData)
        setRating(bookData.rating)
        setReview(bookData.review || "")
        setIsPublic(bookData.reviewIsPublic || false)
        setReadingSessions(sessionsData)

        try {
          const pack = await ReadingContentPackService.getForBook(bookData)
          setOverallSummaryRef(pack?.excerptBookMetadata?.overall_summary ?? null)
        } catch {
          setOverallSummaryRef(null)
        }

        const isOwner = userUid === bookData.user_id
        if (bookData.review && bookData.reviewIsPublic && userUid && !isOwner) {
          const like = await LikeService.getUserLike(userUid, "review", bookData.id)
          setIsReviewLiked(!!like)
          const count = await LikeService.getLikesCount("review", bookData.id)
          setReviewLikesCount(count)
        } else if (bookData.review && bookData.reviewIsPublic) {
          const count = await LikeService.getLikesCount("review", bookData.id)
          setReviewLikesCount(count)
        }
      } catch (error) {
        if (error instanceof ApiError) {
          if (error.code === "PERMISSION_DENIED") {
            setError(
              "데이터에 접근할 권한이 없습니다. 로그인을 다시 시도해주세요."
            )
          } else if (error.code === "NETWORK_ERROR") {
            setError("네트워크 연결을 확인해주세요.")
          } else {
            setError(error.message)
          }
        } else {
          setError("책 정보를 불러오는 중 오류가 발생했습니다.")
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadBook()
  }, [resolvedParams, userUid])

  const formatTotalTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    if (hours > 0) {
      return `${hours}시간 ${minutes}분 ${seconds}초`
    } else if (minutes > 0) {
      return `${minutes}분 ${seconds}초`
    } else {
      return `${seconds}초`
    }
  }

  const totalReadingTime = readingSessions.reduce(
    (acc: number, session) => acc + session.duration,
    0
  )

  const handleSaveReview = async () => {
    if (!book) return

    if (review.length > 50) {
      setError("리뷰는 50자 이내로 작성해주세요.")
      return
    }

    setIsSaving(true)

    try {
      setError(null)

      // 리뷰를 비우는 경우: 연쇄 삭제 후 업데이트
      if (!review.trim() && book.review) {
        const { CommentService } = await import("@/services/commentService")
        await CommentService.deleteAllCommentsForContent("review", resolvedParams?.id || book.id)
        await LikeService.deleteAllLikesForContent("review", resolvedParams?.id || book.id)
      }

      const reviewChanged =
        review.trim() !== (book.review || "").trim()
      const clearAiIfReviewEdited =
        book.reviewAiGradedAt && reviewChanged
          ? {
              reviewAiScore: undefined,
              reviewAiFeedback: undefined,
              reviewAiGradedAt: undefined,
            }
          : {}

      const updatedBook = {
        ...book,
        rating,
        review: review.trim(),
        reviewIsPublic: review.trim() ? isPublic : false,
        ...clearAiIfReviewEdited,
      }

      await BookService.updateBook(resolvedParams?.id || "", updatedBook)
      setBook(updatedBook)

      if (book.review) {
        setIsEditMode(false)
      } else {
        const shelfBase = `/book/${resolvedParams?.id || book.id}/${resolvedParams?.user_id || book.user_id}`
        setTimeout(() => {
          navigateBackSmart(router, shelfBase)
        }, 1000)
      }
      setIsSaving(false)
    } catch (error) {
      if (error instanceof ApiError) {
        setError(error.message)
      } else {
        setError("리뷰를 저장하는 중 오류가 발생했습니다.")
      }
      setIsSaving(false)
    }
  }

  const handleDeleteReview = async () => {
    if (!book || !resolvedParams) return
    try {
      setError(null)
      const { CommentService } = await import("@/services/commentService")
      await CommentService.deleteAllCommentsForContent("review", resolvedParams.id)
      await LikeService.deleteAllLikesForContent("review", resolvedParams.id)
      const updatedBook = {
        ...book,
        review: "",
        reviewIsPublic: false,
        reviewAiScore: undefined,
        reviewAiFeedback: undefined,
        reviewAiGradedAt: undefined,
      }
      await BookService.updateBook(resolvedParams.id, updatedBook)
      setBook(updatedBook)
      setIsDeleteReviewModalOpen(false)
      router.push(`/book/${resolvedParams.id}/${resolvedParams.user_id}`)
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else setError("리뷰를 삭제하는 중 오류가 발생했습니다.")
    }
  }

  const handleAiReviewGrade = async () => {
    if (!book || !resolvedParams || !overallSummaryRef) return
    const reviewText = (review || book.review || "").trim()
    if (!reviewText) return
    if (book.reviewAiGradedAt) return
    setGradingError(null)
    setGradingAi(true)
    try {
      const { score, feedback } = await gradeReadingReview({
        overallSummary: overallSummaryRef,
        userReview: reviewText,
      })
      const gradedAt = new Date().toISOString()
      await BookService.updateBook(resolvedParams.id, {
        reviewAiScore: score,
        reviewAiFeedback: feedback,
        reviewAiGradedAt: gradedAt,
      })
      setBook({
        ...book,
        reviewAiScore: score,
        reviewAiFeedback: feedback,
        reviewAiGradedAt: gradedAt,
      })
    } catch (e) {
      setGradingError(e instanceof Error ? e.message : "채점에 실패했습니다.")
    } finally {
      setGradingAi(false)
    }
  }

  if (isLoading) {
    return <GenericRouteSkeleton rows={5} />
  }

  if (error && !book) {
    return (
      <div className='min-h-screen bg-theme-gradient flex items-center justify-center'>
        <div className='text-center'>
          <BookOpen className='h-12 w-12 text-gray-400 mx-auto mb-4' />
          <p className='text-theme-secondary mb-4'>{error}</p>
          <button
            onClick={() => router.push("/")}
            className='px-4 py-2 bg-accent-theme text-white rounded-lg hover:bg-accent-theme-secondary transition-colors'
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  if (!book) {
    return (
      <div className='min-h-screen bg-theme-gradient flex items-center justify-center'>
        <div className='text-center'>
          <BookOpen className='h-12 w-12 text-gray-400 mx-auto mb-4' />
          <p className='text-theme-secondary'>책을 찾을 수 없습니다.</p>
          <button
            onClick={() => router.push("/")}
            className='mt-4 px-4 py-2 bg-accent-theme text-white rounded-lg hover:bg-accent-theme-secondary transition-colors'
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  const isOwner = userUid === book.user_id
  const bookBase = resolvedParams
    ? `/book/${resolvedParams.id}/${resolvedParams.user_id}`
    : `/book/${book.id}/${book.user_id}`
  const canViewReview = !!book.review && (isOwner || !!book.reviewIsPublic)
  const showViewMode = canViewReview && !isEditMode
  const showEditMode = isOwner && (!book.review || isEditMode)

  if (!isOwner && (!book.review || !book.reviewIsPublic)) {
    return (
      <div className='min-h-screen bg-theme-gradient pb-20'>
        <div className='container mx-auto px-4 py-4'>
          <BookSubpageHeader
            pageTitle='독서 리뷰'
            contextTitle={book.title}
            fallbackPath={bookBase}
          />
          <div className='bg-theme-secondary rounded-lg shadow-sm p-8 text-center'>
            <Star className='h-12 w-12 text-gray-400 mx-auto mb-4' />
            <p className='text-theme-secondary'>{!book.review ? "아직 리뷰가 없습니다." : "이 리뷰는 비공개입니다."}</p>
            <button onClick={() => router.push(resolvedParams ? `/book/${resolvedParams.id}/${resolvedParams.user_id}` : "/")} className='mt-4 px-4 py-2 bg-accent-theme text-white rounded-lg hover:bg-accent-theme-secondary transition-colors'>
              책으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (showViewMode) {
    return (
      <>
        <div className='min-h-screen bg-theme-gradient pb-20'>
          <div className='container mx-auto px-4 py-4 max-w-2xl'>
          {error && (
            <div className='mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg'>
              <div className='flex items-center gap-2'>
                <AlertCircle className='h-5 w-5 text-red-500' />
                <p className='text-red-700 dark:text-red-400 text-sm'>{error}</p>
              </div>
            </div>
          )}

          <BookSubpageHeader
            pageTitle='독서 리뷰'
            contextTitle={book.title}
            fallbackPath={bookBase}
            trailing={
              isOwner ? (
                <div className='flex items-center gap-2'>
                  <button
                    type='button'
                    onClick={() => setIsEditMode(true)}
                    className='p-2 rounded-full bg-theme-secondary shadow-sm hover:shadow-md transition-shadow shrink-0'
                    title='수정'
                  >
                    <PenSquare className='h-5 w-5 text-theme-secondary' />
                  </button>
                  <button
                    type='button'
                    onClick={() => setIsDeleteReviewModalOpen(true)}
                    className='p-2 rounded-full bg-theme-secondary shadow-sm hover:shadow-md transition-shadow text-red-500 hover:text-red-600 shrink-0'
                    title='리뷰 삭제'
                  >
                    <Trash2 className='h-5 w-5' />
                  </button>
                </div>
              ) : null
            }
          />

          {/* 리뷰 카드 */}
          <div className='bg-theme-secondary rounded-xl shadow-sm border-card overflow-hidden'>
            {/* 책 정보 한 줄 */}
            <div className='flex items-center gap-3 px-4 py-3 border-b border-theme-tertiary'>
              <div className='w-10 h-14 bg-theme-tertiary rounded flex items-center justify-center flex-shrink-0'>
                <BookOpen className='h-5 w-5 text-theme-tertiary' />
              </div>
              <div className='flex-1 min-w-0'>
                <p className='text-sm font-medium text-theme-primary truncate'>{book.title}</p>
                <p className='text-xs text-theme-secondary'>{book.author || "저자 미상"}</p>
              </div>
              <div className='flex items-center gap-1 shrink-0'>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${star <= book.rating ? "text-amber-400 fill-amber-400" : "text-theme-tertiary"}`}
                  />
                ))}
                <span className='text-xs text-theme-secondary ml-0.5'>{book.rating}점</span>
              </div>
            </div>

            {/* 리뷰 본문 */}
            <div className='px-4 py-5'>
              <p className='text-theme-primary text-base leading-relaxed whitespace-pre-wrap'>
                {book.review}
              </p>
            </div>

            {book.reviewAiScore != null && (
              <div className='px-4 pb-4 border-t border-theme-tertiary pt-4'>
                <p className='text-xs font-medium text-theme-tertiary mb-1'>
                  전체 요약 대비 AI 평가
                </p>
                <p className='text-lg font-bold text-accent-theme'>
                  {book.reviewAiScore}점 / 10
                </p>
                {book.reviewAiFeedback && (
                  <p className='text-sm text-theme-primary mt-2 whitespace-pre-wrap'>
                    <span className='text-theme-tertiary'>AI 한 줄 피드백 · </span>
                    {book.reviewAiFeedback}
                  </p>
                )}
              </div>
            )}

            {isOwner &&
              overallSummaryRef &&
              book.review?.trim() &&
              book.reviewAiScore == null &&
              !book.reviewAiGradedAt && (
                <div className='px-4 pb-4'>
                  {gradingError && (
                    <p className='text-sm text-red-600 mb-2'>{gradingError}</p>
                  )}
                  <button
                    type='button'
                    disabled={gradingAi}
                    onClick={handleAiReviewGrade}
                    className='w-full py-2.5 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium disabled:opacity-50'
                  >
                    {gradingAi ? "채점 중…" : "AI와 비교해 채점"}
                  </button>
                </div>
              )}

            {/* 좋아요: 개수는 항상 표시, 버튼은 비소유자만 */}
            {book.reviewIsPublic && (
              <div className='px-4 py-3 border-t border-theme-tertiary flex items-center gap-2'>
                {userUid !== book.user_id ? (
                  <button
                    onClick={async () => {
                      if (!userUid || !resolvedParams) return
                      try {
                        if (isReviewLiked) {
                          await LikeService.removeLike(userUid, "review", resolvedParams.id)
                          setIsReviewLiked(false)
                          setReviewLikesCount(await LikeService.getLikesCount("review", resolvedParams.id))
                        } else {
                          await LikeService.addLike(userUid, "review", resolvedParams.id)
                          setIsReviewLiked(true)
                          setReviewLikesCount(await LikeService.getLikesCount("review", resolvedParams.id))
                        }
                      } catch (err) {
                        console.error("Error toggling review like:", err)
                      }
                    }}
                    className='inline-flex items-center gap-1.5 transition-colors text-theme-secondary'
                  >
                    <Heart className={`h-4 w-4 ${isReviewLiked ? "text-red-500 fill-red-500" : "text-red-500"}`} />
                    <span className='text-sm'>{reviewLikesCount}</span>
                  </button>
                ) : (
                  <span className='inline-flex items-center gap-1.5 text-theme-secondary'>
                    <Heart className='h-4 w-4 text-red-500 fill-red-500' />
                    <span className='text-sm'>{reviewLikesCount}</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 의견 섹션 */}
          {book.reviewIsPublic && (
            <div className='mt-6'>
              <CommentSection
                contentType='review'
                contentId={resolvedParams?.id || ""}
                isPublic={!!book.reviewIsPublic}
              />
            </div>
          )}
      </div>
    </div>
      <ConfirmModal
        isOpen={isDeleteReviewModalOpen}
        onClose={() => setIsDeleteReviewModalOpen(false)}
        onConfirm={handleDeleteReview}
        title='리뷰 삭제'
        message='이 리뷰를 삭제하시겠습니까? 삭제하면 달린 의견도 모두 삭제됩니다.'
        confirmText='삭제'
        cancelText='취소'
        icon={Trash2}
      />
    </>
  )
  }

  return (
    <div className='min-h-screen bg-theme-gradient pb-20'>
      <div className='container mx-auto px-4 py-4'>
        {/* 에러 메시지 */}
        {error && (
          <div className='mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg'>
            <div className='flex items-center gap-2'>
              <AlertCircle className='h-5 w-5 text-red-500' />
              <p className='text-red-700 dark:text-red-400 text-sm'>{error}</p>
            </div>
          </div>
        )}

        <BookSubpageHeader
          pageTitle='독서 리뷰 작성'
          contextTitle={book.title}
          fallbackPath={bookBase}
        />

        <div className='bg-theme-secondary rounded-lg shadow-sm p-6 mb-6'>
          <div className='flex items-start gap-4'>
            <div className='w-20 h-24 bg-theme-tertiary rounded-md flex items-center justify-center flex-shrink-0'>
              <BookOpen className='h-10 w-10 text-gray-400' />
            </div>
            <div className='flex-1'>
              <h2 className='text-lg font-semibold text-theme-primary mb-2'>
                {book.title}
              </h2>
              <p className='text-theme-secondary mb-3'>
                {book.author || "저자 미상"}
              </p>

              <div className='space-y-2 text-sm text-theme-secondary'>
                <div className='flex items-center gap-1'>
                  <Calendar className='h-4 w-4' />
                  <span>출판일: {book.publishedDate || "미상"}</span>
                </div>
                <div className='flex items-center gap-1'>
                  <Clock className='h-4 w-4' />
                  <span>총 {formatTotalTime(totalReadingTime)}</span>
                </div>
              </div>

              {book.completedDate && (
                <div className='flex items-center gap-1 text-sm text-green-600 dark:text-green-400 mt-2'>
                  <span>완독일: {book.completedDate}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className='bg-theme-secondary rounded-lg shadow-sm p-6 mb-6'>
          <h3 className='text-lg font-semibold text-theme-primary mb-4'>
            평점
          </h3>
          <div className='flex gap-1 mb-4'>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className='p-1'
              >
                <Star
                  className={`h-8 w-8 ${
                    star <= rating
                      ? "text-yellow-400 fill-current"
                      : "text-gray-300"
                  }`}
                />
              </button>
            ))}
          </div>
          <p className='text-sm text-theme-secondary'>{rating}점</p>
        </div>

        <div className='bg-theme-secondary rounded-lg shadow-sm p-6 mb-6'>
          <h3 className='text-lg font-semibold text-theme-primary mb-4'>
            리뷰 작성
          </h3>
          <p className='text-xs text-theme-tertiary mb-2'>
            한 줄~두 줄 평으로 간단히 남겨보세요 (최대 50자)
          </p>
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value.slice(0, 50))}
            placeholder='이 책에 대한 한 줄 평을 남겨보세요...'
            maxLength={50}
            className='w-full h-24 px-4 py-3 border border-theme-tertiary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-theme bg-theme-primary text-theme-primary placeholder:text-theme-tertiary resize-none'
          />
          <p className='text-xs text-theme-tertiary mt-2'>
            {review.length}/50자
          </p>
        </div>

        {overallSummaryRef && review.trim() && isOwner && !book.reviewAiGradedAt && (
          <div className='bg-theme-secondary rounded-lg shadow-sm p-6 mb-6 border border-theme-tertiary'>
            <p className='text-sm text-theme-secondary mb-3'>
              등록된 책 전체 요약과 내 리뷰를 비교해 AI가 10점 만점과 한 줄 피드백을 남깁니다. (한 번만)
            </p>
            {gradingError && (
              <p className='text-sm text-red-600 mb-2'>{gradingError}</p>
            )}
            <button
              type='button'
              disabled={gradingAi}
              onClick={handleAiReviewGrade}
              className='w-full py-3 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium disabled:opacity-50'
            >
              {gradingAi ? "채점 중…" : "AI와 비교해 채점"}
            </button>
          </div>
        )}

        {book.reviewAiScore != null && isOwner && (
          <div className='bg-theme-secondary rounded-lg shadow-sm p-6 mb-6 border border-theme-tertiary'>
            <p className='text-xs font-medium text-theme-tertiary mb-1'>저장된 AI 평가</p>
            <p className='text-lg font-bold text-accent-theme'>{book.reviewAiScore}점 / 10</p>
            {book.reviewAiFeedback && (
              <p className='text-sm text-theme-primary mt-2 whitespace-pre-wrap'>
                <span className='text-theme-tertiary'>AI 한 줄 피드백 · </span>
                {book.reviewAiFeedback}
              </p>
            )}
          </div>
        )}

        {/* 공개 설정 */}
        <div className='bg-theme-secondary rounded-lg shadow-sm p-6 mb-6'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              {isPublic ? (
                <Globe className='h-5 w-5 text-blue-500' />
              ) : (
                <Lock className='h-5 w-5 text-gray-400' />
              )}
              <div>
                <label className='text-sm font-medium text-theme-primary cursor-pointer'>
                  공개하기
                </label>
                <p className='text-xs text-theme-tertiary'>
                  {isPublic
                    ? "다른 독서자들이 이 리뷰를 볼 수 있습니다"
                    : "나만 볼 수 있습니다"}
                </p>
              </div>
            </div>
            <button
              type='button'
              onClick={() => setIsPublic(!isPublic)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isPublic ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isPublic ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        <div className='flex gap-3'>
          <button
            type='button'
            onClick={() =>
              book.review ? setIsEditMode(false) : navigateBackSmart(router, bookBase)
            }
            className='flex-1 px-4 py-3 border border-theme-tertiary text-theme-primary rounded-lg hover:bg-theme-tertiary transition-colors'
          >
            취소
          </button>
          <button
            onClick={handleSaveReview}
            disabled={isSaving}
            className='flex-1 flex items-center justify-center gap-2 bg-accent-theme hover:bg-accent-theme-secondary disabled:bg-theme-tertiary text-white py-3 px-4 rounded-lg transition-colors'
          >
            <Save className='h-5 w-5' />
            {isSaving ? "저장 중..." : "리뷰 저장"}
          </button>
        </div>
      </div>
    </div>
  )
}
