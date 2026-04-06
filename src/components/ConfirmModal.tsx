"use client"

import { LucideIcon, X } from "lucide-react"

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText: string
  cancelText?: string
  icon: LucideIcon
  iconColor?: string
  iconBgColor?: string
  confirmButtonColor?: string
  confirmButtonHoverColor?: string
  /** false면 "이 작업은 되돌릴 수 없습니다." 문구 숨김 */
  showSubtitle?: boolean
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText = "취소",
  icon: Icon,
  iconColor = "text-red-500",
  iconBgColor = "bg-red-100 dark:bg-red-900/20",
  confirmButtonColor = "bg-red-500",
  confirmButtonHoverColor = "hover:bg-red-600",
  showSubtitle = true,
}: ConfirmModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
      <div
        className="absolute inset-0 bg-black/30"
        aria-hidden
        onClick={onClose}
      />
      <div className="modal-form-shell relative z-10 min-w-0 rounded-xl border-card bg-theme-primary p-6 pt-5 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1 text-theme-secondary transition-colors hover:bg-theme-tertiary hover:text-theme-primary"
          aria-label="닫기"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="pr-8">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconBgColor}`}
            >
              <Icon className={`h-6 w-6 ${iconColor}`} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold leading-snug text-theme-primary">
                {title}
              </h3>
              {showSubtitle && (
                <p className="mt-0.5 text-sm text-theme-secondary">
                  이 작업은 되돌릴 수 없습니다.
                </p>
              )}
            </div>
          </div>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-theme-secondary">
            {message}
          </p>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-theme-secondary px-4 py-2 text-sm font-medium text-theme-primary transition-colors hover:bg-theme-tertiary"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onClose()
              onConfirm()
            }}
            className={`rounded-md px-4 py-2 text-sm font-medium text-white transition-colors ${confirmButtonColor} ${confirmButtonHoverColor}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
