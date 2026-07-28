"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { BookOpen, Sparkles, Timer, Users, X } from "lucide-react"
import { useReadingTimerSheet } from "@/contexts/ReadingTimerSheetContext"
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock"

const CLOSE_DRAG_PX = 96

export type ReadingStartModalVariant =
  | "pre_read_only"
  | "mode_only"
  | "pre_read_and_mode"

type Props = {
  open: boolean
  variant: ReadingStartModalVariant
  hasTocOutline: boolean
  onClose: () => void
  onWriteNow: () => void
  onStartSelf: () => void
  onStartReadAloud: () => void
  onDismissToday: () => void
}

/**
 * 읽기 시작 통합 모달.
 * - pre_read_only: 읽기 준비 메모 안내
 * - mode_only: 혼자 읽기 / 읽어주기
 * - pre_read_and_mode: 작성 + 혼자 + 읽어주기
 */
export default function ReadingStartModal({
  open,
  variant,
  hasTocOutline,
  onClose,
  onWriteNow,
  onStartSelf,
  onStartReadAloud,
  onDismissToday,
}: Props) {
  const [mounted, setMounted] = useState(false)
  const { setSheetOpen } = useReadingTimerSheet()
  const sheetRef = useRef<HTMLDivElement>(null)
  const dragY = useRef(0)
  const dragStartY = useRef(0)
  const dragging = useRef(false)

  const showPreRead = variant === "pre_read_only" || variant === "pre_read_and_mode"
  const showMode = variant === "mode_only" || variant === "pre_read_and_mode"
  const title = showPreRead && !showMode ? "읽기 준비 메모" : "읽기 시작"

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    setSheetOpen(open)
    return () => setSheetOpen(false)
  }, [open, setSheetOpen])

  useBodyScrollLock(open && mounted)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

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
    dragY.current = Math.max(0, e.clientY - dragStartY.current)
    applySheetTransform(dragY.current)
  }

  const onHandlePointerUp = () => {
    if (!dragging.current) return
    endDrag()
  }

  if (!mounted || !open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center overflow-hidden overscroll-none sm:items-center sm:p-4"
      role="presentation"
    >
      <div
        className="absolute inset-0 bg-theme-backdrop"
        aria-hidden
        onClick={onClose}
      />
      <div
        ref={sheetRef}
        className="modal-form-shell modal-dialog-surface relative z-10 mt-auto flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border-b-0 sm:mt-0 sm:max-h-[min(90dvh,32rem)] sm:rounded-xl sm:border-b"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reading-start-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex h-9 shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing sm:hidden"
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerUp}
        >
          <div className="h-1 w-11 rounded-full bg-theme-tertiary" />
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-1 sm:px-6 sm:pb-5 sm:pt-2">
          <div className="flex shrink-0 items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2 text-accent-theme">
              {showPreRead && !showMode ? (
                <Sparkles className="h-6 w-6 shrink-0" aria-hidden />
              ) : (
                <BookOpen className="h-6 w-6 shrink-0" aria-hidden />
              )}
              <h2
                id="reading-start-title"
                className="text-base font-semibold text-theme-primary sm:text-lg"
              >
                {title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-md p-1.5 text-theme-secondary transition-colors hover:bg-theme-tertiary hover:text-theme-primary"
              aria-label="닫기"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {showPreRead ? (
              <p className="text-sm leading-relaxed text-theme-secondary">
                {hasTocOutline
                  ? "제목과 등록된 목차를 보며 떠올린 점,"
                  : "제목을 보며 떠올린 점,"}{" "}
                이 책에서 가볍게 얻고 싶은 것, 지금 관심사와의 연결을 적어 두면 나중에 독서
                흐름을 잡는 데 도움이 됩니다. 비워 두어도 괜찮습니다.
              </p>
            ) : (
              <p className="text-sm leading-relaxed text-theme-secondary">
                혼자 읽거나, 연결된 자녀에게 읽어줄 수 있습니다.
              </p>
            )}

            <div className="mt-5 flex flex-col gap-2">
              {showPreRead ? (
                <button
                  type="button"
                  onClick={onWriteNow}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-theme px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-theme-secondary"
                >
                  <Sparkles className="h-4 w-4" aria-hidden />
                  지금 작성하기
                </button>
              ) : null}

              <button
                type="button"
                onClick={onStartSelf}
                className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                  showPreRead
                    ? "border border-theme-tertiary bg-theme-primary text-theme-primary hover:bg-theme-tertiary/30"
                    : "bg-accent-theme text-white hover:bg-accent-theme-secondary"
                }`}
              >
                <Timer className="h-4 w-4" aria-hidden />
                {showMode ? "혼자 읽기" : "타이머만 시작"}
              </button>

              {showMode ? (
                <button
                  type="button"
                  onClick={onStartReadAloud}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
                >
                  <Users className="h-4 w-4" aria-hidden />
                  읽어주기
                </button>
              ) : null}

              <button
                type="button"
                onClick={onDismissToday}
                className="text-center text-xs text-theme-tertiary underline-offset-2 hover:text-theme-secondary hover:underline"
              >
                오늘은 그만보기 (오늘은 이 알림을 띄우지 않음)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
