"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import {
  READING_TIMER_AMBIENT_TRACKS,
  READING_TIMER_BG_PRESETS,
} from "@/constants/readingTimerMedia"
import { useReadingTimerSheet } from "@/contexts/ReadingTimerSheetContext"
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock"

const CLOSE_DRAG_PX = 96

type Props = {
  isOpen: boolean
  onClose: () => void
  ambientTrackId: string
  onAmbientChange: (id: string) => void
  timerBgId: string
  onTimerBgChange: (id: string) => void
}

export default function ReadingTimerSettingsModal({
  isOpen,
  onClose,
  ambientTrackId,
  onAmbientChange,
  timerBgId,
  onTimerBgChange,
}: Props) {
  const [mounted, setMounted] = useState(false)
  const { setSheetOpen } = useReadingTimerSheet()
  const sheetRef = useRef<HTMLDivElement>(null)
  const dragY = useRef(0)
  const dragStartY = useRef(0)
  const dragging = useRef(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    setSheetOpen(isOpen)
    return () => setSheetOpen(false)
  }, [isOpen, setSheetOpen])

  useBodyScrollLock(isOpen && mounted)

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [isOpen, onClose])

  const applySheetTransform = (y: number) => {
    const el = sheetRef.current
    if (el) el.style.transform = y > 0 ? `translateY(${y}px)` : ""
  }

  const endDrag = () => {
    dragging.current = false
    if (dragY.current >= CLOSE_DRAG_PX) {
      onClose()
    }
    dragY.current = 0
    applySheetTransform(0)
  }

  const onHandlePointerDown = (e: React.PointerEvent) => {
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 640px)").matches) {
      return
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    dragging.current = true
    dragStartY.current = e.clientY
    dragY.current = 0
  }

  const onHandlePointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return
    const dy = e.clientY - dragStartY.current
    dragY.current = Math.max(0, dy)
    applySheetTransform(dragY.current)
  }

  const onHandlePointerUp = (e: React.PointerEvent) => {
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    endDrag()
  }

  if (!mounted || !isOpen) return null

  const node = (
    <div
      className='fixed inset-0 z-[340] flex items-end justify-center overflow-hidden overscroll-none p-0 sm:items-center sm:p-4'
      role='presentation'
    >
      <div
        className='absolute inset-0 bg-theme-backdrop'
        aria-hidden
        onClick={onClose}
      />
      <div
        ref={sheetRef}
        className='modal-form-shell modal-dialog-surface relative z-10 mt-auto flex max-h-[85dvh] flex-col overflow-hidden rounded-t-2xl border-b-0 sm:mt-0 sm:max-h-[min(90dvh,32rem)] sm:rounded-xl sm:border-b'
        role='dialog'
        aria-modal='true'
        aria-labelledby='reading-timer-settings-title'
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className='flex h-9 shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing sm:hidden'
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerUp}
        >
          <div className='h-1 w-11 rounded-full bg-theme-tertiary' />
        </div>

        <div className='flex min-h-0 flex-1 flex-col px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-1 sm:px-6 sm:pb-5'>
          <div className='flex shrink-0 items-start justify-between gap-3'>
            <div className='min-w-0'>
              <h2
                id='reading-timer-settings-title'
                className='text-base font-semibold text-theme-primary'
              >
                타이머 설정
              </h2>
            </div>
            <button
              type='button'
              onClick={onClose}
              className='shrink-0 rounded-md p-1.5 text-theme-secondary transition-colors hover:bg-theme-tertiary hover:text-theme-primary'
              aria-label='닫기'
            >
              <X className='h-5 w-5' />
            </button>
          </div>

          <div className='mt-4 min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain pr-1'>
            <section>
              <h3 className='mb-2 text-xs font-semibold text-theme-secondary'>배경</h3>
              <ul className='space-y-1'>
                {READING_TIMER_BG_PRESETS.map((p) => (
                  <li key={p.id}>
                    <button
                      type='button'
                      onClick={() => onTimerBgChange(p.id)}
                      className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                        timerBgId === p.id
                          ? "bg-accent-theme/15 font-medium text-accent-theme"
                          : "text-theme-secondary hover:bg-theme-tertiary/60"
                      }`}
                    >
                      {p.label}
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h3 className='mb-2 text-xs font-semibold text-theme-secondary'>배경음</h3>
              <ul className='space-y-1'>
                {READING_TIMER_AMBIENT_TRACKS.map((t) => (
                  <li key={t.id}>
                    <button
                      type='button'
                      onClick={() => onAmbientChange(t.id)}
                      className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                        ambientTrackId === t.id
                          ? "bg-accent-theme/15 font-medium text-accent-theme"
                          : "text-theme-secondary hover:bg-theme-tertiary/60"
                      }`}
                    >
                      {t.label}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(node, document.body)
}
