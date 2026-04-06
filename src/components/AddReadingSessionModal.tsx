"use client"

import { useState, useEffect } from "react"
import { Clock } from "lucide-react"
import { ReadingSession } from "@/types/user"
import {
  getKoreaDate,
  koreaYmdAndTimeToUtcDate,
  utcInstantToKoreaHHmm,
} from "@/utils/timeUtils"
import FormModalFrame from "@/components/FormModalFrame"
import { FormNativePickerInput } from "@/components/FormNativePickerInput"

interface AddReadingSessionModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (session: Omit<ReadingSession, "id" | "created_at" | "updated_at">) => Promise<void>
  bookId: string
  userId: string
}

export default function AddReadingSessionModal({
  isOpen,
  onClose,
  onSave,
  bookId,
  userId,
}: AddReadingSessionModalProps) {
  const todayKorea = getKoreaDate(new Date())

  const [dateStr, setDateStr] = useState(todayKorea)
  const [startTimeStr, setStartTimeStr] = useState("12:00")
  const [endTimeStr, setEndTimeStr] = useState("12:30")
  const [durationMinutes, setDurationMinutes] = useState("")
  const [useDurationInput, setUseDurationInput] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      const now = new Date()
      const end30 = new Date(now.getTime() + 30 * 60 * 1000)
      setDateStr(getKoreaDate(now))
      setStartTimeStr(utcInstantToKoreaHHmm(now))
      setEndTimeStr(utcInstantToKoreaHHmm(end30))
      setDurationMinutes("")
      setUseDurationInput(false)
      setError(null)
    }
  }, [isOpen, todayKorea])

  const getStartDate = () => koreaYmdAndTimeToUtcDate(dateStr, startTimeStr)

  const getEndDateFromTimes = () =>
    koreaYmdAndTimeToUtcDate(dateStr, endTimeStr)

  const startDate = getStartDate()
  let endDate: Date
  let durationSec: number
  let computedDurationMinutes = 0
  let computedEndHHmm = ""

  if (useDurationInput && durationMinutes.trim() !== "") {
    const mins = parseInt(durationMinutes, 10)
    if (!isNaN(mins) && mins > 0) {
      endDate = new Date(startDate.getTime() + mins * 60 * 1000)
      durationSec = mins * 60
      computedDurationMinutes = mins
      computedEndHHmm = utcInstantToKoreaHHmm(endDate)
    } else {
      endDate = getEndDateFromTimes()
      durationSec = Math.floor((endDate.getTime() - startDate.getTime()) / 1000)
      computedDurationMinutes = Math.floor(durationSec / 60)
    }
  } else {
    endDate = getEndDateFromTimes()
    durationSec = Math.floor((endDate.getTime() - startDate.getTime()) / 1000)
    computedDurationMinutes = Math.floor(durationSec / 60)
  }

  const durationValid = durationSec > 0
  const canSubmit =
    durationValid &&
    (useDurationInput
      ? durationMinutes.trim() !== "" &&
        !isNaN(parseInt(durationMinutes, 10)) &&
        parseInt(durationMinutes, 10) > 0
      : true)

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    if (v === "" || /^\d+$/.test(v)) setDurationMinutes(v)
  }

  const switchToEndTimeMode = () => {
    if (useDurationInput && durationMinutes.trim()) {
      const n = parseInt(durationMinutes, 10)
      if (!isNaN(n) && n > 0) {
        const s = koreaYmdAndTimeToUtcDate(dateStr, startTimeStr)
        setEndTimeStr(utcInstantToKoreaHHmm(new Date(s.getTime() + n * 60 * 1000)))
      }
    }
    setUseDurationInput(false)
  }

  const switchToDurationMode = () => {
    const s = koreaYmdAndTimeToUtcDate(dateStr, startTimeStr)
    const e = koreaYmdAndTimeToUtcDate(dateStr, endTimeStr)
    let mins = Math.floor((e.getTime() - s.getTime()) / 60000)
    if (mins <= 0) mins = 30
    setDurationMinutes(String(mins))
    setUseDurationInput(true)
  }

  const handleSave = async () => {
    if (!canSubmit) return
    setError(null)

    const finalEnd =
      useDurationInput && durationMinutes.trim() !== ""
        ? new Date(
            getStartDate().getTime() + parseInt(durationMinutes, 10) * 60 * 1000
          )
        : getEndDateFromTimes()

    const duration = Math.floor(
      (finalEnd.getTime() - startDate.getTime()) / 1000
    )
    if (duration <= 0) {
      setError("종료 시간은 시작 시간보다 늦어야 합니다.")
      return
    }

    try {
      setIsSaving(true)
      await onSave({
        user_id: userId,
        bookId,
        startTime: startDate.toISOString(),
        endTime: finalEnd.toISOString(),
        duration,
        date: dateStr,
      })
      onClose()
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "독서 기록을 추가하는 중 오류가 발생했습니다."
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <FormModalFrame
      isOpen={isOpen}
      onClose={onClose}
      title="독서 기록 추가"
      headerStart={
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-theme-tertiary">
          <Clock className="h-5 w-5 accent-theme-primary" aria-hidden />
        </div>
      }
    >
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="form-modal-fieldset space-y-3 sm:space-y-4">
        <div>
          <label className="mb-0.5 block text-sm font-medium text-theme-primary">
            날짜
          </label>
          <FormNativePickerInput
            picker="date"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-0.5 block text-sm font-medium text-theme-primary">
            시작 시간
          </label>
          <FormNativePickerInput
            picker="time"
            value={startTimeStr}
            onChange={(e) => setStartTimeStr(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="mode"
              checked={!useDurationInput}
              onChange={switchToEndTimeMode}
              className="text-accent-theme"
            />
            <span className="text-sm text-theme-primary">종료 시간으로 입력</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="mode"
              checked={useDurationInput}
              onChange={switchToDurationMode}
              className="text-accent-theme"
            />
            <span className="text-sm text-theme-primary">
              읽은 시간(분)으로 입력
            </span>
          </label>
        </div>

        {!useDurationInput ? (
          <div>
            <label className="mb-0.5 block text-sm font-medium text-theme-primary">
              종료 시간
            </label>
            <FormNativePickerInput
              picker="time"
              value={endTimeStr}
              onChange={(e) => setEndTimeStr(e.target.value)}
            />
            {durationValid && (
              <p className="mt-2 text-sm text-accent-theme">
                읽은 시간: <strong>{computedDurationMinutes}분</strong>
              </p>
            )}
          </div>
        ) : (
          <div>
            <label className="mb-0.5 block text-sm font-medium text-theme-primary">
              읽은 시간 (분)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={durationMinutes}
              onChange={handleDurationChange}
              placeholder="숫자만 입력"
              className="form-control"
            />
            {computedEndHHmm && durationMinutes.trim() !== "" && (
              <p className="mt-2 text-sm text-theme-secondary">
                종료 시각(한국): {computedEndHHmm}
              </p>
            )}
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-theme-secondary">
        시작·종료 시간은 모바일에서 OS 시간 피커(스크롤)로 고를 수 있어요.
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
          disabled={!canSubmit || isSaving}
          className="flex items-center justify-center gap-2 rounded-md bg-accent-theme px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-theme-secondary disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Clock className="h-4 w-4" />
          {isSaving ? "등록 중..." : "등록"}
        </button>
      </div>
    </FormModalFrame>
  )
}
