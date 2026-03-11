"use client"

import { useState, useEffect } from "react"
import { X, Clock } from "lucide-react"
import { ReadingSession } from "@/types/user"
import { getKoreaDate } from "@/utils/timeUtils"

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

  const getKoreaTimeFromDate = (date: Date) => {
    const koreaH = (date.getUTCHours() + 9) % 24
    const koreaM = date.getUTCMinutes()
    const period: "오전" | "오후" = koreaH < 12 ? "오전" : "오후"
    const hour12 = koreaH === 0 ? 12 : koreaH > 12 ? koreaH - 12 : koreaH
    return {
      period,
      hour: hour12.toString().padStart(2, "0"),
      minute: koreaM.toString().padStart(2, "0"),
    }
  }

  const [dateStr, setDateStr] = useState(todayKorea)
  const [startPeriod, setStartPeriod] = useState<"오전" | "오후">("오전")
  const [startHour, setStartHour] = useState("12")
  const [startMinute, setStartMinute] = useState("00")
  const [endPeriod, setEndPeriod] = useState<"오전" | "오후">("오후")
  const [endHour, setEndHour] = useState("12")
  const [endMinute, setEndMinute] = useState("00")
  const [durationMinutes, setDurationMinutes] = useState("")
  const [useDurationInput, setUseDurationInput] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      const now = new Date()
      const end30 = new Date(now.getTime() + 30 * 60 * 1000)
      const startK = getKoreaTimeFromDate(now)
      const endK = getKoreaTimeFromDate(end30)
      setDateStr(getKoreaDate(now))
      setStartPeriod(startK.period)
      setStartHour(startK.hour)
      setStartMinute(startK.minute)
      setEndPeriod(endK.period)
      setEndHour(endK.hour)
      setEndMinute(endK.minute)
      setDurationMinutes("")
      setUseDurationInput(false)
      setError(null)
    }
  }, [isOpen, todayKorea])

  const hourOptions = Array.from({ length: 12 }, (_, i) =>
    (i + 1).toString().padStart(2, "0")
  )
  const minuteOptions = Array.from({ length: 60 }, (_, i) =>
    i.toString().padStart(2, "0")
  )

  const to24 = (period: "오전" | "오후", h: number) => {
    if (period === "오후" && h !== 12) return h + 12
    if (period === "오전" && h === 12) return 0
    return h
  }

  const getStartDate = () => {
    const [y, m, d] = dateStr.split("-").map(Number)
    const h = to24(startPeriod, parseInt(startHour, 10))
    const min = parseInt(startMinute, 10)
    const koreaMs = Date.UTC(y, m - 1, d, h, min, 0, 0)
    const utcMs = koreaMs - 9 * 60 * 60 * 1000
    return new Date(utcMs)
  }

  const getEndDateFromTimes = () => {
    const [y, m, d] = dateStr.split("-").map(Number)
    const h = to24(endPeriod, parseInt(endHour, 10))
    const min = parseInt(endMinute, 10)
    const koreaMs = Date.UTC(y, m - 1, d, h, min, 0, 0)
    const utcMs = koreaMs - 9 * 60 * 60 * 1000
    return new Date(utcMs)
  }

  const startDate = getStartDate()
  let endDate: Date
  let durationSec: number
  let computedDurationMinutes = 0
  let computedEndTimeLabel = ""

  if (useDurationInput && durationMinutes.trim() !== "") {
    const mins = parseInt(durationMinutes, 10)
    if (!isNaN(mins) && mins > 0) {
      endDate = new Date(startDate.getTime() + mins * 60 * 1000)
      durationSec = mins * 60
      computedDurationMinutes = mins
      const koreaEnd = new Date(endDate.getTime() + 9 * 60 * 60 * 1000)
      const h = koreaEnd.getUTCHours()
      const m = koreaEnd.getUTCMinutes()
      const period = h < 12 ? "오전" : "오후"
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
      computedEndTimeLabel = `${period} ${h12}시 ${m}분`
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

  const handleSave = async () => {
    if (!canSubmit) return
    setError(null)

    const finalEnd = useDurationInput && durationMinutes.trim() !== ""
      ? new Date(startDate.getTime() + parseInt(durationMinutes, 10) * 60 * 1000)
      : getEndDateFromTimes()

    const duration = Math.floor((finalEnd.getTime() - startDate.getTime()) / 1000)
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
        err instanceof Error ? err.message : "독서 기록을 추가하는 중 오류가 발생했습니다."
      )
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-theme-backdrop flex items-center justify-center z-50">
      <div className="bg-theme-secondary rounded-lg p-6 w-full max-w-md mx-4 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-theme-primary">독서 기록 추가</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-theme-tertiary transition-colors"
          >
            <X className="h-5 w-5 text-theme-secondary" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-theme-primary mb-2">날짜</label>
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="w-full px-3 py-2 border border-theme-tertiary rounded-md bg-theme-secondary text-theme-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-primary mb-2">시작 시간</label>
            <div className="flex items-center gap-2">
              <select
                value={startPeriod}
                onChange={(e) => setStartPeriod(e.target.value as "오전" | "오후")}
                className="px-3 py-2 border border-theme-tertiary rounded-md bg-theme-secondary text-theme-primary"
              >
                <option value="오전">오전</option>
                <option value="오후">오후</option>
              </select>
              <select
                value={startHour}
                onChange={(e) => setStartHour(e.target.value)}
                className="px-3 py-2 border border-theme-tertiary rounded-md bg-theme-secondary text-theme-primary"
              >
                {hourOptions.map((h) => (
                  <option key={h} value={h}>{h}시</option>
                ))}
              </select>
              <select
                value={startMinute}
                onChange={(e) => setStartMinute(e.target.value)}
                className="px-3 py-2 border border-theme-tertiary rounded-md bg-theme-secondary text-theme-primary"
              >
                {minuteOptions.map((m) => (
                  <option key={m} value={m}>{m}분</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                checked={!useDurationInput}
                onChange={() => setUseDurationInput(false)}
                className="text-accent-theme"
              />
              <span className="text-sm text-theme-primary">종료 시간으로 입력</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                checked={useDurationInput}
                onChange={() => setUseDurationInput(true)}
                className="text-accent-theme"
              />
              <span className="text-sm text-theme-primary">읽은 시간(분)으로 입력</span>
            </label>
          </div>

          {!useDurationInput ? (
            <div>
              <label className="block text-sm font-medium text-theme-primary mb-2">종료 시간</label>
              <div className="flex items-center gap-2">
                <select
                  value={endPeriod}
                  onChange={(e) => setEndPeriod(e.target.value as "오전" | "오후")}
                  className="px-3 py-2 border border-theme-tertiary rounded-md bg-theme-secondary text-theme-primary"
                >
                  <option value="오전">오전</option>
                  <option value="오후">오후</option>
                </select>
                <select
                  value={endHour}
                  onChange={(e) => setEndHour(e.target.value)}
                  className="px-3 py-2 border border-theme-tertiary rounded-md bg-theme-secondary text-theme-primary"
                >
                  {hourOptions.map((h) => (
                    <option key={h} value={h}>{h}시</option>
                  ))}
                </select>
                <select
                  value={endMinute}
                  onChange={(e) => setEndMinute(e.target.value)}
                  className="px-3 py-2 border border-theme-tertiary rounded-md bg-theme-secondary text-theme-primary"
                >
                  {minuteOptions.map((m) => (
                    <option key={m} value={m}>{m}분</option>
                  ))}
                </select>
              </div>
              {durationValid && (
                <p className="mt-2 text-sm text-accent-theme">
                  읽은 시간: <strong>{computedDurationMinutes}분</strong>
                </p>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-theme-primary mb-2">
                읽은 시간 (분)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={durationMinutes}
                onChange={handleDurationChange}
                placeholder="숫자만 입력"
                className="w-full px-3 py-2 border border-theme-tertiary rounded-md bg-theme-secondary text-theme-primary placeholder:text-theme-tertiary"
              />
              {computedEndTimeLabel && durationMinutes.trim() !== "" && (
                <p className="mt-2 text-sm text-theme-secondary">
                  종료 시간: {computedEndTimeLabel}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-theme-tertiary text-theme-primary rounded-md hover:bg-theme-tertiary transition-colors"
            disabled={isSaving}
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSubmit || isSaving}
            className="flex-1 px-4 py-2 bg-accent-theme text-white rounded-md hover:bg-accent-theme-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Clock className="h-4 w-4" />
            {isSaving ? "등록 중..." : "등록"}
          </button>
        </div>
      </div>
    </div>
  )
}
