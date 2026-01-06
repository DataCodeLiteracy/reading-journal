"use client"

import { useState, useEffect } from "react"
import { MessageSquare, Trash2, Edit, Play, Pause, Volume2, Calendar } from "lucide-react"
import { QuestionAnswer } from "@/types/question"
import { AnswerService } from "@/services/answerService"
import ConfirmModal from "./ConfirmModal"

interface AnswerListProps {
  questionId: string
  userId: string
  onAnswerDeleted?: () => void
  onAnswerUpdated?: () => void
  showActions?: boolean
}

export default function AnswerList({
  questionId,
  userId,
  onAnswerDeleted,
  onAnswerUpdated,
  showActions = true,
}: AnswerListProps) {
  const [answers, setAnswers] = useState<QuestionAnswer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null)
  const [audioElements, setAudioElements] = useState<Map<string, HTMLAudioElement>>(new Map())
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [answerToDelete, setAnswerToDelete] = useState<QuestionAnswer | null>(null)

  const formatDate = (date: Date): string => {
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    const hours = String(d.getHours()).padStart(2, "0")
    const minutes = String(d.getMinutes()).padStart(2, "0")
    return `${year}년 ${month}월 ${day}일 ${hours}:${minutes}`
  }

  useEffect(() => {
    loadAnswers()
  }, [questionId, userId])

  useEffect(() => {
    // 컴포넌트 언마운트 시 오디오 정리
    return () => {
      audioElements.forEach((audio) => {
        audio.pause()
        audio.src = ""
      })
    }
  }, [audioElements])

  const loadAnswers = async (): Promise<void> => {
    try {
      setIsLoading(true)
      setError(null)

      // AnswerService.getQuestionAnswers는 모든 사용자의 답변을 가져오므로
      // userId로 필터링 필요
      const allAnswers = await AnswerService.getQuestionAnswers(questionId)
      const userAnswers = allAnswers.filter((answer) => answer.user_id === userId)
      setAnswers(userAnswers)
    } catch (err) {
      console.error("Error loading answers:", err)
      setError("답변을 불러오는 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = (answer: QuestionAnswer): void => {
    setAnswerToDelete(answer)
    setDeleteConfirmOpen(true)
  }

  const confirmDelete = async (): Promise<void> => {
    if (!answerToDelete) return

    try {
      await AnswerService.deleteAnswer(answerToDelete.id)
      await loadAnswers()
      onAnswerDeleted?.()
    } catch (err) {
      console.error("Error deleting answer:", err)
      setError("답변을 삭제하는 중 오류가 발생했습니다.")
    } finally {
      setDeleteConfirmOpen(false)
      setAnswerToDelete(null)
    }
  }

  const handlePlayAudio = async (answer: QuestionAnswer): Promise<void> => {
    if (!answer.audioUrl) return

    try {
      // 이미 재생 중인 오디오가 있으면 정지
      if (playingAudioId && playingAudioId !== answer.id) {
        const prevAudio = audioElements.get(playingAudioId)
        if (prevAudio) {
          prevAudio.pause()
          prevAudio.currentTime = 0
        }
      }

      // 같은 오디오를 다시 클릭하면 정지
      if (playingAudioId === answer.id) {
        const audio = audioElements.get(answer.id)
        if (audio) {
          audio.pause()
          audio.currentTime = 0
          setPlayingAudioId(null)
        }
        return
      }

      // 새 오디오 재생
      const audio = new Audio(answer.audioUrl)
      audio.addEventListener("ended", () => {
        setPlayingAudioId(null)
      })
      audio.addEventListener("error", () => {
        setError("오디오를 재생하는 중 오류가 발생했습니다.")
        setPlayingAudioId(null)
      })

      setAudioElements((prev) => {
        const newMap = new Map(prev)
        newMap.set(answer.id, audio)
        return newMap
      })

      await audio.play()
      setPlayingAudioId(answer.id)
    } catch (err) {
      console.error("Error playing audio:", err)
      setError("오디오를 재생하는 중 오류가 발생했습니다.")
    }
  }

  if (isLoading) {
    return (
      <div className='text-center py-8'>
        <div className='animate-spin rounded-full h-8 w-8 border-2 border-accent-theme border-t-transparent mx-auto mb-2' />
        <p className='text-sm text-theme-secondary'>답변을 불러오는 중...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className='text-center py-8'>
        <p className='text-sm text-red-500 dark:text-red-400 mb-2'>{error}</p>
        <button
          onClick={loadAnswers}
          className='text-sm text-accent-theme hover:underline'
        >
          다시 시도
        </button>
      </div>
    )
  }

  if (answers.length === 0) {
    return (
      <div className='text-center py-8'>
        <MessageSquare className='h-12 w-12 text-theme-tertiary mx-auto mb-2' />
        <p className='text-sm text-theme-secondary'>아직 답변이 없습니다.</p>
      </div>
    )
  }

  return (
    <>
      <div className='space-y-4'>
        {answers.map((answer) => (
          <div
            key={answer.id}
            className='bg-theme-tertiary rounded-lg p-4 border border-theme-tertiary hover:border-accent-theme/30 transition-colors'
          >
            {/* 답변 헤더 */}
            <div className='flex items-start justify-between mb-3'>
              <div className='flex items-center gap-2 text-xs text-theme-secondary'>
                <Calendar className='h-3 w-3' />
                {answer.created_at
                  ? formatDate(new Date(answer.created_at))
                  : "날짜 없음"}
              </div>
              {showActions && (
                <div className='flex gap-2'>
                  <button
                    onClick={() => handleDelete(answer)}
                    className='p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors'
                    title='답변 삭제'
                  >
                    <Trash2 className='h-4 w-4 text-red-500' />
                  </button>
                </div>
              )}
            </div>

            {/* 텍스트 답변 */}
            {answer.answerText && (
              <div className='mb-3'>
                <p className='text-theme-primary whitespace-pre-wrap break-words'>
                  {answer.answerText}
                </p>
              </div>
            )}

            {/* 오디오 답변 */}
            {answer.audioUrl && (
              <div className='mb-3'>
                <div className='flex items-center gap-3'>
                  <button
                    onClick={() => handlePlayAudio(answer)}
                    className='flex items-center gap-2 px-3 py-2 bg-accent-theme hover:bg-accent-theme-secondary text-white rounded-lg transition-colors'
                  >
                    {playingAudioId === answer.id ? (
                      <>
                        <Pause className='h-4 w-4' />
                        재생 중...
                      </>
                    ) : (
                      <>
                        <Play className='h-4 w-4' />
                        재생
                      </>
                    )}
                  </button>
                  {answer.audioTranscript && (
                    <div className='flex-1 text-sm text-theme-secondary bg-theme-secondary rounded p-2'>
                      <div className='flex items-start gap-2'>
                        <Volume2 className='h-4 w-4 mt-0.5 flex-shrink-0' />
                        <p className='whitespace-pre-wrap break-words'>
                          {answer.audioTranscript}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STT 전사본만 있는 경우 (오디오 URL은 없지만 전사본은 있음) */}
            {!answer.audioUrl && answer.audioTranscript && (
              <div className='mb-3'>
                <div className='text-sm text-theme-secondary bg-theme-secondary rounded p-2'>
                  <div className='flex items-start gap-2'>
                    <Volume2 className='h-4 w-4 mt-0.5 flex-shrink-0' />
                    <p className='whitespace-pre-wrap break-words'>
                      {answer.audioTranscript}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 텍스트와 오디오 모두 없는 경우 (이론적으로는 발생하지 않아야 함) */}
            {!answer.answerText && !answer.audioUrl && !answer.audioTranscript && (
              <p className='text-sm text-theme-secondary italic'>내용 없음</p>
            )}
          </div>
        ))}
      </div>

      {/* 삭제 확인 모달 */}
      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false)
          setAnswerToDelete(null)
        }}
        onConfirm={confirmDelete}
        title='답변 삭제'
        message='이 답변을 삭제하시겠습니까?'
        confirmText='삭제'
        cancelText='취소'
        icon={Trash2}
      />
    </>
  )
}

