"use client"

import { LucideIcon } from "lucide-react"

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
}: ConfirmModalProps) {
  if (!isOpen) return null

  return (
    <div className='fixed inset-0 bg-theme-backdrop flex items-center justify-center z-50'>
      <div className='bg-theme-secondary rounded-lg p-6 w-full max-w-md mx-4 shadow-lg'>
        <div className='flex items-center gap-3 mb-4'>
          <div className={`p-2 ${iconBgColor} rounded-full`}>
            <Icon className={`h-6 w-6 ${iconColor}`} />
          </div>
          <div>
            <h3 className='text-lg font-semibold text-theme-primary'>
              {title}
            </h3>
            <p className='text-sm text-theme-secondary'>
              이 작업은 되돌릴 수 없습니다.
            </p>
          </div>
        </div>

        <p className='text-theme-primary mb-6'>{message}</p>

        <div className='flex gap-3'>
          <button
            onClick={onClose}
            className='flex-1 px-4 py-2 border border-theme-tertiary text-theme-primary rounded-md hover:bg-theme-tertiary transition-colors'
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onClose()
              onConfirm()
            }}
            className={`flex-1 px-4 py-2 ${confirmButtonColor} text-white rounded-md ${confirmButtonHoverColor} transition-colors`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
