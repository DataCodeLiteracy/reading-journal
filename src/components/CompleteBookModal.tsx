"use client"

import { X, CheckCircle } from "lucide-react"

interface CompleteBookModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  bookTitle: string
}

export default function CompleteBookModal({
  isOpen,
  onClose,
  onConfirm,
  bookTitle,
}: CompleteBookModalProps) {
  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 bg-theme-backdrop flex items-center justify-center z-50'>
      <div className='bg-theme-secondary rounded-lg p-6 w-full max-w-md mx-4 shadow-lg'>
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-lg font-semibold text-theme-primary'>
            완독 처리
          </h2>
          <button
            onClick={onClose}
            className='p-1 rounded-full hover:bg-theme-tertiary transition-colors'
          >
            <X className='h-5 w-5 text-theme-secondary' />
          </button>
        </div>

        <div className='mb-6'>
          <div className='flex items-center gap-2 mb-3'>
            <CheckCircle className='h-6 w-6 text-green-500' />
            <span className='text-theme-primary font-medium'>
              완독 처리하시겠습니까?
            </span>
          </div>
          <p className='text-theme-secondary'>
            <span className='font-medium'>{bookTitle}</span>을(를) 완독한 책으로
            표시합니다.
          </p>
          <p className='text-sm text-theme-tertiary mt-2'>
            완독 처리 후에는 타이머가 비활성화되고 계속 읽기 기능이
            활성화됩니다. 기존 독서 기록은 보존됩니다.
          </p>
        </div>

        <div className='flex gap-3'>
          <button
            onClick={onClose}
            className='flex-1 px-4 py-2 border border-theme-tertiary text-theme-primary rounded-md hover:bg-theme-tertiary transition-colors'
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            className='flex-1 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors'
          >
            완독 처리
          </button>
        </div>
      </div>
    </div>
  )
}
