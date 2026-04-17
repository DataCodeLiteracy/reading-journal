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
}

/**
 * focus-level 스타일: 백드롭 클릭으로 닫기, rounded-xl 패널, modal-form-shell 너비.
 */
export default function FormModalFrame({
  isOpen,
  onClose,
  title,
  size = "default",
  children,
  headerStart,
}: FormModalFrameProps) {
  useBodyScrollLock(isOpen)
  if (!isOpen) return null

  const shellClass =
    size === "wide" ? "modal-form-shell-wide" : "modal-form-shell"

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4">
      <div
        className="absolute inset-0 bg-black/30"
        aria-hidden
        onClick={onClose}
      />
      <div
        className={`${shellClass} relative z-10 min-w-0 max-h-[90vh] overflow-y-auto rounded-xl border-card bg-theme-primary p-4 shadow-xl sm:p-6`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-modal-title"
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
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md p-1 text-theme-secondary transition-colors hover:bg-theme-tertiary hover:text-theme-primary"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
