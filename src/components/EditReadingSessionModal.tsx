"use client"

import { useState, useEffect } from "react"
import { Clock } from "lucide-react"
import { ReadingSession } from "@/types/user"
import FormModalFrame from "@/components/FormModalFrame"
import {
  koreaYmdAndTimeToUtcDate,
  utcInstantToKoreaHHmmss,
} from "@/utils/timeUtils"
import WallClockHmsFields from "@/components/WallClockHmsFields"

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
  const [startTimeStr, setStartTimeStr] = useState("12:00:00")
  const [endTimeStr, setEndTimeStr] = useState("12:00:00")
  const [durationMinutes, setDurationMinutes] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (session && isOpen) {
      setStartTimeStr(utcInstantToKoreaHHmmss(session.startTime))
      setEndTimeStr(utcInstantToKoreaHHmmss(session.endTime))
      setError(null)
      setDurationMinutes("")
    }
  }, [session, isOpen])

  const getStartDate = () => {
    if (!session) return new Date(0)
    return koreaYmdAndTimeToUtcDate(session.date, startTimeStr)
  }

  const getEndDateFromTimes = () => {
    if (!session) return new Date(0)
    return koreaYmdAndTimeToUtcDate(session.date, endTimeStr)
  }

  const computedDurationFromTimes = (() => {
    if (!session) return 0
    const start = getStartDate()
    let end = getEndDateFromTimes()
    if (end <= start) end = new Date(end.getTime() + 24 * 60 * 60 * 1000)
    return Math.floor((end.getTime() - start.getTime()) / 60000)
  })()

  const handleDurationMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    if (v === "" || /^\d+$/.test(v)) setDurationMinutes(v)
  }

  const applyDurationToEndTime = (minutes: number) => {
    if (!session) return
    const start = getStartDate()
    const end = new Date(start.getTime() + minutes * 60 * 1000)
    setEndTimeStr(utcInstantToKoreaHHmmss(end))
  }

  const handleSave = async () => {
    if (!session) return

    setError(null)

    const newStartDate = getStartDate()

    let newEndDate: Date
    if (
      durationMinutes.trim() !== "" &&
      !isNaN(parseInt(durationMinutes, 10)) &&
      parseInt(durationMinutes, 10) > 0
    ) {
      const mins = parseInt(durationMinutes, 10)
      newEndDate = new Date(newStartDate.getTime() + mins * 60 * 1000)
    } else {
      newEndDate = getEndDateFromTimes()
    }

    if (newEndDate <= newStartDate) {
      newEndDate.setUTCDate(newEndDate.getUTCDate() + 1)
    }

    const duration = Math.floor(
      (newEndDate.getTime() - newStartDate.getTime()) / 1000
    )

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
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "독서 기록을 수정하는 중 오류가 발생했습니다."
      setError(msg)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen || !session) return null

  return (
    <FormModalFrame
      isOpen
      onClose={onClose}
      title="독서 기록 수정"
      headerStart={
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-theme-tertiary">
          <Clock className="h-5 w-5 accent-theme-primary" aria-hidden />
        </div>
      }
    >
      <p className="mb-3 text-sm text-theme-secondary sm:mb-4">
        날짜는 변경할 수 없으며, 시간만 수정할 수 있습니다.
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="form-modal-fieldset space-y-3 sm:space-y-4">
        <div>
          <label className="mb-0.5 block text-sm font-medium text-theme-primary">
            시작 시간
          </label>
          <WallClockHmsFields
            value={startTimeStr}
            onChangeAction={setStartTimeStr}
            idPrefix="edit-reading-start"
          />
        </div>

        <div>
          <label className="mb-0.5 block text-sm font-medium text-theme-primary">
            종료 시간
          </label>
          <WallClockHmsFields
            value={endTimeStr}
            onChangeAction={setEndTimeStr}
            idPrefix="edit-reading-end"
          />
          {computedDurationFromTimes > 0 && (
            <p className="mt-2 text-sm text-accent-theme">
              읽은 시간: <strong>{computedDurationFromTimes}분</strong>
            </p>
          )}
        </div>

        <div>
          <label className="mb-0.5 block text-sm font-medium text-theme-primary">
            또는 읽은 시간(분)으로 입력 후 적용
          </label>
          <div className="flex items-stretch gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={durationMinutes}
              onChange={handleDurationMinutesChange}
              placeholder="분 → 종료 시각 반영"
              className="form-control min-w-0 flex-1"
            />
            <button
              type="button"
              onClick={() => {
                const n = parseInt(durationMinutes, 10)
                if (!isNaN(n) && n > 0) applyDurationToEndTime(n)
              }}
              disabled={
                !durationMinutes.trim() ||
                isNaN(parseInt(durationMinutes, 10)) ||
                parseInt(durationMinutes, 10) <= 0
              }
              className="shrink-0 rounded-md bg-theme-secondary px-3 py-2 text-sm font-medium text-theme-primary transition-colors hover:bg-theme-tertiary disabled:cursor-not-allowed disabled:opacity-50"
            >
              적용
            </button>
          </div>
        </div>

        <div>
          <label className="mb-0.5 block text-sm font-medium text-theme-primary">
            날짜
          </label>
          <div className="rounded-md border-card bg-theme-secondary px-3 py-2 text-sm text-theme-secondary">
            {session.date}
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs text-theme-secondary">
        시작·종료 시간 수정은 시/분/초 단위로 저장됩니다.
      </p>

      <div className="mt-4 flex justify-end gap-2 sm:mt-6">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md bg-theme-secondary px-4 py-2 text-sm font-medium text-theme-primary transition-colors hover:bg-theme-tertiary disabled:opacity-50"
          disabled={isSaving}
        >
          취소
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center justify-center gap-2 rounded-md bg-accent-theme px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-theme-secondary disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Clock className="h-4 w-4" />
          {isSaving ? "저장 중..." : "저장"}
        </button>
      </div>
    </FormModalFrame>
  )
}
