"use client"

import { useState, useEffect } from "react"
import { X, Clock } from "lucide-react"
import { ReadingSession } from "@/types/user"

interface EditReadingSessionModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (session: ReadingSession) => Promise<void>
  session: ReadingSession | null
}

export default function EditReadingSessionModal({
  isOpen,
  onClose,
  onSave,
  session,
}: EditReadingSessionModalProps) {
  const [startPeriod, setStartPeriod] = useState<"오전" | "오후">("오전")
  const [startHour, setStartHour] = useState("12")
  const [startMinute, setStartMinute] = useState("00")
  const [endPeriod, setEndPeriod] = useState<"오전" | "오후">("오전")
  const [endHour, setEndHour] = useState("12")
  const [endMinute, setEndMinute] = useState("00")
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (session && isOpen) {
      // ISO 형식의 시간을 파싱하여 시간과 분 추출
      const startDate = new Date(session.startTime)
      const endDate = new Date(session.endTime)
      
      // 한국 시간으로 변환 (UTC+9)
      let koreaStartHour = (startDate.getUTCHours() + 9) % 24
      let koreaEndHour = (endDate.getUTCHours() + 9) % 24
      
      // 오전/오후 구분
      const startPeriodValue = koreaStartHour < 12 ? "오전" : "오후"
      const endPeriodValue = koreaEndHour < 12 ? "오전" : "오후"
      
      // 12시간 형식으로 변환
      if (koreaStartHour === 0) {
        koreaStartHour = 12
      } else if (koreaStartHour > 12) {
        koreaStartHour = koreaStartHour - 12
      }
      
      if (koreaEndHour === 0) {
        koreaEndHour = 12
      } else if (koreaEndHour > 12) {
        koreaEndHour = koreaEndHour - 12
      }
      
      setStartPeriod(startPeriodValue)
      setStartHour(koreaStartHour.toString().padStart(2, "0"))
      setStartMinute(startDate.getUTCMinutes().toString().padStart(2, "0"))
      setEndPeriod(endPeriodValue)
      setEndHour(koreaEndHour.toString().padStart(2, "0"))
      setEndMinute(endDate.getUTCMinutes().toString().padStart(2, "0"))
      setError(null)
    }
  }, [session, isOpen])

  const handleSave = async () => {
    if (!session) return

    setError(null)

    // 입력값 검증
    const startH = parseInt(startHour)
    const startM = parseInt(startMinute)
    const endH = parseInt(endHour)
    const endM = parseInt(endMinute)

    if (
      isNaN(startH) ||
      isNaN(startM) ||
      isNaN(endH) ||
      isNaN(endM) ||
      startH < 1 ||
      startH > 12 ||
      startM < 0 ||
      startM > 59 ||
      endH < 1 ||
      endH > 12 ||
      endM < 0 ||
      endM > 59
    ) {
      setError("올바른 시간을 선택해주세요.")
      return
    }

    // 기존 날짜 유지 (날짜는 변경 불가)
    const originalStartDate = new Date(session.startTime)
    const originalEndDate = new Date(session.endTime)

    // 12시간 형식을 24시간 형식으로 변환
    let koreaStartHour = startH
    if (startPeriod === "오후" && startH !== 12) {
      koreaStartHour = startH + 12
    } else if (startPeriod === "오전" && startH === 12) {
      koreaStartHour = 0
    }

    let koreaEndHour = endH
    if (endPeriod === "오후" && endH !== 12) {
      koreaEndHour = endH + 12
    } else if (endPeriod === "오전" && endH === 12) {
      koreaEndHour = 0
    }

    // UTC 시간 계산 (한국 시간 - 9시간)
    const utcStartHour = (koreaStartHour - 9 + 24) % 24
    const utcEndHour = (koreaEndHour - 9 + 24) % 24

    // 날짜는 그대로 유지하고 시간만 변경
    const newStartDate = new Date(originalStartDate)
    newStartDate.setUTCHours(utcStartHour, startM, 0, 0)

    const newEndDate = new Date(originalEndDate)
    newEndDate.setUTCHours(utcEndHour, endM, 0, 0)

    // 종료 시간이 시작 시간보다 이전이면 다음 날로 설정
    if (newEndDate <= newStartDate) {
      newEndDate.setUTCDate(newEndDate.getUTCDate() + 1)
    }

    // duration 계산 (초 단위)
    const duration = Math.floor((newEndDate.getTime() - newStartDate.getTime()) / 1000)

    if (duration <= 0) {
      setError("종료 시간은 시작 시간보다 늦어야 합니다.")
      return
    }

    try {
      setIsSaving(true)
      const updatedSession: ReadingSession = {
        ...session,
        startTime: newStartDate.toISOString(),
        endTime: newEndDate.toISOString(),
        duration,
      }
      await onSave(updatedSession)
      onClose()
    } catch (error: any) {
      setError(error.message || "독서 기록을 수정하는 중 오류가 발생했습니다.")
    } finally {
      setIsSaving(false)
    }
  }

  // 시간 옵션 생성 (1-12)
  const hourOptions = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, "0"))
  
  // 분 옵션 생성 (0-59)
  const minuteOptions = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"))

  if (!isOpen || !session) return null

  return (
    <div className='fixed inset-0 bg-theme-backdrop flex items-center justify-center z-50'>
      <div className='bg-theme-secondary rounded-lg p-6 w-full max-w-md mx-4 shadow-lg'>
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-lg font-semibold text-theme-primary'>
            독서 기록 수정
          </h2>
          <button
            onClick={onClose}
            className='p-1 rounded-full hover:bg-theme-tertiary transition-colors'
          >
            <X className='h-5 w-5 text-theme-secondary' />
          </button>
        </div>

        <div className='mb-6'>
          <p className='text-sm text-theme-secondary mb-4'>
            날짜는 변경할 수 없으며, 시간만 수정할 수 있습니다.
          </p>

          {error && (
            <div className='mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg'>
              <p className='text-red-700 dark:text-red-400 text-sm'>{error}</p>
            </div>
          )}

          <div className='space-y-4'>
            {/* 시작 시간 */}
            <div>
              <label className='block text-sm font-medium text-theme-primary mb-2'>
                시작 시간
              </label>
              <div className='flex items-center gap-2'>
                <select
                  value={startPeriod}
                  onChange={(e) => setStartPeriod(e.target.value as "오전" | "오후")}
                  className='px-3 py-2 border border-theme-tertiary rounded-md bg-theme-secondary text-theme-primary'
                >
                  <option value='오전'>오전</option>
                  <option value='오후'>오후</option>
                </select>
                <select
                  value={startHour}
                  onChange={(e) => setStartHour(e.target.value)}
                  className='px-3 py-2 border border-theme-tertiary rounded-md bg-theme-secondary text-theme-primary'
                >
                  {hourOptions.map((hour) => (
                    <option key={hour} value={hour}>
                      {hour}시
                    </option>
                  ))}
                </select>
                <select
                  value={startMinute}
                  onChange={(e) => setStartMinute(e.target.value)}
                  className='px-3 py-2 border border-theme-tertiary rounded-md bg-theme-secondary text-theme-primary'
                >
                  {minuteOptions.map((minute) => (
                    <option key={minute} value={minute}>
                      {minute}분
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 종료 시간 */}
            <div>
              <label className='block text-sm font-medium text-theme-primary mb-2'>
                종료 시간
              </label>
              <div className='flex items-center gap-2'>
                <select
                  value={endPeriod}
                  onChange={(e) => setEndPeriod(e.target.value as "오전" | "오후")}
                  className='px-3 py-2 border border-theme-tertiary rounded-md bg-theme-secondary text-theme-primary'
                >
                  <option value='오전'>오전</option>
                  <option value='오후'>오후</option>
                </select>
                <select
                  value={endHour}
                  onChange={(e) => setEndHour(e.target.value)}
                  className='px-3 py-2 border border-theme-tertiary rounded-md bg-theme-secondary text-theme-primary'
                >
                  {hourOptions.map((hour) => (
                    <option key={hour} value={hour}>
                      {hour}시
                    </option>
                  ))}
                </select>
                <select
                  value={endMinute}
                  onChange={(e) => setEndMinute(e.target.value)}
                  className='px-3 py-2 border border-theme-tertiary rounded-md bg-theme-secondary text-theme-primary'
                >
                  {minuteOptions.map((minute) => (
                    <option key={minute} value={minute}>
                      {minute}분
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 날짜 표시 (읽기 전용) */}
            <div>
              <label className='block text-sm font-medium text-theme-primary mb-2'>
                날짜
              </label>
              <div className='px-3 py-2 border border-theme-tertiary rounded-md bg-theme-tertiary text-theme-secondary'>
                {session.date}
              </div>
            </div>
          </div>
        </div>

        <div className='flex gap-3'>
          <button
            onClick={onClose}
            className='flex-1 px-4 py-2 border border-theme-tertiary text-theme-primary rounded-md hover:bg-theme-tertiary transition-colors'
            disabled={isSaving}
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className='flex-1 px-4 py-2 bg-accent-theme text-white rounded-md hover:bg-accent-theme-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
          >
            <Clock className='h-4 w-4' />
            {isSaving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  )
}

