"use client"

import { Clock } from "lucide-react"
import type { RefObject } from "react"
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react"

const ROW_PX = 40
const VIEW_PX = ROW_PX * 2
const PAD_PX = (VIEW_PX - ROW_PX) / 2
const CIRCULAR_REPEAT_BLOCKS = 9
const CIRCULAR_MIDDLE_BLOCK = Math.floor(CIRCULAR_REPEAT_BLOCKS / 2)

function normalizeTimeInputToHms(value: string): string {
  const trimmed = value.trim()
  // 1230 → 12:30:00, 123045 → 12:30:45
  if (/^\d{3,4}$/.test(trimmed)) {
    const padded = trimmed.padStart(4, "0")
    const h = Math.min(23, parseInt(padded.slice(0, 2), 10) || 0)
    const m = Math.min(59, parseInt(padded.slice(2, 4), 10) || 0)
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`
  }
  if (/^\d{5,6}$/.test(trimmed)) {
    const padded = trimmed.padStart(6, "0")
    const h = Math.min(23, parseInt(padded.slice(0, 2), 10) || 0)
    const m = Math.min(59, parseInt(padded.slice(2, 4), 10) || 0)
    const s = Math.min(59, parseInt(padded.slice(4, 6), 10) || 0)
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }
  const parts = trimmed.split(":")
  const h = Math.min(23, Math.max(0, parseInt(parts[0] ?? "0", 10) || 0))
  const m = Math.min(59, Math.max(0, parseInt(parts[1] ?? "0", 10) || 0))
  const s = Math.min(59, Math.max(0, parseInt(parts[2] ?? "0", 10) || 0))
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

function formatHmsWithKoreanLabel(hms: string): string {
  const [h, m, s] = normalizeTimeInputToHms(hms)
    .split(":")
    .map((x) => parseInt(x, 10) || 0)
  const period = h < 12 ? "오전" : "오후"
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `(${period} ${hour12}시 ${String(m).padStart(2, "0")}분 ${String(s).padStart(2, "0")}초)`
}

function splitHms(normalized: string): [number, number, number] {
  const [h, m, s] = normalizeTimeInputToHms(normalized)
    .split(":")
    .map((x) => parseInt(x, 10) || 0)
  return [h, m, s]
}

function formatHms(h: number, m: number, s: number): string {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

function scrollRowIndexForValue(count: number, value: number): number {
  return CIRCULAR_MIDDLE_BLOCK * count + value
}

function readCircularValue(scrollEl: HTMLDivElement | null, count: number): number {
  if (!scrollEl) return 0
  const totalRows = count * CIRCULAR_REPEAT_BLOCKS
  const k = Math.min(totalRows - 1, Math.max(0, Math.round(scrollEl.scrollTop / ROW_PX)))
  return k % count
}

type WallClockHmsFieldsProps = {
  value: string
  onChangeAction: (nextHms: string) => void
  disabled?: boolean
  idPrefix?: string
}

type HmsWheelPanelProps = {
  draftValue: string
  onDraftChange: (nextHms: string) => void
  idPrefix: string
}

function HmsWheelPanel({ draftValue, onDraftChange, idPrefix }: HmsWheelPanelProps) {
  const hourRef = useRef<HTMLDivElement>(null)
  const minRef = useRef<HTMLDivElement>(null)
  const secRef = useRef<HTMLDivElement>(null)
  const syncingRef = useRef(false)
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const readIndicesFromScroll = useCallback((): { hi: number; mi: number; si: number } | null => {
    const hEl = hourRef.current
    const mEl = minRef.current
    const sEl = secRef.current
    if (!hEl || !mEl || !sEl) return null
    return {
      hi: readCircularValue(hEl, 24),
      mi: readCircularValue(mEl, 60),
      si: readCircularValue(sEl, 60),
    }
  }, [])

  const applyScrollPositions = useCallback((hi: number, mi: number, si: number) => {
    const hEl = hourRef.current
    const mEl = minRef.current
    const sEl = secRef.current
    if (!hEl || !mEl || !sEl) return
    syncingRef.current = true
    hEl.scrollTop = scrollRowIndexForValue(24, hi) * ROW_PX
    mEl.scrollTop = scrollRowIndexForValue(60, mi) * ROW_PX
    sEl.scrollTop = scrollRowIndexForValue(60, si) * ROW_PX
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        syncingRef.current = false
      })
    })
  }, [])

  useLayoutEffect(() => {
    const [hi, mi, si] = splitHms(draftValue)
    applyScrollPositions(hi, mi, si)
  }, [draftValue, applyScrollPositions])

  const scheduleDraftFromScroll = useCallback(() => {
    if (syncingRef.current) return
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current)
    settleTimerRef.current = setTimeout(() => {
      settleTimerRef.current = null
      if (syncingRef.current) return
      const got = readIndicesFromScroll()
      if (!got) return
      const next = formatHms(got.hi, got.mi, got.si)
      const cur = normalizeTimeInputToHms(draftValue)
      if (next !== cur) onDraftChange(next)
      applyScrollPositions(got.hi, got.mi, got.si)
    }, 72)
  }, [draftValue, onDraftChange, readIndicesFromScroll, applyScrollPositions])

  useEffect(() => {
    return () => {
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current)
    }
  }, [])

  const wheelClass =
    "relative w-full min-w-0 snap-y snap-mandatory overflow-y-auto overflow-x-hidden rounded-md bg-theme-secondary/70 outline-none ring-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
  const rowClass =
    "flex w-full shrink-0 snap-center items-center justify-center text-sm font-semibold tabular-nums text-theme-primary"

  const renderCircularColumn = (
    ref: RefObject<HTMLDivElement | null>,
    count: number,
    labelId: string,
    which: "h" | "m" | "s"
  ) => {
    const totalRows = count * CIRCULAR_REPEAT_BLOCKS
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center gap-1">
        <div
          ref={ref}
          id={`${idPrefix}-${which}-wheel`}
          className={wheelClass}
          style={{ height: VIEW_PX }}
          tabIndex={0}
          role="listbox"
          aria-labelledby={labelId}
          onScroll={scheduleDraftFromScroll}
        >
          <div className="flex flex-col" style={{ paddingTop: PAD_PX, paddingBottom: PAD_PX }}>
            {Array.from({ length: totalRows }, (_, idx) => {
              const logical = idx % count
              return (
                <button
                  key={idx}
                  type="button"
                  tabIndex={-1}
                  style={{ height: ROW_PX }}
                  className={`${rowClass} cursor-pointer hover:bg-theme-tertiary active:bg-theme-tertiary/80`}
                  onClick={() => {
                    const t = readIndicesFromScroll()
                    if (!t) return
                    const hi = which === "h" ? logical : t.hi
                    const mi = which === "m" ? logical : t.mi
                    const si = which === "s" ? logical : t.si
                    onDraftChange(formatHms(hi, mi, si))
                  }}
                >
                  {String(logical).padStart(2, "0")}
                </button>
              )
            })}
          </div>
          <div
            className="pointer-events-none absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 border-y border-accent-theme/40 bg-accent-theme/10"
            style={{ height: ROW_PX }}
            aria-hidden
          />
        </div>
        <span id={labelId} className="text-[10px] font-medium text-theme-secondary">
          {which === "h" ? "시" : which === "m" ? "분" : "초"}
        </span>
      </div>
    )
  }

  return (
    <div className="flex w-full min-w-0 items-start justify-center gap-0.5 sm:gap-1">
      {renderCircularColumn(hourRef, 24, `${idPrefix}-h-lbl`, "h")}
      <div className="flex shrink-0 items-center justify-center text-sm font-semibold text-theme-secondary" style={{ height: VIEW_PX }} aria-hidden>
        :
      </div>
      {renderCircularColumn(minRef, 60, `${idPrefix}-m-lbl`, "m")}
      <div className="flex shrink-0 items-center justify-center text-sm font-semibold text-theme-secondary" style={{ height: VIEW_PX }} aria-hidden>
        :
      </div>
      {renderCircularColumn(secRef, 60, `${idPrefix}-s-lbl`, "s")}
    </div>
  )
}

export default function WallClockHmsFields({
  value,
  onChangeAction,
  disabled = false,
  idPrefix,
}: WallClockHmsFieldsProps) {
  const reactId = useId()
  const base = idPrefix || `hms-${reactId.replace(/:/g, "")}`
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [draftValue, setDraftValue] = useState(() => normalizeTimeInputToHms(value))
  const [textValue, setTextValue] = useState(() => normalizeTimeInputToHms(value))

  useEffect(() => {
    if (disabled) setOpen(false)
  }, [disabled])

  useEffect(() => {
    if (open) return
    const normalized = normalizeTimeInputToHms(value)
    setTextValue(normalized)
    setDraftValue(normalized)
  }, [value, open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  useEffect(() => {
    if (!open) return
    const root = rootRef.current
    if (!root) return
    const closeWithoutCommit = (e: Event) => {
      const t = e.target
      if (!(t instanceof Node)) return
      if (root.contains(t)) return
      setOpen(false)
    }
    document.addEventListener("pointerdown", closeWithoutCommit, true)
    document.addEventListener("focusin", closeWithoutCommit, true)
    return () => {
      document.removeEventListener("pointerdown", closeWithoutCommit, true)
      document.removeEventListener("focusin", closeWithoutCommit, true)
    }
  }, [open])

  const openPicker = useCallback(() => {
    if (disabled) return
    const normalized = normalizeTimeInputToHms(textValue || value)
    setDraftValue(normalized)
    setTextValue(normalized)
    setOpen(true)
  }, [disabled, textValue, value])

  const commitText = useCallback(() => {
    const normalized = normalizeTimeInputToHms(textValue)
    setTextValue(normalized)
    setDraftValue(normalized)
    onChangeAction(normalized)
  }, [textValue, onChangeAction])

  const commitAndClose = useCallback(() => {
    const normalized = normalizeTimeInputToHms(draftValue)
    setTextValue(normalized)
    onChangeAction(normalized)
    setOpen(false)
  }, [draftValue, onChangeAction])

  const koreanHint = formatHmsWithKoreanLabel(open ? draftValue : textValue)

  return (
    <div ref={rootRef} className="flex w-full min-w-0 flex-1 flex-col self-stretch">
      <div className="flex min-h-0 w-full flex-1 items-center gap-2">
        <input
          ref={inputRef}
          id={`${base}-text`}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          value={textValue}
          placeholder="HH:MM:SS"
          aria-label="시각 직접 입력"
          className="form-control min-w-0 flex-1 tabular-nums"
          onChange={(e) => {
            const next = e.target.value
            if (next === "" || /^[\d:]*$/.test(next)) {
              setTextValue(next)
            }
          }}
          onBlur={commitText}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              commitText()
              inputRef.current?.blur()
            }
          }}
        />
        <button
          type="button"
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label="휠로 시간 선택"
          title="휠로 선택"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-theme-tertiary text-theme-secondary transition-colors hover:bg-theme-tertiary disabled:cursor-not-allowed disabled:opacity-50"
          onClick={(e) => {
            e.stopPropagation()
            if (open) {
              setOpen(false)
              return
            }
            openPicker()
          }}
        >
          <Clock className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <p className="mt-1 text-xs text-theme-secondary">{koreanHint}</p>
      <p className="mt-0.5 text-[11px] text-theme-tertiary">
        예: 14:30:00 또는 143000 · 시계 아이콘으로 휠 선택
      </p>

      {open && !disabled ? (
        <div
          className="mt-2 border-t border-card pt-2"
          role="dialog"
          aria-label="시간 선택"
          onClick={(e) => e.stopPropagation()}
        >
          <HmsWheelPanel
            draftValue={draftValue}
            onDraftChange={(v) => {
              const next = normalizeTimeInputToHms(v)
              setDraftValue(next)
              setTextValue(next)
            }}
            idPrefix={base}
          />
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              className="rounded-md bg-accent-theme px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-theme-secondary"
              onClick={(e) => {
                e.stopPropagation()
                commitAndClose()
              }}
            >
              완료
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
