"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Star, BookOpen, Save, Calendar, Clock } from "lucide-react"
import { useRouter } from "next/navigation"
import { Book } from "@/types/book"
import { getBookFromStorage, saveBookToStorage } from "@/utils/storage"

export default function ReviewPage({
  params,
}: {
  params: { id: string; userId: string }
}) {
  const router = useRouter()
  const [book, setBook] = useState<Book | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [review, setReview] = useState("")
  const [rating, setRating] = useState(0)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const loadBook = () => {
      const storedBook = getBookFromStorage(params.id)
      if (storedBook) {
        setBook(storedBook)
        setRating(storedBook.rating)
        setReview(storedBook.review || "")
      } else {
        // 책을 찾을 수 없으면 기본 페이지로 리다이렉트
        router.push("/")
        return
      }
      setIsLoading(false)
    }

    loadBook()
  }, [params.id, router])

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

  const totalReadingTime =
    book?.readingSessions.reduce(
      (acc: number, session) => acc + session.duration,
      0
    ) || 0

  const handleSaveReview = async () => {
    if (!book) return

    setIsSaving(true)

    // 로컬스토리지에 저장
    const updatedBook = {
      ...book,
      rating,
      review,
    }

    saveBookToStorage(updatedBook)

    setTimeout(() => {
      setIsSaving(false)
      router.back()
    }, 1000)
  }

  if (isLoading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center'>
        <div className='text-center'>
          <BookOpen className='h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse' />
          <p className='text-gray-600 dark:text-gray-400'>로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!book) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center'>
        <div className='text-center'>
          <BookOpen className='h-12 w-12 text-gray-400 mx-auto mb-4' />
          <p className='text-gray-600 dark:text-gray-400'>
            책을 찾을 수 없습니다.
          </p>
          <button
            onClick={() => router.push("/")}
            className='mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors'
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 pb-20'>
      <div className='container mx-auto px-4 py-4'>
        <div className='flex items-center gap-4 mb-6'>
          <button
            onClick={() => router.back()}
            className='p-2 rounded-full bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow'
          >
            <ArrowLeft className='h-5 w-5 text-gray-600 dark:text-gray-400' />
          </button>
          <div className='flex-1'>
            <h1 className='text-xl font-bold text-gray-900 dark:text-white'>
              독서 리뷰 작성
            </h1>
            <p className='text-sm text-gray-600 dark:text-gray-400'>
              {book.title}
            </p>
          </div>
        </div>

        <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6'>
          <div className='flex items-start gap-4'>
            <div className='w-20 h-24 bg-gray-200 dark:bg-gray-700 rounded-md flex items-center justify-center flex-shrink-0'>
              <BookOpen className='h-10 w-10 text-gray-400' />
            </div>
            <div className='flex-1'>
              <h2 className='text-lg font-semibold text-gray-900 dark:text-white mb-2'>
                {book.title}
              </h2>
              <p className='text-gray-600 dark:text-gray-400 mb-3'>
                {book.author || "저자 미상"}
              </p>

              <div className='space-y-2 text-sm text-gray-600 dark:text-gray-400'>
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

        <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
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
          <p className='text-sm text-gray-600 dark:text-gray-400'>{rating}점</p>
        </div>

        <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
            리뷰 작성
          </h3>
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder='이 책에 대한 생각을 자유롭게 작성해보세요...'
            className='w-full h-48 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none'
          />
          <p className='text-xs text-gray-500 dark:text-gray-400 mt-2'>
            {review.length}자
          </p>
        </div>

        <div className='flex gap-3'>
          <button
            onClick={() => router.back()}
            className='flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'
          >
            취소
          </button>
          <button
            onClick={handleSaveReview}
            disabled={isSaving}
            className='flex-1 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white py-3 px-4 rounded-lg transition-colors'
          >
            <Save className='h-5 w-5' />
            {isSaving ? "저장 중..." : "리뷰 저장"}
          </button>
        </div>
      </div>
    </div>
  )
}
