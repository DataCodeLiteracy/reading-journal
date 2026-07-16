"use client"

import { X } from "lucide-react"
import type { ReactNode } from "react"
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock"

type FormModalFrameProps = {
  isOpen: boolean
  onClose: () => void
  title: string
  /** 기본 500px, 넓은 폼(질문 등)은 wide */
  size?: "default" | "wide"
  children: ReactNode
  /** 헤더 왼쪽 (아이콘 배지 등) */
  headerStart?: ReactNode
  /** 닫기 버튼 앞에 배치할 헤더 액션 */
  headerEnd?: ReactNode
  /** true면 닫기·배경 클릭 차단 + lockOverlay 표시 */
  interactionLocked?: boolean
  lockOverlay?: ReactNode
}

/**
 * focus-level 스타일: 스크림(bg-theme-backdrop) 클릭으로 닫기, modal-dialog-surface 패널, modal-form-shell 너비.
 */
export default function FormModalFrame({
  isOpen,
  onClose,
  title,
  size = "default",
  children,
  headerStart,
  headerEnd,
  interactionLocked = false,
  lockOverlay,
}: FormModalFrameProps) {
  useBodyScrollLock(isOpen)
  if (!isOpen) return null

  const shellClass =
    size === "wide" ? "modal-form-shell-wide" : "modal-form-shell"

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4">
      <div
        className="absolute inset-0 bg-theme-backdrop"
        aria-hidden
        onClick={interactionLocked ? undefined : onClose}
      />
      <div
        className={`${shellClass} modal-dialog-surface relative z-10 min-w-0 max-h-[calc(82dvh-50px)] overflow-y-auto rounded-xl p-4 sm:max-h-[calc(90vh-50px)] sm:p-6 ${
          interactionLocked ? "overflow-hidden" : ""
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-modal-title"
        aria-busy={interactionLocked || undefined}
      >
        <div className="mb-3 flex items-center justify-between gap-2 sm:mb-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {headerStart}
            <h2
              id="form-modal-title"
              className="min-w-0 text-lg font-semibold leading-snug text-theme-primary"
            >
              {title}
            </h2>
          </div>
          {headerEnd}
          <button
            type="button"
            onClick={onClose}
            disabled={interactionLocked}
            className="shrink-0 rounded-md p-1 text-theme-secondary transition-colors hover:bg-theme-tertiary hover:text-theme-primary disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
        {interactionLocked && lockOverlay}
      </div>
    </div>
  )
}
