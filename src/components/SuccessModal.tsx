"use client"

import { X, CheckCircle } from "lucide-react"

interface SuccessModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
  icon?: React.ReactNode
}

export default function SuccessModal({
  isOpen,
  onClose,
  title,
  message,
  icon,
}: SuccessModalProps) {
  if (!isOpen) return null

  return (
    <div className='fixed inset-0 bg-theme-backdrop flex items-center justify-center z-50'>
      <div className='bg-theme-secondary rounded-lg p-6 w-full max-w-md mx-4 shadow-lg'>
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-lg font-semibold text-theme-primary'>{title}</h2>
          <button
            onClick={onClose}
            className='p-1 rounded-full hover:bg-theme-tertiary transition-colors'
          >
            <X className='h-5 w-5 text-theme-secondary' />
          </button>
        </div>

        <div className='mb-6'>
          <div className='flex items-center gap-3 mb-3'>
            {icon || <CheckCircle className='h-6 w-6 text-green-500' />}
            <p className='text-theme-primary'>{message}</p>
          </div>
        </div>

        <div className='flex justify-end'>
          <button
            onClick={onClose}
            className='px-4 py-2 bg-accent-theme text-white rounded-md hover:bg-accent-theme-secondary transition-colors'
          >
            확인
          </button>
        </div>
      </div>
    </div>
  )
}

