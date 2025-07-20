"use client"

import { useState, useEffect } from "react"
import {
  ArrowLeft,
  Star,
  Play,
  Pause,
  Clock,
  Calendar,
  BookOpen,
  CheckCircle,
  RotateCcw,
  Edit,
  Save,
  MessageSquare,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { Book, ReadingSession } from "@/types/book"
import RereadModal from "@/components/RereadModal"
import EditBookModal from "@/components/EditBookModal"
import CompleteBookModal from "@/components/CompleteBookModal"
import { getBookFromStorage, saveBookToStorage } from "@/utils/storage"

export default function BookDetailPage({
  params,
}: {
  params: { id: string; userId: string }
}) {
  const router = useRouter()
  const [book, setBook] = useState<Book | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [timerStartTime, setTimerStartTime] = useState<Date | null>(null)
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [isRereadModalOpen, setIsRereadModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // 책 데이터 로드
  useEffect(() => {
    const loadBook = () => {
      const storedBook = getBookFromStorage(params.id)
      if (storedBook) {
        setBook(storedBook)
      } else {
        // 책을 찾을 수 없으면 기본 페이지로 리다이렉트
        router.push("/")
        return
      }
      setIsLoading(false)
    }

    loadBook()
  }, [params.id, router])

  // 책 데이터가 변경될 때마다 로컬스토리지에 저장
  useEffect(() => {
    if (book && !isLoading) {
      saveBookToStorage(book)
    }
  }, [book, isLoading])

  useEffect(() => {
    if (isTimerRunning && timerStartTime) {
      const interval = setInterval(() => {
        setCurrentTime(new Date())
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [isTimerRunning, timerStartTime])

  const startTimer = () => {
    const now = new Date()
    setTimerStartTime(now)
    setCurrentTime(now)
    setIsTimerRunning(true)

    if (book && !book.hasStartedReading) {
      setBook((prev: Book | null) => {
        if (!prev) return prev
        return {
          ...prev,
          status: "reading",
          hasStartedReading: true,
        }
      })
    }
  }

  const stopTimer = () => {
    if (timerStartTime && book) {
      const endTime = new Date()
      const duration = Math.floor(
        (endTime.getTime() - timerStartTime.getTime()) / 1000
      )

      const newSession: ReadingSession = {
        id: Date.now().toString(),
        startTime: timerStartTime.toLocaleTimeString("ko-KR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        endTime: endTime.toLocaleTimeString("ko-KR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        duration,
        date: new Date().toISOString().split("T")[0],
      }

      setBook((prev: Book | null) => {
        if (!prev) return prev
        return {
          ...prev,
          readingSessions: [...prev.readingSessions, newSession],
        }
      })
    }
    setIsTimerRunning(false)
    setTimerStartTime(null)
    setCurrentTime(null)
  }

  const getElapsedTime = () => {
    if (!timerStartTime || !currentTime) return 0
    return Math.floor((currentTime.getTime() - timerStartTime.getTime()) / 1000)
  }

  const handleEditBook = (updatedBook: Book) => {
    setBook(updatedBook)
    setHasUnsavedChanges(true)
  }

  const handleSaveChanges = () => {
    setHasUnsavedChanges(false)
    setBook((prev: Book | null) => {
      if (!prev) return prev
      return {
        ...prev,
        isEdited: false,
        originalData: undefined,
      }
    })
  }

  const markAsCompleted = () => {
    setBook((prev: Book | null) => {
      if (!prev) return prev
      return {
        ...prev,
        status: "completed",
        completedDate: new Date().toISOString().split("T")[0],
      }
    })
  }

  const handleReread = () => {
    setBook((prev: Book | null) => {
      if (!prev) return prev
      return {
        ...prev,
        status: "reading",
        hasStartedReading: true,
      }
    })
  }

  const handleCancelCompletion = () => {
    setBook((prev: Book | null) => {
      if (!prev) return prev
      return {
        ...prev,
        status: "reading",
        completedDate: undefined,
      }
    })
  }

  const totalReadingTime =
    book?.readingSessions.reduce(
      (acc: number, session: ReadingSession) => acc + session.duration,
      0
    ) || 0

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

  const isCompleted = book?.status === "completed"

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
              {book.title}
            </h1>
            <p className='text-sm text-gray-600 dark:text-gray-400'>
              {book.author || "저자 미상"}
            </p>
          </div>
          <button
            onClick={() => setIsEditModalOpen(true)}
            className='p-2 rounded-full bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow'
          >
            <Edit className='h-5 w-5 text-gray-600 dark:text-gray-400' />
          </button>
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

              <div className='flex items-center gap-2 mb-3'>
                <span className='text-sm text-gray-600 dark:text-gray-400'>
                  평점:
                </span>
                <div className='flex gap-1'>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-5 w-5 ${
                        star <= book.rating
                          ? "text-yellow-400 fill-current"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
              </div>

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
                  <CheckCircle className='h-4 w-4' />
                  <span>완독일: {book.completedDate}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6'>
          <div className='flex items-center justify-between mb-4'>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
              독서 타이머
            </h3>
            {!isCompleted && book.hasStartedReading && (
              <button
                onClick={() => setIsCompleteModalOpen(true)}
                className='flex items-center gap-2 px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-sm rounded-md transition-colors'
              >
                <CheckCircle className='h-4 w-4' />
                완독하기
              </button>
            )}
            {isCompleted && (
              <div className='flex gap-2'>
                <button
                  onClick={handleCancelCompletion}
                  className='flex items-center gap-2 px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white text-sm rounded-md transition-colors'
                >
                  <RotateCcw className='h-4 w-4' />
                  완독 취소
                </button>
                <button
                  onClick={() =>
                    router.push(`/book/${params.id}/${params.userId}/review`)
                  }
                  className='flex items-center gap-2 px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-md transition-colors'
                >
                  <MessageSquare className='h-4 w-4' />
                  리뷰 작성
                </button>
              </div>
            )}
          </div>

          <div className='text-center mb-4'>
            {isTimerRunning ? (
              <div className='text-3xl font-mono text-blue-600 dark:text-blue-400 mb-4'>
                {Math.floor(getElapsedTime() / 3600)
                  .toString()
                  .padStart(2, "0")}
                :
                {Math.floor((getElapsedTime() % 3600) / 60)
                  .toString()
                  .padStart(2, "0")}
                :{(getElapsedTime() % 60).toString().padStart(2, "0")}
              </div>
            ) : (
              <div className='text-3xl font-mono text-gray-400 mb-4'>
                00:00:00
              </div>
            )}
          </div>

          <div className='flex gap-3'>
            {isCompleted ? (
              <button
                onClick={() => setIsRereadModalOpen(true)}
                className='flex-1 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg transition-colors'
              >
                <RotateCcw className='h-5 w-5' />
                계속 읽기
              </button>
            ) : !isTimerRunning ? (
              <button
                onClick={startTimer}
                className='flex-1 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg transition-colors'
              >
                <Play className='h-5 w-5' />
                타이머 시작
              </button>
            ) : (
              <button
                onClick={stopTimer}
                className='flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-3 px-4 rounded-lg transition-colors'
              >
                <Pause className='h-5 w-5' />
                타이머 정지
              </button>
            )}
          </div>
        </div>

        <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
            독서 기록
          </h3>

          {book.readingSessions.length === 0 ? (
            <p className='text-gray-600 dark:text-gray-400 text-center py-8'>
              아직 독서 기록이 없습니다. 타이머를 시작해보세요!
            </p>
          ) : (
            <div
              className={`space-y-3 ${
                book.readingSessions.length > 10
                  ? "max-h-80 overflow-y-auto"
                  : ""
              }`}
            >
              {book.readingSessions
                .sort(
                  (a: ReadingSession, b: ReadingSession) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                )
                .map((session: ReadingSession) => (
                  <div
                    key={session.id}
                    className='flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg'
                  >
                    <div>
                      <div className='text-sm font-medium text-gray-900 dark:text-white'>
                        {session.date}
                      </div>
                      <div className='text-xs text-gray-600 dark:text-gray-400'>
                        {session.startTime} - {session.endTime}
                      </div>
                    </div>
                    <div className='text-sm font-medium text-blue-600 dark:text-blue-400'>
                      {Math.floor(session.duration / 60)}분{" "}
                      {session.duration % 60}초
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {book.review && (
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mt-6'>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
              독서 리뷰
            </h3>
            <div className='bg-gray-50 dark:bg-gray-700 rounded-lg p-4'>
              <div className='flex items-center gap-2 mb-3'>
                <span className='text-sm text-gray-600 dark:text-gray-400'>
                  평점:
                </span>
                <div className='flex gap-1'>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= book.rating
                          ? "text-yellow-400 fill-current"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <span className='text-sm text-gray-600 dark:text-gray-400'>
                  {book.rating}점
                </span>
              </div>
              <div className='text-gray-900 dark:text-white whitespace-pre-wrap'>
                {book.review}
              </div>
            </div>
          </div>
        )}
      </div>

      {hasUnsavedChanges && (
        <div className='fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4'>
          <div className='container mx-auto flex items-center justify-between'>
            <span className='text-sm text-gray-600 dark:text-gray-400'>
              변경사항이 저장되지 않았습니다
            </span>
            <button
              onClick={handleSaveChanges}
              className='flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors'
            >
              <Save className='h-4 w-4' />
              변경사항 저장
            </button>
          </div>
        </div>
      )}

      <RereadModal
        isOpen={isRereadModalOpen}
        onClose={() => setIsRereadModalOpen(false)}
        onConfirm={handleReread}
        bookTitle={book.title}
      />

      <EditBookModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleEditBook}
        book={book}
      />

      <CompleteBookModal
        isOpen={isCompleteModalOpen}
        onClose={() => setIsCompleteModalOpen(false)}
        onConfirm={markAsCompleted}
        bookTitle={book.title}
      />
    </div>
  )
}
