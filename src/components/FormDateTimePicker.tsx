"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"
import { Calendar, ChevronLeft, ChevronRight, Clock } from "lucide-react"

type CommonPickerProps = {
  value: string
  onChangeAction: (value: string) => void
  id?: string
  required?: boolean
  disabled?: boolean
  "aria-label"?: string
  className?: string
  placeholder?: string
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"]

function parseDateValue(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2]) - 1
  const day = Number(match[3])
  const date = new Date(year, month, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null
  }
  return { year, month, day }
}

function localDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-")
}

function useDismissPicker(
  open: boolean,
  setOpen: (open: boolean) => void,
  disabled: boolean,
) {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (disabled) setOpen(false)
  }, [disabled, setOpen])

  useEffect(() => {
    if (!open) return

    const dismissOnPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }

    document.addEventListener("pointerdown", dismissOnPointerDown)
    document.addEventListener("keydown", dismissOnEscape)
    return () => {
      document.removeEventListener("pointerdown", dismissOnPointerDown)
      document.removeEventListener("keydown", dismissOnEscape)
    }
  }, [open, setOpen])

  return rootRef
}

export function FormDatePicker({
  value,
  onChangeAction,
  id,
  required = false,
  disabled = false,
  "aria-label": ariaLabel,
  className = "",
  placeholder = "날짜를 선택해 주세요",
}: CommonPickerProps) {
  const generatedId = useId()
  const triggerId = id ?? `date-picker-${generatedId}`
  const panelId = `${triggerId}-panel`
  const selectedDate = parseDateValue(value)
  const today = new Date()
  const [open, setOpen] = useState(false)
  const [visibleMonth, setVisibleMonth] = useState(() => ({
    year: selectedDate?.year ?? today.getFullYear(),
    month: selectedDate?.month ?? today.getMonth(),
  }))
  const rootRef = useDismissPicker(open, setOpen, disabled)

  const calendarDays = useMemo(() => {
    const firstWeekday = new Date(
      visibleMonth.year,
      visibleMonth.month,
      1,
    ).getDay()
    const count = new Date(
      visibleMonth.year,
      visibleMonth.month + 1,
      0,
    ).getDate()
    return [
      ...Array.from({ length: firstWeekday }, () => null),
      ...Array.from({ length: count }, (_, index) => index + 1),
    ]
  }, [visibleMonth])

  const toggle = () => {
    if (disabled) return
    if (!open) {
      const nextDate = parseDateValue(value)
      const now = new Date()
      setVisibleMonth({
        year: nextDate?.year ?? now.getFullYear(),
        month: nextDate?.month ?? now.getMonth(),
      })
    }
    setOpen((current) => !current)
  }

  const moveMonth = (offset: number) => {
    setVisibleMonth((current) => {
      const next = new Date(current.year, current.month + offset, 1)
      return { year: next.getFullYear(), month: next.getMonth() }
    })
  }

  const selectDay = (day: number) => {
    const nextValue = [
      visibleMonth.year,
      String(visibleMonth.month + 1).padStart(2, "0"),
      String(day).padStart(2, "0"),
    ].join("-")
    onChangeAction(nextValue)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className={`w-full min-w-0 ${className}`.trim()}>
      <button
        id={triggerId}
        type="button"
        onClick={toggle}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        aria-required={required}
        className="form-control !flex min-h-11 cursor-pointer items-center justify-between gap-3 text-left disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={value ? "text-theme-primary" : "text-theme-tertiary"}>
          {selectedDate
            ? `${selectedDate.year}.${String(selectedDate.month + 1).padStart(2, "0")}.${String(selectedDate.day).padStart(2, "0")}`
            : placeholder}
        </span>
        <Calendar className="h-[1.05rem] w-[1.05rem] shrink-0 text-accent-theme" aria-hidden />
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="날짜 선택"
          className="mt-2 rounded-lg border border-theme-secondary bg-theme-primary p-3 shadow-lg"
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => moveMonth(-1)}
              className="flex h-11 w-11 items-center justify-center rounded-lg text-theme-primary hover:bg-theme-tertiary"
              aria-label="이전 달"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <strong className="text-sm text-theme-primary">
              {visibleMonth.year}년 {visibleMonth.month + 1}월
            </strong>
            <button
              type="button"
              onClick={() => moveMonth(1)}
              className="flex h-11 w-11 items-center justify-center rounded-lg text-theme-primary hover:bg-theme-tertiary"
              aria-label="다음 달"
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <div className="grid grid-cols-7 text-center">
            {WEEKDAYS.map((weekday) => (
              <span key={weekday} className="py-1 text-xs font-medium text-theme-secondary">
                {weekday}
              </span>
            ))}
            {calendarDays.map((day, index) => {
              if (!day) return <span key={`empty-${index}`} aria-hidden />
              const dateKey = [
                visibleMonth.year,
                String(visibleMonth.month + 1).padStart(2, "0"),
                String(day).padStart(2, "0"),
              ].join("-")
              const selected = dateKey === value
              const isToday = dateKey === localDateKey(today)
              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => selectDay(day)}
                  aria-label={`${visibleMonth.year}년 ${visibleMonth.month + 1}월 ${day}일`}
                  aria-pressed={selected}
                  className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full text-sm transition-colors ${
                    selected
                      ? "bg-accent-theme font-semibold text-white"
                      : isToday
                        ? "border border-theme-secondary font-semibold text-accent-theme"
                        : "text-theme-primary hover:bg-theme-tertiary"
                  }`}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export function FormTimePicker({
  value,
  onChangeAction,
  id,
  required = false,
  disabled = false,
  "aria-label": ariaLabel,
  className = "",
  placeholder = "시간을 선택해 주세요",
}: CommonPickerProps) {
  const generatedId = useId()
  const triggerId = id ?? `time-picker-${generatedId}`
  const panelId = `${triggerId}-panel`
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value)
  const selectedHour = match ? Number(match[1]) : null
  const selectedMinute = match ? Number(match[2]) : null
  const [open, setOpen] = useState(false)
  const [draftHour, setDraftHour] = useState(selectedHour ?? 19)
  const [draftMinute, setDraftMinute] = useState(selectedMinute ?? 0)
  const rootRef = useDismissPicker(open, setOpen, disabled)
  const hours = Array.from({ length: 24 }, (_, hour) => hour)
  const minutes = useMemo(() => {
    const options = Array.from({ length: 12 }, (_, index) => index * 5)
    if (selectedMinute !== null && !options.includes(selectedMinute)) {
      options.push(selectedMinute)
      options.sort((left, right) => left - right)
    }
    return options
  }, [selectedMinute])

  const toggle = () => {
    if (disabled) return
    if (!open) {
      setDraftHour(selectedHour ?? 19)
      setDraftMinute(selectedMinute ?? 0)
    }
    setOpen((current) => !current)
  }

  const commit = () => {
    onChangeAction(
      `${String(draftHour).padStart(2, "0")}:${String(draftMinute).padStart(2, "0")}`,
    )
    setOpen(false)
  }

  return (
    <div ref={rootRef} className={`w-full min-w-0 ${className}`.trim()}>
      <button
        id={triggerId}
        type="button"
        onClick={toggle}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        aria-required={required}
        className="form-control !flex min-h-11 cursor-pointer items-center justify-between gap-3 text-left disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={match ? "text-theme-primary" : "text-theme-tertiary"}>
          {match ? value : placeholder}
        </span>
        <Clock className="h-[1.05rem] w-[1.05rem] shrink-0 text-accent-theme" aria-hidden />
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="시간 선택"
          className="mt-2 rounded-lg border border-theme-secondary bg-theme-primary p-3 shadow-lg"
        >
          <div>
            <p className="mb-2 text-xs font-semibold text-theme-secondary">시</p>
            <div className="grid grid-cols-6 gap-1">
              {hours.map((hour) => (
                <button
                  key={hour}
                  type="button"
                  onClick={() => setDraftHour(hour)}
                  aria-pressed={draftHour === hour}
                  className={`min-h-10 rounded-lg text-sm ${
                    draftHour === hour
                      ? "bg-accent-theme font-semibold text-white"
                      : "bg-theme-tertiary text-theme-primary"
                  }`}
                >
                  {String(hour).padStart(2, "0")}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3">
            <p className="mb-2 text-xs font-semibold text-theme-secondary">분</p>
            <div className="grid grid-cols-6 gap-1">
              {minutes.map((minute) => (
                <button
                  key={minute}
                  type="button"
                  onClick={() => setDraftMinute(minute)}
                  aria-pressed={draftMinute === minute}
                  className={`min-h-10 rounded-lg text-sm ${
                    draftMinute === minute
                      ? "bg-accent-theme font-semibold text-white"
                      : "bg-theme-tertiary text-theme-primary"
                  }`}
                >
                  {String(minute).padStart(2, "0")}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={commit}
            className="mt-3 min-h-11 w-full rounded-lg bg-accent-theme px-4 py-2 text-sm font-semibold text-white"
          >
            {String(draftHour).padStart(2, "0")}:
            {String(draftMinute).padStart(2, "0")} 선택
          </button>
        </div>
      )}
    </div>
  )
}
