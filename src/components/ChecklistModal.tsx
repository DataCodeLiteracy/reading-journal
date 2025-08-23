"use client"

import { useState } from "react"
import { X, CheckCircle, Circle, AlertCircle } from "lucide-react"
import { ChecklistItem } from "@/types/user"

interface ChecklistModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
  checklist: ChecklistItem[]
  title: string
  description: string
  isLongTerm?: boolean
}

export default function ChecklistModal({
  isOpen,
  onClose,
  onComplete,
  checklist,
  title,
  description,
  isLongTerm = false,
}: ChecklistModalProps) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())

  const handleItemToggle = (itemId: string) => {
    const newCheckedItems = new Set(checkedItems)
    if (newCheckedItems.has(itemId)) {
      newCheckedItems.delete(itemId)
    } else {
      newCheckedItems.add(itemId)
    }
    setCheckedItems(newCheckedItems)
  }

  const handleComplete = () => {
    onComplete()
    setCheckedItems(new Set())
    onClose()
  }

  const allChecked = checkedItems.size === checklist.length

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden'>
        {/* 헤더 */}
        <div className='flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700'>
          <div>
            <h2 className='text-xl font-semibold text-gray-900 dark:text-white'>
              {title}
            </h2>
            <p className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
              {description}
            </p>
          </div>
          <button
            onClick={onClose}
            className='text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors'
          >
            <X className='h-6 w-6' />
          </button>
        </div>

        {/* 체크리스트 내용 */}
        <div className='p-6 overflow-y-auto max-h-[60vh]'>
          <div className='space-y-4'>
            {checklist.map((item, index) => (
              <div
                key={item.id}
                className={`flex items-start gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors ${
                  isLongTerm
                    ? "bg-gray-50 dark:bg-gray-800"
                    : "hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                }`}
                onClick={
                  isLongTerm ? undefined : () => handleItemToggle(item.id)
                }
              >
                {!isLongTerm && (
                  <button
                    className='flex-shrink-0 mt-0.5'
                    onClick={(e) => {
                      e.stopPropagation()
                      handleItemToggle(item.id)
                    }}
                  >
                    {checkedItems.has(item.id) ? (
                      <CheckCircle className='h-6 w-6 text-green-500' />
                    ) : (
                      <Circle className='h-6 w-6 text-gray-400' />
                    )}
                  </button>
                )}
                <div className='flex-1'>
                  <div className='flex items-center gap-2 mb-2'>
                    <span className='text-sm font-medium text-gray-500 dark:text-gray-400'>
                      {index + 1}.
                    </span>
                    <h3 className='font-medium text-gray-900 dark:text-white'>
                      {item.title}
                    </h3>
                  </div>
                  <p className='text-sm text-gray-600 dark:text-gray-400 leading-relaxed'>
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className='p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'>
          {isLongTerm ? (
            /* 장기 체크리스트: 단순 확인용 */
            <div className='flex justify-end'>
              <button
                onClick={onClose}
                className='px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors'
              >
                확인
              </button>
            </div>
          ) : (
            /* 사전 독서 체크리스트: 체크 확인 필요 */
            <div className='space-y-4'>
              {/* 항목 확인 상태와 나중에 버튼 */}
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400'>
                  <AlertCircle className='h-4 w-4' />
                  <span>
                    {checkedItems.size} / {checklist.length} 항목 확인됨
                  </span>
                </div>
                <button
                  onClick={onClose}
                  className='px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors'
                >
                  나중에
                </button>
              </div>

              {/* 확인 완료 버튼 */}
              <button
                onClick={handleComplete}
                disabled={!allChecked}
                className='w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2'
              >
                <CheckCircle className='h-4 w-4' />
                확인 완료
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
