"use client"

import { Upload, X } from "lucide-react"

interface JsonPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  jsonData: string
  isUploading: boolean
  title?: string
  description?: string
}

export default function JsonPreviewModal({
  isOpen,
  onClose,
  onConfirm,
  jsonData,
  isUploading,
  title = "JSON 데이터 미리보기",
  description = "다음 데이터를 업로드하시겠습니까?",
}: JsonPreviewModalProps) {
  if (!isOpen) return null

  return (
    <div className='fixed inset-0 bg-theme-backdrop flex items-center justify-center z-50'>
      <div className='bg-theme-secondary rounded-lg p-6 w-full max-w-2xl mx-4 shadow-lg max-h-[90vh] overflow-y-auto'>
        <div className='flex items-center justify-between mb-4'>
          <div className='flex items-center gap-3'>
            <div className='p-2 bg-blue-100 dark:bg-blue-900/20 rounded-full'>
              <Upload className='h-6 w-6 text-blue-600 dark:text-blue-400' />
            </div>
            <h3 className='text-lg font-semibold text-theme-primary'>
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors'
          >
            <X className='h-5 w-5 text-gray-500' />
          </button>
        </div>

        <div className='space-y-4'>
          <p className='text-sm text-gray-600 dark:text-gray-400'>
            {description}
          </p>

          <div className='bg-gray-100 dark:bg-gray-800 p-4 rounded-lg'>
            <pre className='text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words'>
              {jsonData}
            </pre>
          </div>

          <div className='flex gap-3 pt-4'>
            <button
              onClick={onClose}
              className='flex-1 px-4 py-2 border border-theme-tertiary text-theme-primary rounded-md hover:bg-theme-tertiary transition-colors'
            >
              취소
            </button>
            <button
              onClick={onConfirm}
              disabled={isUploading}
              className='flex-1 px-4 py-2 bg-theme-primary text-white rounded-md hover:bg-theme-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
            >
              {isUploading ? "업로드 중..." : "업로드"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
