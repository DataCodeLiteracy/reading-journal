"use client"

import { useState, useEffect } from "react"
import {
  ArrowLeft,
  Star,
  BookOpen,
  Save,
  Calendar,
  Clock,
  AlertCircle,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { Book } from "@/types/book"
import { ReadingSession } from "@/types/user"
import { useAuth } from "@/contexts/AuthContext"
import { BookService } from "@/services/bookService"
import { ReadingSessionService } from "@/services/readingSessionService"
import { ApiError } from "@/lib/apiClient"

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
  const [isSaving, setIsSaving] = useState(false)

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
        setReadingSessions(sessionsData)
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
  }, [resolvedParams])

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

    setIsSaving(true)

    try {
      setError(null)

      const updatedBook = {
        ...book,
        rating,
        review,
      }

      await BookService.updateBook(resolvedParams?.id || "", updatedBook)
      setBook(updatedBook)

      setTimeout(() => {
        setIsSaving(false)
        router.back()
      }, 1000)
    } catch (error) {
      if (error instanceof ApiError) {
        setError(error.message)
      } else {
        setError("리뷰를 저장하는 중 오류가 발생했습니다.")
      }
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className='min-h-screen bg-theme-gradient flex items-center justify-center'>
        <div className='text-center'>
          <BookOpen className='h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse' />
          <p className='text-theme-secondary'>로딩 중...</p>
        </div>
      </div>
    )
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

        <div className='flex items-center gap-4 mb-6'>
          <button
            onClick={() => router.back()}
            className='p-2 rounded-full bg-theme-secondary shadow-sm hover:shadow-md transition-shadow'
          >
            <ArrowLeft className='h-5 w-5 text-theme-secondary' />
          </button>
          <div className='flex-1'>
            <h1 className='text-xl font-bold text-theme-primary'>
              독서 리뷰 작성
            </h1>
            <p className='text-sm text-theme-secondary'>{book.title}</p>
          </div>
        </div>

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
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder='이 책에 대한 생각을 자유롭게 작성해보세요...'
            className='w-full h-48 px-4 py-3 border border-theme-tertiary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-theme bg-theme-primary text-theme-primary placeholder:text-theme-tertiary resize-none'
          />
          <p className='text-xs text-theme-tertiary mt-2'>{review.length}자</p>
        </div>

        <div className='flex gap-3'>
          <button
            onClick={() => router.back()}
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
