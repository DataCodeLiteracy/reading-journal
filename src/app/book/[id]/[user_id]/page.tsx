"use client"

import { useState, useEffect, useRef } from "react"
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
  Plus,
  Globe,
  Lock,
  ChevronRight,
  NotebookPen,
  Sparkles,
  Settings,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Book } from "@/types/book"
import { ReadingSession, UserChecklist } from "@/types/user"
import RereadModal from "@/components/RereadModal"
import RereadDetailModal from "@/components/RereadDetailModal"
import EditBookModal from "@/components/EditBookModal"
import CompleteBookModal from "@/components/CompleteBookModal"
import ConfirmModal from "@/components/ConfirmModal"
import ChecklistModal from "@/components/ChecklistModal"
import SuccessModal from "@/components/SuccessModal"
import EditReadingSessionModal from "@/components/EditReadingSessionModal"
import AddReadingSessionModal from "@/components/AddReadingSessionModal"
// 체크리스트 컴포넌트 (현재 사용하지 않음, 나중에 사용할 수 있도록 유지)
// import PreReadingChecklistSection from "@/components/PreReadingChecklistSection"
import { useAuth } from "@/contexts/AuthContext"
import { useData } from "@/contexts/DataContext"
import { BookService } from "@/services/bookService"
import { ReadingSessionService } from "@/services/readingSessionService"
import { UserStatisticsService } from "@/services/userStatisticsService"
import { ChecklistService } from "@/services/checklistService"
import { getKoreaDate } from "@/utils/timeUtils"
import { ApiError } from "@/lib/apiClient"
import { RereadService } from "@/services/rereadService"
import { Reread } from "@/types/reread"
import { BookDetailRouteSkeleton } from "@/components/skeletons"
import ReadingTimerSettingsModal from "@/components/ReadingTimerSettingsModal"
import ReadingImmersiveFullscreen, {
  IMMERSIVE_TRANSITION_MS,
} from "@/components/ReadingImmersiveFullscreen"
import { useReadingTimerAmbient } from "@/hooks/useReadingTimerAmbient"
import { useReadingTimerSheet } from "@/contexts/ReadingTimerSheetContext"
import {
  READING_TIMER_AMBIENT_STORAGE_KEY,
  READING_TIMER_BG_STORAGE_KEY,
  READING_TIMER_DEFAULT_BG_ID,
  getTimerBgSrc,
  isValidAmbientTrackId,
  isValidTimerBgId,
} from "@/constants/readingTimerMedia"

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
  const [isRereadDetailModalOpen, setIsRereadDetailModalOpen] = useState(false)
  const [rereads, setRereads] = useState<Reread[]>([])
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleteSessionModalOpen, setIsDeleteSessionModalOpen] =
    useState(false)
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null)
  const [isEditSessionModalOpen, setIsEditSessionModalOpen] = useState(false)
  const [sessionToEdit, setSessionToEdit] = useState<ReadingSession | null>(null)
  const [isAddSessionModalOpen, setIsAddSessionModalOpen] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false)
  const [successModalTitle, setSuccessModalTitle] = useState("")
  const [successModalMessage, setSuccessModalMessage] = useState("")
  const [isHoldUpdating, setIsHoldUpdating] = useState(false)
  const [ambientTrackId, setAmbientTrackId] = useState("off")
  const [timerBgId, setTimerBgId] = useState(READING_TIMER_DEFAULT_BG_ID)
  const [isTimerSettingsOpen, setIsTimerSettingsOpen] = useState(false)
  const [cosmosOverlay, setCosmosOverlay] = useState<"off" | "on" | "fail">("off")
  /** 타이머 정지 후 전환 애니메이션 동안에도 마운트 유지 */
  const [immersiveVisible, setImmersiveVisible] = useState(false)
  const [immersiveExiting, setImmersiveExiting] = useState(false)
  const prevTimerRunningRef = useRef(false)

  const timerBgSrc = getTimerBgSrc(timerBgId)

  useReadingTimerAmbient(isTimerRunning, ambientTrackId)

  useEffect(() => {
    setCosmosOverlay("off")
  }, [isTimerRunning, timerBgId])

  const { setImmersiveOpen } = useReadingTimerSheet()

  useEffect(() => {
    if (book && isTimerRunning) {
      setImmersiveVisible(true)
      setImmersiveExiting(false)
    }
  }, [book, isTimerRunning])

  useEffect(() => {
    if (!book) {
      setImmersiveVisible(false)
      setImmersiveExiting(false)
      prevTimerRunningRef.current = false
      return
    }

    if (isTimerRunning) {
      prevTimerRunningRef.current = true
      return
    }

    const wasRunning = prevTimerRunningRef.current
    prevTimerRunningRef.current = false

    if (wasRunning && immersiveVisible) {
      setImmersiveExiting(true)
      const id = window.setTimeout(() => {
        setImmersiveVisible(false)
        setImmersiveExiting(false)
      }, IMMERSIVE_TRANSITION_MS)
      return () => window.clearTimeout(id)
    }
  }, [book, isTimerRunning, immersiveVisible])

  useEffect(() => {
    setImmersiveOpen(Boolean(book && immersiveVisible))
    return () => {
      setImmersiveOpen(false)
    }
  }, [book, immersiveVisible, setImmersiveOpen])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(READING_TIMER_AMBIENT_STORAGE_KEY)
      if (raw && isValidAmbientTrackId(raw)) setAmbientTrackId(raw)
      const rawBg = localStorage.getItem(READING_TIMER_BG_STORAGE_KEY)
      if (rawBg && isValidTimerBgId(rawBg)) setTimerBgId(rawBg)
      else setTimerBgId(READING_TIMER_DEFAULT_BG_ID)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(READING_TIMER_AMBIENT_STORAGE_KEY, ambientTrackId)
    } catch {
      /* ignore */
    }
  }, [ambientTrackId])

  useEffect(() => {
    try {
      localStorage.setItem(READING_TIMER_BG_STORAGE_KEY, timerBgId)
    } catch {
      /* ignore */
    }
  }, [timerBgId])

  // 체크리스트 관련 상태 (현재 서비스에서는 사용하지 않음)
  // 나중에 사용할 수 있도록 코드는 유지하되 주석 처리
  // const [userChecklist, setUserChecklist] = useState<UserChecklist | null>(null)
  // const [preReadingChecklist, setPreReadingChecklist] = useState<any[]>([])
  // const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false)
  // const [showChecklistReminder, setShowChecklistReminder] = useState(false)

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
          const [sessionsData, rereadsData] = await Promise.all([
            ReadingSessionService.getBookReadingSessions(resolvedParams.id),
            RereadService.getBookRereads(resolvedParams.id),
          ])
          setReadingSessions(sessionsData)
          setRereads(rereadsData)

          // 이미 완독된 책인데 회독 기록이 없는 경우 자동 생성
          if (
            bookData.status === "completed" &&
            bookData.completedDate &&
            rereadsData.length === 0
          ) {
            try {
              // 시작일 찾기
              let startDate: string
              if (sessionsData.length > 0) {
                // 가장 오래된 독서 세션 날짜
                const sortedSessions = [...sessionsData].sort((a, b) =>
                  a.date.localeCompare(b.date)
                )
                startDate = sortedSessions[0].date
              } else {
                // 독서 세션이 없으면 책의 시작일 또는 완독일 사용
                startDate = bookData.startDate || bookData.completedDate
              }

              const currentRereadCount = bookData.rereadCount ?? 0
              const rereadNumber = currentRereadCount > 0 ? currentRereadCount : 1

              // 회독 기록 생성
              await RereadService.createReread({
                bookId: resolvedParams.id,
                user_id: resolvedParams.user_id,
                rereadNumber: rereadNumber,
                startDate: startDate,
                completedDate: bookData.completedDate,
              })

              // 회독 기록 다시 로드
              const updatedRereads = await RereadService.getBookRereads(resolvedParams.id)
              setRereads(updatedRereads)

              // 회독 수가 없으면 업데이트
              if (!bookData.rereadCount || bookData.rereadCount === 0) {
                await BookService.updateBook(resolvedParams.id, {
                  rereadCount: rereadNumber,
                })
                const updatedBookData = await BookService.getBook(resolvedParams.id)
                if (updatedBookData) {
                  setBook(updatedBookData)
                }
              }
            } catch (error) {
              console.error("기존 완독 책 회독 기록 생성 오류:", error)
              // 오류가 발생해도 계속 진행
            }
          }

          // 체크리스트 데이터 로드 (현재 서비스에서는 사용하지 않음)
          // 나중에 사용할 수 있도록 코드는 유지하되 주석 처리
          // if (userUid) {
          //   const checklistData = await ChecklistService.getUserChecklist(
          //     userUid
          //   )
          //   setUserChecklist(checklistData)

          //   // 시스템 체크리스트 로드 (실패 시 기본값 사용)
          //   try {
          //     const systemChecklist = await ChecklistService.getSystemChecklist(
          //       "pre-reading"
          //     )
          //     if (systemChecklist) {
          //       setPreReadingChecklist(systemChecklist.items)
          //     } else {
          //       setPreReadingChecklist(
          //         ChecklistService.getDefaultPreReadingChecklist()
          //       )
          //     }
          //   } catch (error) {
          //     console.error(
          //       "Failed to load system checklist, using default:",
          //       error
          //     )
          //     setPreReadingChecklist(
          //       ChecklistService.getDefaultPreReadingChecklist()
          //     )
          //   }
          // }
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

    // 체크리스트 확인 여부 체크 (현재 서비스에서는 사용하지 않음)
    // 나중에 사용할 수 있도록 코드는 유지하되 주석 처리
    // const isChecklistValid =
    //   ChecklistService.isPreReadingCheckValid(userChecklist)
    // if (!isChecklistValid) {
    //   setShowChecklistReminder(true)
    //   return
    // }

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
          date: getKoreaDate(timerStartTime), // 한국 시간 기준으로 날짜 설정
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
      console.log("[완독하기] 시작", { bookId: resolvedParams?.id })
      
      // 회독 기록을 위한 시작일 찾기
      let startDate: string | null = null
      const currentRereadCount = book?.rereadCount ?? 0
      const isFirstReread = currentRereadCount === 0

      if (book?.currentRereadStartDate) {
        // 현재 회독의 시작일이 있으면 그것을 사용 (다시 읽기 시작한 날짜)
        startDate = book.currentRereadStartDate
      } else if (readingSessions.length > 0) {
        if (!isFirstReread && rereads.length > 0) {
          // 2회독 이상: 이전 회독 완료일 이후의 세션만 '이번 회독' 구간. 그 중 가장 빠른 날을 시작일로 사용
          const lastCompletedDate = rereads
            .map((r) => r.completedDate)
            .filter(Boolean)
            .sort()
            .pop()
          if (lastCompletedDate) {
            const sessionsAfterLastReread = readingSessions.filter(
              (s) => s.date > lastCompletedDate
            )
            if (sessionsAfterLastReread.length > 0) {
              const sorted = [...sessionsAfterLastReread].sort((a, b) =>
                a.date.localeCompare(b.date)
              )
              startDate = sorted[0].date
            }
          }
        }
        if (startDate == null) {
          // 1회독이거나 위에서 못 찾은 경우: 전체 세션 중 가장 오래된 날짜
          const sortedSessions = [...readingSessions].sort((a, b) =>
            a.date.localeCompare(b.date)
          )
          startDate = sortedSessions[0].date
        }
      }
      if (startDate == null) {
        startDate = book?.startDate || new Date().toISOString().split("T")[0]
      }

      const completedDate = new Date().toISOString().split("T")[0]
      const newRereadNumber = currentRereadCount + 1

      console.log("[완독하기] 회독 기록 생성", {
        bookId: resolvedParams?.id,
        rereadNumber: newRereadNumber,
        startDate,
        completedDate,
      })

      // 회독 기록 생성
      await RereadService.createReread({
        bookId: resolvedParams?.id || "",
        user_id: resolvedParams?.user_id || "",
        rereadNumber: newRereadNumber,
        startDate: startDate,
        completedDate: completedDate,
      })

      console.log("[완독하기] 회독 기록 생성 완료")

      // 책 상태 업데이트 (currentRereadStartDate 초기화)
      console.log("[완독하기] 책 상태 업데이트 시작")
      await BookService.updateBookStatus(
        resolvedParams?.id || "",
        "completed",
        resolvedParams?.user_id || ""
      )
      
      console.log("[완독하기] 책 상태 업데이트 완료")
      
      // currentRereadStartDate 초기화
      await BookService.updateBook(resolvedParams?.id || "", {
        currentRereadStartDate: undefined,
      })

      console.log("[완독하기] currentRereadStartDate 초기화 완료")

      // 업데이트된 책 정보를 다시 가져와서 회독 수 포함
      const updatedBookData = await BookService.getBook(resolvedParams?.id || "")
      if (!updatedBookData) {
        throw new Error("책 정보를 가져올 수 없습니다.")
      }

      console.log("[완독하기] 업데이트된 책 정보:", updatedBookData)

      const updatedBook = {
        ...book!,
        ...updatedBookData,
        status: "completed" as const,
        completedDate: updatedBookData.completedDate || completedDate,
        rereadCount: updatedBookData.rereadCount ?? 0,
        currentRereadStartDate: undefined,
      }
      setBook(updatedBook)

      // 회독 기록 다시 로드
      const updatedRereads = await RereadService.getBookRereads(resolvedParams?.id || "")
      setRereads(updatedRereads)

      console.log("[완독하기] DataContext 업데이트 시작")
      // DataContext의 책 상태 업데이트 (동기 함수이므로 에러가 발생하지 않음)
      try {
        updateBook(resolvedParams?.id || "", updatedBook)
        console.log("[완독하기] DataContext 업데이트 완료")
      } catch (contextError) {
        console.error("[완독하기] DataContext 업데이트 중 에러 (무시 가능):", contextError)
        // DataContext 업데이트 실패는 치명적이지 않으므로 무시
      }

      // 성공 모달 표시
      setSuccessModalTitle("완독 처리 완료")
      setSuccessModalMessage(
        `"${book?.title}" 책을 완독한 책으로 표시했습니다. ${newRereadNumber}회독이 기록되었습니다.`
      )
      setIsSuccessModalOpen(true)
      setIsCompleteModalOpen(false)
    } catch (error) {
      console.error("[완독하기] 에러 발생:", error)
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
      
      // 다시 읽기 시작한 날짜 기록
      const currentDate = new Date().toISOString().split("T")[0]
      
      await BookService.updateBookStatus(
        resolvedParams?.id || "",
        "reading",
        resolvedParams?.user_id || ""
      )
      
      // 현재 회독 시작일 저장
      await BookService.updateBook(resolvedParams?.id || "", {
        currentRereadStartDate: currentDate,
      })

      const updatedBook = {
        ...book!,
        status: "reading" as const,
        hasStartedReading: true,
        currentRereadStartDate: currentDate,
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
      console.log("[다시 읽기] 시작", { bookId: resolvedParams?.id })
      
      // 완독 취소 후 다시 읽기 시작한 날짜 기록
      const currentDate = new Date().toISOString().split("T")[0]
      
      console.log("[다시 읽기] 책 상태 업데이트 시작")
      await BookService.updateBookStatus(
        resolvedParams?.id || "",
        "reading",
        resolvedParams?.user_id || ""
      )
      
      console.log("[다시 읽기] 책 상태 업데이트 완료")
      
      // 현재 회독 시작일 저장
      await BookService.updateBook(resolvedParams?.id || "", {
        currentRereadStartDate: currentDate,
        completedDate: undefined,
      })

      console.log("[다시 읽기] currentRereadStartDate 저장 완료")

      const updatedBook = {
        ...book!,
        status: "reading" as const,
        completedDate: undefined,
        currentRereadStartDate: currentDate,
        hasStartedReading: true,
      }
      setBook(updatedBook)

      console.log("[다시 읽기] DataContext 업데이트 시작")
      // DataContext의 책 상태 업데이트 (동기 함수이므로 에러가 발생하지 않음)
      try {
        updateBook(resolvedParams?.id || "", updatedBook)
        console.log("[다시 읽기] DataContext 업데이트 완료")
      } catch (contextError) {
        console.error("[다시 읽기] DataContext 업데이트 중 에러 (무시 가능):", contextError)
        // DataContext 업데이트 실패는 치명적이지 않으므로 무시
      }

      // 성공 모달 표시
      setSuccessModalTitle("다시 읽기 시작")
      setSuccessModalMessage(
        `"${book?.title}" 책을 다시 읽기로 변경했습니다. 새로운 회독이 시작되었습니다.`
      )
      setIsSuccessModalOpen(true)
    } catch (error) {
      console.error("[다시 읽기] 에러 발생:", error)
      if (error instanceof ApiError) {
        setError(error.message)
      } else {
        setError("다시 읽기 처리 중 오류가 발생했습니다.")
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

  const handleEditReadingSession = (session: ReadingSession) => {
    setSessionToEdit(session)
    setIsEditSessionModalOpen(true)
  }

  const handleSaveReadingSession = async (updatedSession: ReadingSession) => {
    try {
      setError(null)
      await ReadingSessionService.updateReadingSession(updatedSession.id, {
        startTime: updatedSession.startTime,
        endTime: updatedSession.endTime,
        duration: updatedSession.duration,
      })

      // 독서 기록 목록을 다시 가져와서 UI 업데이트
      const updatedSessions =
        await ReadingSessionService.getBookReadingSessions(
          resolvedParams?.id || ""
        )
      setReadingSessions(updatedSessions)

      // DataContext 업데이트 (통계 재계산을 위해)
      await updateStatistics()
    } catch (error) {
      if (error instanceof ApiError) {
        setError(error.message)
      } else {
        setError("독서 기록을 수정하는 중 오류가 발생했습니다.")
      }
      throw error
    }
  }

  const handleAddReadingSession = async (
    data: Omit<ReadingSession, "id" | "created_at" | "updated_at">
  ) => {
    try {
      setError(null)
      const sessionId = await ReadingSessionService.createReadingSession(data)

      const updatedSessions =
        await ReadingSessionService.getBookReadingSessions(
          resolvedParams?.id || ""
        )
      setReadingSessions(updatedSessions)

      const sessionWithId = { ...data, id: sessionId } as ReadingSession
      await addReadingSession(sessionWithId)
      await updateStatistics()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("독서 기록을 추가하는 중 오류가 발생했습니다.")
      }
      throw err
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

  // 체크리스트 관련 함수 (현재 서비스에서는 사용하지 않음)
  // 나중에 사용할 수 있도록 코드는 유지하되 주석 처리
  // const handleChecklistComplete = async () => {
  //   if (userUid) {
  //     await ChecklistService.markPreReadingCompleted(userUid)
  //     const updatedChecklist = await ChecklistService.getUserChecklist(userUid)
  //     setUserChecklist(updatedChecklist)
  //   }
  // }

  // const openChecklistModal = () => {
  //   setIsChecklistModalOpen(true)
  // }

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

  // 날짜별로 독서 기록 그룹화
  const groupSessionsByDate = () => {
    const grouped: { [date: string]: ReadingSession[] } = {}
    
    readingSessions.forEach((session) => {
      const date = session.date
      if (!grouped[date]) {
        grouped[date] = []
      }
      grouped[date].push(session)
    })

    // 날짜별로 정렬 (최신 날짜가 먼저)
    const sortedDates = Object.keys(grouped).sort((a, b) => {
      return new Date(b).getTime() - new Date(a).getTime()
    })

    return sortedDates.map((date) => ({
      date,
      sessions: grouped[date],
      totalDuration: grouped[date].reduce((acc, session) => acc + session.duration, 0),
    }))
  }

  const groupedSessions = groupSessionsByDate()

  const isCompleted = book?.status === "completed"
  const isOnHold = book?.status === "on-hold"

  if (isLoading) {
    return <BookDetailRouteSkeleton />
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
    <>
      <div
        className={`min-h-screen bg-theme-gradient pb-20 ${
          book && immersiveVisible && !immersiveExiting ? "hidden" : ""
        }`}
        aria-hidden={book && immersiveVisible ? true : undefined}
      >
      <div className='container mx-auto max-w-2xl px-4 py-4'>
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

        {/* 책 기본 정보: 타이머 진행 시 아이콘 유지 + 제목·저자·총 독서 시간만 남기고 부드럽게 축소 */}
        <div
          className={`bg-theme-secondary rounded-xl shadow-sm overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] mb-4 ${
            isTimerRunning ? "p-3 shadow-md" : "p-4"
          }`}
        >
          <div
            className={`flex transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
              isTimerRunning ? "items-center gap-3" : "items-start gap-3"
            }`}
          >
            <div
              className={`bg-theme-tertiary rounded-lg flex items-center justify-center shrink-0 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden ${
                isTimerRunning ? "w-12 h-16 opacity-100" : "w-16 h-20 opacity-100"
              }`}
            >
              <BookOpen
                className={`text-gray-400 transition-all duration-500 ${
                  isTimerRunning ? "h-6 w-6" : "h-8 w-8"
                }`}
              />
            </div>
            <div className='flex-1 min-w-0'>
              <h2
                className={`font-semibold text-theme-primary tracking-tight transition-all duration-500 ${
                  isTimerRunning ? "text-base mb-0.5 line-clamp-2" : "text-lg mb-1"
                }`}
              >
                {book.title}
              </h2>
              <p
                className={`text-theme-secondary transition-all duration-500 ${
                  isTimerRunning ? "text-xs mb-1 line-clamp-1" : "text-sm mb-2"
                }`}
              >
                {book.author || "저자 미상"}
              </p>
              {isTimerRunning && (
                <div className='flex items-center gap-1.5 text-xs text-theme-secondary'>
                  <Clock className='h-3.5 w-3.5 shrink-0 text-accent-theme' />
                  <span>총 독서 시간: {formatTotalTime(totalReadingTime)}</span>
                </div>
              )}

              <div
                className={`transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden ${
                  isTimerRunning
                    ? "max-h-0 opacity-0 pointer-events-none mt-0"
                    : "max-h-[2000px] opacity-100 mt-0"
                }`}
              >
                <div className='flex flex-wrap gap-2 mb-3'>
                  {book.publisher && (
                    <span className='text-xs text-theme-tertiary'>출판사: {book.publisher}</span>
                  )}
                  {(book.publishedDate || book.publisher) && (
                    <span className='text-xs text-theme-tertiary'>
                      {book.publishedDate ? `출판일: ${book.publishedDate}` : ""}
                    </span>
                  )}
                  {book.category && (
                    <span className='text-xs px-2 py-0.5 rounded-full bg-theme-tertiary text-theme-secondary'>
                      {book.category}
                    </span>
                  )}
                </div>
                <div className='flex items-center gap-2 mb-2'>
                  <span className='text-xs text-theme-tertiary'>상태</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      book.status === "reading"
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200"
                        : book.status === "completed"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200"
                          : book.status === "on-hold"
                            ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                    }`}
                  >
                    {book.status === "reading"
                      ? "읽는 중"
                      : book.status === "completed"
                        ? "완독"
                        : book.status === "on-hold"
                          ? "보류"
                          : "읽고 싶은 책"}
                  </span>
                  {book.toReadThisYear && (
                    <span className='text-xs text-theme-tertiary'>이번 년도에 읽을 책</span>
                  )}
                </div>
                <div className='flex items-center gap-2 mb-3'>
                  <span className='text-sm text-theme-secondary'>평점</span>
                  <div className='flex gap-0.5'>
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

                <div className='border-t border-theme-tertiary pt-3 mt-3 space-y-1.5 text-sm text-theme-secondary'>
                  <div className='flex items-center gap-1.5'>
                    <Clock className='h-4 w-4 shrink-0' />
                    <span>총 독서 시간: {formatTotalTime(totalReadingTime)}</span>
                  </div>
                  {book.startDate && (
                    <div className='flex items-center gap-1.5'>
                      <Calendar className='h-4 w-4 shrink-0' />
                      <span>읽기 시작: {book.startDate}</span>
                    </div>
                  )}
                  {book.completedDate && (
                    <div className='flex items-center gap-1.5 text-green-600 dark:text-green-400'>
                      <CheckCircle className='h-4 w-4 shrink-0' />
                      <span>완독일: {book.completedDate}</span>
                    </div>
                  )}
                  {book.currentRereadStartDate && (
                    <div className='flex items-center gap-1.5'>
                      <Calendar className='h-4 w-4 shrink-0' />
                      <span>현재 회독 시작: {book.currentRereadStartDate}</span>
                    </div>
                  )}
                  {rereads.length > 0 && (() => {
                    const totalDays = rereads.reduce(
                      (sum, reread) => sum + (reread.durationDays || 0),
                      0
                    )
                    return totalDays > 0 ? (
                      <div className='flex items-center gap-1.5 text-theme-secondary'>
                        <Clock className='h-4 w-4 shrink-0' />
                        <span>총 읽은 일수: {totalDays}일</span>
                      </div>
                    ) : null
                  })()}
                  <button
                    type='button'
                    onClick={() => setIsRereadDetailModalOpen(true)}
                    className='flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer'
                  >
                    <BookOpen className='h-4 w-4 shrink-0' />
                    <span className='underline'>회독: {book.rereadCount ?? 0}회</span>
                    <ChevronRight className='h-3 w-3' />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 독서 타이머 (정지 시 카드 — 실행 중에는 전체 화면 독서 모드) */}
        {!isTimerRunning && (
          <div className='relative mb-4 overflow-hidden rounded-2xl border border-theme-tertiary/80 bg-theme-secondary p-4 shadow-sm'>
            <div className='relative z-10'>
              <div className='relative mb-3 flex min-h-10 items-center justify-between gap-2'>
                <h3 className='min-w-0 flex-1 pr-2 text-lg font-semibold leading-snug text-theme-primary'>
                  독서 타이머
                </h3>
                <button
                  type='button'
                  onClick={() => setIsTimerSettingsOpen((o) => !o)}
                  className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-theme-tertiary transition-colors hover:bg-theme-tertiary/40 hover:text-theme-primary'
                  title='타이머 설정'
                  aria-expanded={isTimerSettingsOpen}
                >
                  <Settings className='h-5 w-5' />
                </button>
              </div>
              <div className='mb-3 text-center transition-all duration-500'>
                <div className='text-3xl font-mono tracking-tight text-theme-tertiary'>
                  00:00:00
                </div>
              </div>
              <div className='flex gap-3'>
                {isCompleted ? (
                  <button
                    type='button'
                    onClick={() => setIsRereadModalOpen(true)}
                    disabled={isTimerProcessing}
                    className='flex flex-1 items-center justify-center gap-2 rounded-lg bg-accent-theme px-4 py-3 font-medium text-white transition-colors hover:bg-accent-theme-secondary disabled:cursor-not-allowed disabled:opacity-50'
                  >
                    <RotateCcw className='h-5 w-5' />
                    계속 읽기
                  </button>
                ) : isOnHold ? (
                  <button
                    type='button'
                    onClick={handleReread}
                    disabled={isTimerProcessing}
                    className='flex flex-1 items-center justify-center gap-2 rounded-lg bg-accent-theme px-4 py-3 font-medium text-white transition-colors hover:bg-accent-theme-secondary disabled:cursor-not-allowed disabled:opacity-50'
                  >
                    <Play className='h-5 w-5' />
                    다시 읽기
                  </button>
                ) : (
                  <button
                    type='button'
                    onClick={startTimer}
                    disabled={isTimerProcessing}
                    className='flex flex-1 items-center justify-center gap-2 rounded-lg bg-accent-theme px-4 py-3 font-medium text-white transition-colors hover:bg-accent-theme-secondary disabled:cursor-not-allowed disabled:opacity-50'
                  >
                    <Play className='h-5 w-5' />
                    {isTimerProcessing ? "시작 중..." : "독서 시작"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 기록 / 활동 허브 */}
        {resolvedParams && (
          <div className='mb-4 grid gap-3 sm:grid-cols-2'>
            <Link
              href={`/book/${resolvedParams.id}/${resolvedParams.user_id}/journal`}
              className='group flex rounded-xl border border-theme-tertiary bg-theme-secondary p-4 shadow-sm transition-all hover:border-accent-theme/50 hover:shadow-md'
            >
              <div className='flex w-full items-stretch gap-3'>
                <div className='flex shrink-0 items-center'>
                  <div className='rounded-lg bg-accent-theme/10 p-2.5'>
                    <NotebookPen className='h-6 w-6 text-accent-theme' />
                  </div>
                </div>
                <div className='min-w-0 flex-1 flex flex-col justify-center py-0.5'>
                  <h3 className='font-semibold text-theme-primary'>기록</h3>
                  <p className='mt-1 text-sm text-theme-secondary leading-snug'>
                    독서 질문, 구절, 완독 후 리뷰와 서평
                  </p>
                </div>
                <div className='flex w-9 shrink-0 items-center justify-center self-stretch'>
                  <ChevronRight className='h-5 w-5 text-theme-tertiary transition-colors group-hover:text-accent-theme' />
                </div>
              </div>
            </Link>
            <Link
              href={`/book/${resolvedParams.id}/${resolvedParams.user_id}/activities`}
              className='group flex rounded-xl border border-theme-tertiary bg-theme-secondary p-4 shadow-sm transition-all hover:border-accent-theme/50 hover:shadow-md'
            >
              <div className='flex w-full items-stretch gap-3'>
                <div className='flex shrink-0 items-center'>
                  <div className='rounded-lg bg-violet-500/10 p-2.5 dark:bg-violet-400/10'>
                    <Sparkles className='h-6 w-6 text-violet-600 dark:text-violet-300' />
                  </div>
                </div>
                <div className='min-w-0 flex-1 flex flex-col justify-center py-0.5'>
                  <h3 className='font-semibold text-theme-primary'>활동</h3>
                  <p className='mt-1 text-sm text-theme-secondary leading-snug'>
                    골든벨, 이해도 점검, 발췌 요약
                  </p>
                </div>
                <div className='flex w-9 shrink-0 items-center justify-center self-stretch'>
                  <ChevronRight className='h-5 w-5 text-theme-tertiary transition-colors group-hover:text-accent-theme' />
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* 완독하기 등 액션 버튼 (기록·활동 아래) */}
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
          {isCompleted && (
            <>
              <button
                onClick={handleCancelCompletion}
                disabled={isTimerProcessing}
                className='flex items-center justify-center gap-2 py-3 px-4 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
              >
                <RotateCcw className='h-4 w-4' />
                다시 읽기
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

        {/* 체크리스트 섹션 - 현재 서비스에서는 사용하지 않음 */}
        {/* 나중에 사용할 수 있도록 컴포넌트로 분리되어 있음 */}
        {/* 
        <PreReadingChecklistSection
          userUid={userUid || ""}
          onChecklistComplete={handleChecklistComplete}
        />
        */}
        
        {/* 기존 체크리스트 UI (사용하지 않음, 참고용으로 유지) */}
        {/* 
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
        */}

        <div className='bg-theme-secondary rounded-lg shadow-sm p-4'>
          <div className='flex items-center justify-between mb-3'>
            <h3 className='text-lg font-semibold text-theme-primary'>
              독서 기록
            </h3>
            <div className='flex items-center gap-2'>
              <span className='text-sm text-theme-secondary bg-theme-tertiary px-2 py-1 rounded-full'>
                {readingSessions.length}개
              </span>
              <button
                type='button'
                onClick={() => setIsAddSessionModalOpen(true)}
                className='p-2 text-accent-theme hover:bg-accent-theme/10 rounded-lg transition-colors'
                title='독서 기록 추가'
              >
                <Plus className='h-4 w-4' />
              </button>
            </div>
          </div>

          {readingSessions.length === 0 ? (
            <p className='text-theme-secondary text-center py-6'>
              아직 독서 기록이 없습니다. 타이머를 시작해보세요!
            </p>
          ) : (
            <div
              className={`space-y-4 ${
                readingSessions.length > 10 ? "max-h-80 overflow-y-auto" : ""
              }`}
            >
              {groupedSessions.map((group) => (
                <div key={group.date} className='space-y-2'>
                  {/* 날짜 헤더 */}
                  <div className='flex items-center justify-between p-2 bg-theme-tertiary rounded-lg border-l-4 border-accent-theme'>
                    <div className='flex items-center gap-2'>
                      <Calendar className='h-4 w-4 text-accent-theme' />
                      <span className='text-sm font-semibold text-theme-primary'>
                        {group.date}
                      </span>
                    </div>
                    <div className='flex items-center gap-2'>
                      <Clock className='h-4 w-4 text-accent-theme' />
                      <span className='text-sm font-medium text-accent-theme'>
                        총 {Math.floor(group.totalDuration / 3600) > 0 && `${Math.floor(group.totalDuration / 3600)}시간 `}
                        {Math.floor((group.totalDuration % 3600) / 60)}분
                        {group.totalDuration % 60 > 0 && ` ${group.totalDuration % 60}초`}
                      </span>
                    </div>
                  </div>
                  
                  {/* 해당 날짜의 세션들 */}
                  <div className='space-y-2 pl-4'>
                    {group.sessions.map((session: ReadingSession) => (
                      <div
                        key={session.id}
                        className='flex items-center justify-between p-2 bg-theme-tertiary/50 rounded-lg'
                      >
                        <div className='flex-1'>
                          <div className='text-xs text-theme-secondary'>
                            {formatTimeForDisplay(session.startTime)} -{" "}
                            {formatTimeForDisplay(session.endTime)}
                          </div>
                        </div>
                        <div className='flex items-center gap-2'>
                          <div className='text-xs font-medium text-theme-primary'>
                            {Math.floor(session.duration / 60)}분{" "}
                            {session.duration % 60}초
                          </div>
                          <div className='flex items-center gap-1'>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditReadingSession(session)
                              }}
                              className='p-1 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors'
                              title='독서 기록 수정'
                            >
                              <Edit className='h-3 w-3' />
                            </button>
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
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 보류 · 공개 (소유자만, 독서 기록 아래 — 보류가 위) */}
        {userUid === book.user_id && (
          <div className='mt-4 space-y-3'>
            {!isCompleted && book.hasStartedReading && (
              <div className='bg-theme-secondary rounded-lg shadow-sm p-4'>
                <div className='flex items-center justify-between gap-3'>
                  <div className='flex items-center gap-2 min-w-0'>
                    <Pause
                      className={`h-5 w-5 shrink-0 ${
                        isOnHold ? "text-orange-500" : "text-theme-tertiary"
                      }`}
                    />
                    <div className='min-w-0'>
                      <p className='text-sm font-medium text-theme-primary'>
                        이 책 보류하기
                      </p>
                      <p className='text-xs text-theme-tertiary mt-0.5'>
                        {isOnHold
                          ? "보류 중입니다. 토글을 끄면 다시 읽는 중으로 돌아갑니다."
                          : "읽다가 잠시 멈출 때 켜 두면 목록에서 보류로 표시됩니다."}
                      </p>
                    </div>
                  </div>
                  <button
                    type='button'
                    disabled={isTimerProcessing || isHoldUpdating}
                    onClick={async () => {
                      if (!resolvedParams || !book || isTimerProcessing || isHoldUpdating)
                        return
                      setIsHoldUpdating(true)
                      setError(null)
                      try {
                        if (isOnHold) {
                          await handleReread()
                        } else {
                          await handlePutOnHold()
                        }
                      } finally {
                        setIsHoldUpdating(false)
                      }
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
                      isOnHold ? "bg-orange-500" : "bg-gray-300 dark:bg-gray-600"
                    }`}
                    aria-pressed={isOnHold}
                    aria-label={isOnHold ? "보류 끄기" : "보류 켜기"}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isOnHold ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}

            <div className='bg-theme-secondary rounded-lg shadow-sm p-4'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  {book.isBookPublic ? (
                    <Globe className='h-5 w-5 text-blue-500' />
                  ) : (
                    <Lock className='h-5 w-5 text-gray-400' />
                  )}
                  <div>
                    <label className='text-sm font-medium text-theme-primary cursor-pointer'>
                      이 책의 모든 콘텐츠 공개하기
                    </label>
                    <p className='text-xs text-theme-tertiary'>
                      {book.isBookPublic
                        ? "다른 독서자들이 이 책의 구절 기록, 질문, 리뷰, 서평을 볼 수 있습니다"
                        : "이 책의 모든 콘텐츠는 나만 볼 수 있습니다"}
                    </p>
                  </div>
                </div>
                <button
                  type='button'
                  onClick={async () => {
                    if (!resolvedParams) return
                    try {
                      const updatedBook = {
                        ...book,
                        isBookPublic: !book.isBookPublic,
                      }
                      await BookService.updateBook(resolvedParams.id, updatedBook)
                      setBook(updatedBook)
                      updateBook(resolvedParams.id, updatedBook)
                    } catch (error) {
                      console.error("Error updating book public setting:", error)
                      setError("공개 설정을 업데이트하는 중 오류가 발생했습니다.")
                    }
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    book.isBookPublic ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      book.isBookPublic ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 하단 고정 액션 바 - 변경사항 저장만 */}
        {hasUnsavedChanges && (
          <div className='fixed bottom-0 left-0 right-0 bg-theme-secondary border-t border-theme-tertiary p-4 z-40'>
            <div className='container mx-auto max-w-2xl flex items-center justify-between'>
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
      </div>
    </div>

        {book && immersiveVisible && (
          <ReadingImmersiveFullscreen
            exiting={immersiveExiting}
            bookTitle={book.title}
            bookAuthor={book.author || "저자 미상"}
            totalReadingTimeLabel={formatTotalTime(totalReadingTime)}
            timerBgSrc={timerBgSrc}
            cosmosOverlay={cosmosOverlay}
            onCosmosLoad={() => setCosmosOverlay("on")}
            onCosmosError={() => setCosmosOverlay("fail")}
            getElapsedTime={getElapsedTime}
            isTimerProcessing={isTimerProcessing}
            isSettingsOpen={isTimerSettingsOpen}
            onToggleSettings={() => setIsTimerSettingsOpen((o) => !o)}
            isCompleted={isCompleted}
            isOnHold={isOnHold}
            onStop={stopTimer}
            onRereadModal={() => setIsRereadModalOpen(true)}
            onReread={handleReread}
          />
        )}

        <ReadingTimerSettingsModal
          isOpen={isTimerSettingsOpen}
          onClose={() => setIsTimerSettingsOpen(false)}
          ambientTrackId={ambientTrackId}
          onAmbientChange={setAmbientTrackId}
          timerBgId={timerBgId}
          onTimerBgChange={setTimerBgId}
        />

        <RereadModal
          isOpen={isRereadModalOpen}
          onClose={() => setIsRereadModalOpen(false)}
          onConfirm={handleReread}
          bookTitle={book.title}
        />

        <RereadDetailModal
          isOpen={isRereadDetailModalOpen}
          onClose={() => setIsRereadDetailModalOpen(false)}
          rereads={rereads}
          bookTitle={book?.title || ""}
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

        {/* 성공 모달 */}
        <SuccessModal
          isOpen={isSuccessModalOpen}
          onClose={() => setIsSuccessModalOpen(false)}
          title={successModalTitle}
          message={successModalMessage}
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

        {/* 독서 기록 수정 모달 */}
        <EditReadingSessionModal
          isOpen={isEditSessionModalOpen}
          onClose={() => {
            setIsEditSessionModalOpen(false)
            setSessionToEdit(null)
          }}
          onSave={handleSaveReadingSession}
          session={sessionToEdit}
        />
        <AddReadingSessionModal
          isOpen={isAddSessionModalOpen}
          onClose={() => setIsAddSessionModalOpen(false)}
          onSave={handleAddReadingSession}
          bookId={resolvedParams?.id || ""}
          userId={resolvedParams?.user_id || ""}
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

        {/* 체크리스트 모달 - 현재 서비스에서는 사용하지 않음 */}
        {/* 나중에 사용할 수 있도록 코드는 유지하되 주석 처리 */}
        {/* 
        <ChecklistModal
          isOpen={isChecklistModalOpen}
          onClose={() => setIsChecklistModalOpen(false)}
          onComplete={handleChecklistComplete}
          checklist={preReadingChecklist}
          title='독서 전 체크리스트'
          description='독서를 시작하기 전에 다음 항목들을 확인해주세요.'
        />

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
        */}

    </>
  )
}
