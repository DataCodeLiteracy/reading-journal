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
  AlertCircle,
  Trash2,
  ClipboardList,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { Book } from "@/types/book"
import { ReadingSession, UserChecklist } from "@/types/user"
import RereadModal from "@/components/RereadModal"
import EditBookModal from "@/components/EditBookModal"
import CompleteBookModal from "@/components/CompleteBookModal"
import ConfirmModal from "@/components/ConfirmModal"
import ChecklistModal from "@/components/ChecklistModal"
import { useAuth } from "@/contexts/AuthContext"
import { useData } from "@/contexts/DataContext"
import { BookService } from "@/services/bookService"
import { ReadingSessionService } from "@/services/readingSessionService"
import { UserStatisticsService } from "@/services/userStatisticsService"
import { ChecklistService } from "@/services/checklistService"

import { ApiError } from "@/lib/apiClient"

export default function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string; user_id: string }>
}) {
  const router = useRouter()
  const { userUid } = useAuth()
  const {
    allBooks,
    updateBook,
    removeBook,
    addReadingSession,
    removeReadingSession,
    updateStatistics,
  } = useData()

  const [book, setBook] = useState<Book | null>(null)
  const [readingSessions, setReadingSessions] = useState<ReadingSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resolvedParams, setResolvedParams] = useState<{
    id: string
    user_id: string
  } | null>(null)

  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [timerStartTime, setTimerStartTime] = useState<Date | null>(null)
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [isTimerProcessing, setIsTimerProcessing] = useState(false)
  const [isRereadModalOpen, setIsRereadModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleteSessionModalOpen, setIsDeleteSessionModalOpen] =
    useState(false)
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isOnHoldModalOpen, setIsOnHoldModalOpen] = useState(false)

  // 체크리스트 관련 상태
  const [userChecklist, setUserChecklist] = useState<UserChecklist | null>(null)
  const [preReadingChecklist, setPreReadingChecklist] = useState<any[]>([])
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false)
  const [showChecklistReminder, setShowChecklistReminder] = useState(false)

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

        const bookData = await BookService.getBook(resolvedParams.id)

        if (!bookData) {
          setError("책을 찾을 수 없습니다.")
          return
        }

        setBook(bookData)

        try {
          const sessionsData =
            await ReadingSessionService.getBookReadingSessions(
              resolvedParams.id
            )
          setReadingSessions(sessionsData)

          // 체크리스트 데이터 로드
          if (userUid) {
            const checklistData = await ChecklistService.getUserChecklist(
              userUid
            )
            setUserChecklist(checklistData)

            // 시스템 체크리스트 로드 (실패 시 기본값 사용)
            try {
              const systemChecklist = await ChecklistService.getSystemChecklist(
                "pre-reading"
              )
              if (systemChecklist) {
                setPreReadingChecklist(systemChecklist.items)
              } else {
                setPreReadingChecklist(
                  ChecklistService.getDefaultPreReadingChecklist()
                )
              }
            } catch (error) {
              console.error(
                "Failed to load system checklist, using default:",
                error
              )
              setPreReadingChecklist(
                ChecklistService.getDefaultPreReadingChecklist()
              )
            }
          }
        } catch (error) {
          console.error("Error loading reading sessions:", error)
          setError("독서 세션을 불러오는 중 오류가 발생했습니다.")
        }
      } catch (error) {
        if (error instanceof ApiError) {
          setError(error.message)
        } else {
          setError("책 정보를 불러오는 중 오류가 발생했습니다.")
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadBook()
  }, [resolvedParams, userUid])

  // 타이머 업데이트
  useEffect(() => {
    if (isTimerRunning && timerStartTime) {
      const interval = setInterval(() => {
        setCurrentTime(new Date())
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [isTimerRunning, timerStartTime])

  const startTimer = async () => {
    if (isTimerProcessing) return // 이미 처리 중이면 무시

    // 체크리스트 확인 여부 체크
    const isChecklistValid =
      ChecklistService.isPreReadingCheckValid(userChecklist)

    if (!isChecklistValid) {
      setShowChecklistReminder(true)
      return
    }

    try {
      setIsTimerProcessing(true)
      const now = new Date()
      setTimerStartTime(now)
      setCurrentTime(now)
      setIsTimerRunning(true)

      if (book && !book.hasStartedReading) {
        try {
          await BookService.updateBookStatus(
            resolvedParams?.id || "",
            "reading",
            resolvedParams?.user_id || ""
          )

          // DataContext의 책 상태 업데이트
          const updatedBook = {
            ...book,
            status: "reading" as const,
            hasStartedReading: true,
          }
          setBook(updatedBook)
          updateBook(resolvedParams?.id || "", updatedBook)
        } catch (error) {
          setError("책 상태를 업데이트하는 중 오류가 발생했습니다.")
        }
      }
    } catch (error) {
      setError("타이머를 시작하는 중 오류가 발생했습니다.")
    } finally {
      setIsTimerProcessing(false)
    }
  }

  const stopTimer = async () => {
    if (isTimerProcessing) return // 이미 처리 중이면 무시

    if (timerStartTime && book) {
      try {
        setIsTimerProcessing(true)
        const endTime = new Date()
        const duration = Math.floor(
          (endTime.getTime() - timerStartTime.getTime()) / 1000
        )

        const newSession: Omit<
          ReadingSession,
          "id" | "created_at" | "updated_at"
        > = {
          user_id: resolvedParams?.user_id || "",
          bookId: resolvedParams?.id || "",
          startTime: timerStartTime.toISOString(), // UTC 시간으로 저장
          endTime: endTime.toISOString(), // UTC 시간으로 저장
          duration,
          date: timerStartTime.toISOString().split("T")[0], // 타이머 시작 시간 기준으로 날짜 설정
        }

        try {
          const sessionId = await ReadingSessionService.createReadingSession(
            newSession
          )

          const createdSession =
            await ReadingSessionService.getBookReadingSessions(
              resolvedParams?.id || ""
            )
          setReadingSessions(createdSession)

          // DataContext에 새 세션 추가
          const sessionWithId = {
            ...newSession,
            id: sessionId,
          } as ReadingSession
          await addReadingSession(sessionWithId)

          // 통계 업데이트는 addReadingSession에서 자동으로 처리됨
        } catch (error) {
          console.error("Error creating reading session:", error)
          setError("독서 세션을 저장하는 중 오류가 발생했습니다.")
        }

        setIsTimerRunning(false)
        setTimerStartTime(null)
        setCurrentTime(null)
      } catch (error) {
        setError("타이머를 정지하는 중 오류가 발생했습니다.")
      } finally {
        setIsTimerProcessing(false)
      }
    }
  }

  const getElapsedTime = () => {
    if (!timerStartTime || !currentTime) return 0
    return Math.floor((currentTime.getTime() - timerStartTime.getTime()) / 1000)
  }

  // 시간 표시용 포맷 함수 (ISO 형식이면 한국 시간으로, 기존 형식이면 그대로)
  const formatTimeForDisplay = (timeString: string) => {
    if (timeString.includes("T") && timeString.includes("Z")) {
      // ISO 형식인 경우 한국 시간으로 변환
      const date = new Date(timeString)
      const koreaHour = (date.getUTCHours() + 9) % 24
      const koreaMinute = date.getUTCMinutes()
      const koreaSecond = date.getUTCSeconds()

      // 오전/오후 구분
      const period = koreaHour < 12 ? "오전" : "오후"
      const displayHour =
        koreaHour === 0 ? 12 : koreaHour > 12 ? koreaHour - 12 : koreaHour

      return `${period} ${displayHour.toString().padStart(2, "0")}:${koreaMinute
        .toString()
        .padStart(2, "0")}:${koreaSecond.toString().padStart(2, "0")}`
    } else {
      // 기존 형식인 경우 그대로 반환
      return timeString
    }
  }

  const handleEditBook = async (updatedBook: Book) => {
    try {
      setError(null)
      await BookService.updateBook(resolvedParams?.id || "", updatedBook)
      setBook(updatedBook)

      // DataContext의 책 정보 업데이트
      updateBook(resolvedParams?.id || "", updatedBook)

      setHasUnsavedChanges(true)
    } catch (error) {
      if (error instanceof ApiError) {
        setError(error.message)
      } else {
        setError("책 정보를 업데이트하는 중 오류가 발생했습니다.")
      }
    }
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

  const markAsCompleted = async () => {
    try {
      setError(null)
      await BookService.updateBookStatus(
        resolvedParams?.id || "",
        "completed",
        resolvedParams?.user_id || ""
      )

      const updatedBook = {
        ...book!,
        status: "completed" as const,
        completedDate: new Date().toISOString().split("T")[0],
      }
      setBook(updatedBook)

      // DataContext의 책 상태 업데이트
      updateBook(resolvedParams?.id || "", updatedBook)
    } catch (error) {
      if (error instanceof ApiError) {
        setError(error.message)
      } else {
        setError("책을 완독으로 표시하는 중 오류가 발생했습니다.")
      }
    }
  }

  const handleReread = async () => {
    try {
      setError(null)
      await BookService.updateBookStatus(
        resolvedParams?.id || "",
        "reading",
        resolvedParams?.user_id || ""
      )

      const updatedBook = {
        ...book!,
        status: "reading" as const,
        hasStartedReading: true,
      }
      setBook(updatedBook)

      // DataContext의 책 상태 업데이트
      updateBook(resolvedParams?.id || "", updatedBook)
    } catch (error) {
      if (error instanceof ApiError) {
        setError(error.message)
      } else {
        setError("다시 읽기 상태로 변경하는 중 오류가 발생했습니다.")
      }
    }
  }

  const handleCancelCompletion = async () => {
    try {
      setError(null)
      await BookService.updateBookStatus(
        resolvedParams?.id || "",
        "reading",
        resolvedParams?.user_id || ""
      )

      const updatedBook = {
        ...book!,
        status: "reading" as const,
        completedDate: undefined,
      }
      setBook(updatedBook)

      // DataContext의 책 상태 업데이트
      updateBook(resolvedParams?.id || "", updatedBook)
    } catch (error) {
      if (error instanceof ApiError) {
        setError(error.message)
      } else {
        setError("완독 취소 중 오류가 발생했습니다.")
      }
    }
  }

  const handlePutOnHold = async () => {
    try {
      setError(null)
      await BookService.updateBookStatus(
        resolvedParams?.id || "",
        "on-hold",
        resolvedParams?.user_id || ""
      )

      const updatedBook = {
        ...book!,
        status: "on-hold" as const,
      }
      setBook(updatedBook)

      // DataContext의 책 상태 업데이트
      updateBook(resolvedParams?.id || "", updatedBook)
    } catch (error) {
      if (error instanceof ApiError) {
        setError(error.message)
      } else {
        setError("보류 상태로 변경하는 중 오류가 발생했습니다.")
      }
    }
  }

  const handleDeleteReadingSession = async (sessionId: string) => {
    setSessionToDelete(sessionId)
    setIsDeleteSessionModalOpen(true)
  }

  const confirmDeleteReadingSession = async () => {
    if (!sessionToDelete) return

    try {
      setError(null)
      await ReadingSessionService.deleteReadingSession(sessionToDelete)

      // 독서 기록 목록을 다시 가져와서 UI 업데이트
      const updatedSessions =
        await ReadingSessionService.getBookReadingSessions(
          resolvedParams?.id || ""
        )
      setReadingSessions(updatedSessions)

      // DataContext에서 세션 제거
      await removeReadingSession(sessionToDelete)

      // 통계 업데이트는 removeReadingSession에서 자동으로 처리됨
    } catch (error) {
      if (error instanceof ApiError) {
        setError(error.message)
      } else {
        setError("독서 기록을 삭제하는 중 오류가 발생했습니다.")
      }
    } finally {
      setSessionToDelete(null)
    }
  }

  const handleDeleteBook = async () => {
    try {
      setError(null)
      await BookService.deleteBook(resolvedParams?.id || "")

      // DataContext에서 책 제거
      removeBook(resolvedParams?.id || "")

      router.push("/")
    } catch (error) {
      if (error instanceof ApiError) {
        setError(error.message)
      } else {
        setError("책을 삭제하는 중 오류가 발생했습니다.")
      }
    }
  }

  const handleChecklistComplete = async () => {
    if (userUid) {
      await ChecklistService.markPreReadingCompleted(userUid)
      const updatedChecklist = await ChecklistService.getUserChecklist(userUid)
      setUserChecklist(updatedChecklist)
    }
  }

  const openChecklistModal = () => {
    setIsChecklistModalOpen(true)
  }

  const totalReadingTime = readingSessions.reduce(
    (acc: number, session: ReadingSession) => acc + session.duration,
    0
  )

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
  const isOnHold = book?.status === "on-hold"

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

        {/* 상단 헤더 - 간소화 */}
        <div className='flex items-center gap-4 mb-6'>
          <button
            onClick={() => router.push("/")}
            className='p-2 rounded-full bg-theme-secondary shadow-sm hover:shadow-md transition-shadow'
          >
            <ArrowLeft className='h-5 w-5 text-theme-secondary' />
          </button>
          <div className='flex-1'></div>
          <div className='flex gap-2'>
            <button
              onClick={() => setIsEditModalOpen(true)}
              className='p-2 rounded-full bg-theme-secondary shadow-sm hover:shadow-md transition-shadow'
              title='책 정보 편집'
            >
              <Edit className='h-5 w-5 text-theme-secondary' />
            </button>
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className='p-2 rounded-full bg-theme-secondary shadow-sm hover:shadow-md transition-shadow'
              title='책 삭제'
            >
              <Trash2 className='h-5 w-5 text-theme-secondary' />
            </button>
          </div>
        </div>

        <div className='bg-theme-secondary rounded-lg shadow-sm p-4 mb-4'>
          <div className='flex items-start gap-3'>
            <div className='w-16 h-20 bg-theme-tertiary rounded-md flex items-center justify-center flex-shrink-0'>
              <BookOpen className='h-8 w-8 text-gray-400' />
            </div>
            <div className='flex-1'>
              <h2 className='text-lg font-semibold text-theme-primary mb-2'>
                {book.title}
              </h2>
              <p className='text-theme-secondary mb-3'>
                {book.author || "저자 미상"}
              </p>

              <div className='flex items-center gap-2 mb-3'>
                <span className='text-sm text-theme-secondary'>평점:</span>
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
              </div>

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
                  <CheckCircle className='h-4 w-4' />
                  <span>완독일: {book.completedDate}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 체크리스트 섹션 - 모바일 최적화 */}
        <div className='mb-4'>
          <button
            onClick={openChecklistModal}
            className={`w-full flex items-center justify-between py-3 px-4 rounded-lg transition-colors ${
              ChecklistService.isPreReadingCheckValid(userChecklist)
                ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                : "bg-purple-500 hover:bg-purple-600 text-white"
            }`}
          >
            <div className='flex items-center gap-2'>
              <ClipboardList className='h-4 w-4' />
              <span className='text-sm font-medium'>
                {ChecklistService.isPreReadingCheckValid(userChecklist)
                  ? "체크리스트 완료"
                  : "체크리스트 확인"}
              </span>
            </div>
            {userChecklist?.lastPreReadingCheck && (
              <span className='text-xs text-white/80 font-medium'>
                {(() => {
                  const lastCheckDate = ChecklistService.convertTimestampToDate(
                    userChecklist.lastPreReadingCheck
                  )
                  if (lastCheckDate) {
                    return lastCheckDate.toLocaleDateString("ko-KR", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  }
                  return "시간 정보 없음"
                })()}
              </span>
            )}
          </button>
        </div>

        {/* 주요 액션 버튼들 - 모바일 최적화 */}
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4'>
          {!isCompleted &&
            book.hasStartedReading &&
            readingSessions.length > 0 && (
              <button
                onClick={() => setIsCompleteModalOpen(true)}
                disabled={isTimerProcessing}
                className='flex items-center justify-center gap-2 py-3 px-4 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
              >
                <CheckCircle className='h-4 w-4' />
                완독하기
              </button>
            )}
          {!isCompleted && !isOnHold && book.hasStartedReading && (
            <button
              onClick={() => setIsOnHoldModalOpen(true)}
              disabled={isTimerProcessing}
              className='flex items-center justify-center gap-2 py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <Pause className='h-4 w-4' />
              보류하기
            </button>
          )}
          {isOnHold && (
            <button
              onClick={handleReread}
              disabled={isTimerProcessing}
              className='flex items-center justify-center gap-2 py-3 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <Play className='h-4 w-4' />
              다시 읽기
            </button>
          )}
          {isCompleted && (
            <>
              <button
                onClick={handleCancelCompletion}
                disabled={isTimerProcessing}
                className='flex items-center justify-center gap-2 py-3 px-4 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
              >
                <RotateCcw className='h-4 w-4' />
                완독 취소
              </button>
              <button
                onClick={() =>
                  router.push(
                    `/book/${resolvedParams?.id}/${resolvedParams?.user_id}/review`
                  )
                }
                disabled={isTimerProcessing}
                className='flex items-center justify-center gap-2 py-3 px-4 bg-accent-theme hover:bg-accent-theme-secondary text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
              >
                <MessageSquare className='h-4 w-4' />
                리뷰 작성
              </button>
            </>
          )}
        </div>

        <div className='bg-theme-secondary rounded-lg shadow-sm p-4 mb-4'>
          <div className='flex items-center justify-between mb-3'>
            <h3 className='text-lg font-semibold text-theme-primary'>
              독서 타이머
            </h3>
          </div>

          <div className='text-center mb-3'>
            {isTimerRunning ? (
              <div className='text-3xl font-mono text-accent-theme mb-3'>
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
              <div className='text-3xl font-mono text-theme-tertiary mb-3'>
                00:00:00
              </div>
            )}
          </div>

          {/* 타이머 컨트롤 버튼들 */}
          <div className='flex gap-3'>
            {isCompleted ? (
              <button
                onClick={() => setIsRereadModalOpen(true)}
                disabled={isTimerProcessing}
                className='flex-1 flex items-center justify-center gap-2 bg-accent-theme hover:bg-accent-theme-secondary text-white py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
              >
                <RotateCcw className='h-5 w-5' />
                계속 읽기
              </button>
            ) : isOnHold ? (
              <button
                onClick={handleReread}
                disabled={isTimerProcessing}
                className='flex-1 flex items-center justify-center gap-2 bg-accent-theme hover:bg-accent-theme-secondary text-white py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
              >
                <Play className='h-5 w-5' />
                다시 읽기
              </button>
            ) : !isTimerRunning ? (
              <button
                onClick={startTimer}
                disabled={isTimerProcessing}
                className='flex-1 flex items-center justify-center gap-2 bg-accent-theme hover:bg-accent-theme-secondary text-white py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
              >
                <Play className='h-5 w-5' />
                {isTimerProcessing ? "시작 중..." : "독서 시작"}
              </button>
            ) : (
              <button
                onClick={stopTimer}
                disabled={isTimerProcessing}
                className='flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
              >
                <Pause className='h-5 w-5' />
                {isTimerProcessing ? "정지 중..." : "독서 정지"}
              </button>
            )}
          </div>
        </div>

        <div className='bg-theme-secondary rounded-lg shadow-sm p-4'>
          <div className='flex items-center justify-between mb-3'>
            <h3 className='text-lg font-semibold text-theme-primary'>
              독서 기록
            </h3>
            <span className='text-sm text-theme-secondary bg-theme-tertiary px-2 py-1 rounded-full'>
              {readingSessions.length}개
            </span>
          </div>

          {readingSessions.length === 0 ? (
            <p className='text-theme-secondary text-center py-6'>
              아직 독서 기록이 없습니다. 타이머를 시작해보세요!
            </p>
          ) : (
            <div
              className={`space-y-2 ${
                readingSessions.length > 10 ? "max-h-80 overflow-y-auto" : ""
              }`}
            >
              {readingSessions.map((session: ReadingSession) => (
                <div
                  key={session.id}
                  className='flex items-center justify-between p-2 bg-theme-tertiary rounded-lg'
                >
                  <div>
                    <div className='text-xs font-medium text-theme-primary'>
                      {session.date}
                    </div>
                    <div className='text-xs text-theme-secondary'>
                      {formatTimeForDisplay(session.startTime)} -{" "}
                      {formatTimeForDisplay(session.endTime)}
                    </div>
                  </div>
                  <div className='flex items-center gap-2'>
                    <div className='text-xs font-medium text-accent-theme'>
                      {Math.floor(session.duration / 60)}분{" "}
                      {session.duration % 60}초
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteReadingSession(session.id)
                      }}
                      className='p-1 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors'
                      title='독서 기록 삭제'
                    >
                      <Trash2 className='h-3 w-3' />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {book.review && (
          <div className='bg-theme-secondary rounded-lg shadow-sm p-4 mt-4'>
            <h3 className='text-lg font-semibold text-theme-primary mb-3'>
              독서 리뷰
            </h3>
            <div className='bg-theme-tertiary rounded-lg p-3'>
              <div className='flex items-center gap-2 mb-2'>
                <span className='text-xs text-theme-secondary'>평점:</span>
                <div className='flex gap-1'>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-3 w-3 ${
                        star <= book.rating
                          ? "text-yellow-400 fill-current"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <span className='text-xs text-theme-secondary'>
                  {book.rating}점
                </span>
              </div>
              <div className='text-theme-primary whitespace-pre-wrap text-sm'>
                {book.review}
              </div>
            </div>
          </div>
        )}

        {/* 하단 고정 액션 바 - 변경사항 저장만 */}
        {hasUnsavedChanges && (
          <div className='fixed bottom-0 left-0 right-0 bg-theme-secondary border-t border-theme-tertiary p-4 z-40'>
            <div className='container mx-auto flex items-center justify-between'>
              <span className='text-sm text-theme-secondary'>
                변경사항이 저장되지 않았습니다
              </span>
              <button
                onClick={handleSaveChanges}
                className='flex items-center gap-2 px-4 py-2 bg-accent-theme hover:bg-accent-theme-secondary text-white rounded-md transition-colors'
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

        {/* 책 삭제 확인 모달 */}
        <ConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDeleteBook}
          title='책 삭제'
          message={`"${book?.title}" 책과 관련된 모든 독서 기록을 삭제하시겠습니까?`}
          confirmText='삭제'
          cancelText='취소'
          icon={Trash2}
        />

        {/* 독서 기록 삭제 확인 모달 */}
        {isDeleteSessionModalOpen && sessionToDelete && (
          <ConfirmModal
            isOpen={isDeleteSessionModalOpen}
            onClose={() => setIsDeleteSessionModalOpen(false)}
            onConfirm={confirmDeleteReadingSession}
            title='독서 기록 삭제'
            message={`"${
              readingSessions.find((s) => s.id === sessionToDelete)?.date
            }" 독서 기록을 삭제하시겠습니까?`}
            confirmText='삭제'
            cancelText='취소'
            icon={Trash2}
          />
        )}

        {/* 체크리스트 모달 */}
        <ChecklistModal
          isOpen={isChecklistModalOpen}
          onClose={() => setIsChecklistModalOpen(false)}
          onComplete={handleChecklistComplete}
          checklist={preReadingChecklist}
          title='독서 전 체크리스트'
          description='독서를 시작하기 전에 다음 항목들을 확인해주세요.'
        />

        {/* 체크리스트 리마인더 모달 */}
        {showChecklistReminder && (
          <ConfirmModal
            isOpen={showChecklistReminder}
            onClose={() => setShowChecklistReminder(false)}
            onConfirm={() => {
              setShowChecklistReminder(false)
              setIsChecklistModalOpen(true)
            }}
            title='독서 전 체크리스트'
            message='독서를 시작하기 전에 체크리스트를 확인해주세요.'
            confirmText='체크리스트 확인'
            cancelText='취소'
            icon={ClipboardList}
          />
        )}

        {/* 보류하기 확인 모달 */}
        <ConfirmModal
          isOpen={isOnHoldModalOpen}
          onClose={() => setIsOnHoldModalOpen(false)}
          onConfirm={handlePutOnHold}
          title='책을 보류하시겠습니까?'
          message={`"${book?.title}" 책을 보류하시겠습니까?\n\n보류된 책은 나중에 다시 읽기 상태로 변경할 수 있습니다.`}
          confirmText='보류하기'
          cancelText='취소'
          icon={Pause}
        />
      </div>
    </div>
  )
}
