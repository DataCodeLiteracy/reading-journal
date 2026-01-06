"use client"

import { useState, useRef, useEffect } from "react"
import { X, BookOpen, Lock, Globe } from "lucide-react"
import { Critique } from "@/types/content"

interface CritiqueModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (
    critique: Omit<
      Critique,
      "id" | "created_at" | "updated_at" | "likesCount" | "commentsCount"
    >
  ) => void
  bookId: string
  bookTitle?: string
  existingCritique?: Critique | null
}

export default function CritiqueModal({
  isOpen,
  onClose,
  onSave,
  bookId,
  bookTitle,
  existingCritique,
}: CritiqueModalProps) {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [isPublic, setIsPublic] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      if (existingCritique) {
        setTitle(existingCritique.title || "")
        setContent(existingCritique.content || "")
        setIsPublic(existingCritique.isPublic || false)
      } else {
        setTitle("")
        setContent("")
        setIsPublic(false)
      }
      // 모달이 열릴 때 제목 입력란에 포커스
      setTimeout(() => {
        titleInputRef.current?.focus()
      }, 100)
    }
  }, [isOpen, existingCritique])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) {
      alert("서평 내용을 입력해주세요.")
      return
    }

    const critiqueData: Omit<
      Critique,
      "id" | "created_at" | "updated_at" | "likesCount" | "commentsCount"
    > = {
      bookId,
      user_id: "", // 부모 컴포넌트에서 설정
      title: title.trim() || undefined,
      content: content.trim(),
      isPublic,
    }

    onSave(critiqueData)
  }

  const handleClose = () => {
    setTitle("")
    setContent("")
    setIsPublic(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white dark:bg-gray-800 rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col'>
        {/* 헤더 */}
        <div className='flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0'>
          <div className='flex-1 min-w-0'>
            <h2 className='text-lg sm:text-xl font-semibold text-gray-900 dark:text-white'>
              {existingCritique ? "서평 수정" : "서평 작성"}
            </h2>
            {bookTitle && (
              <p className='text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1'>
                {bookTitle}
              </p>
            )}
            <p className='text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1'>
              리뷰와는 별도로 더 깊이 있는 분석과 평가를 작성해보세요
            </p>
          </div>
          <button
            onClick={handleClose}
            className='text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0 ml-2'
          >
            <X className='h-5 w-5 sm:h-6 sm:w-6' />
          </button>
        </div>

        {/* 내용 - 스크롤 가능 */}
        <form onSubmit={handleSubmit} className='flex-1 overflow-y-auto p-4 sm:p-6 min-h-0'>
          <div className='space-y-4'>
            {/* 제목 (선택사항) */}
            <div>
              <label className='block text-sm font-medium text-gray-900 dark:text-white mb-2'>
                제목 (선택사항)
              </label>
              <input
                ref={titleInputRef}
                type='text'
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder='서평 제목을 입력하세요...'
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-theme focus:border-transparent'
              />
            </div>

            {/* 서평 내용 */}
            <div>
              <label className='block text-sm font-medium text-gray-900 dark:text-white mb-2'>
                서평 내용 <span className='text-red-500'>*</span>
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder='책에 대한 깊이 있는 분석과 평가를 작성해보세요...'
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-theme focus:border-transparent resize-none'
                rows={12}
                required
              />
              <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                책의 주제, 문체, 인물, 메시지 등에 대해 깊이 있게 분석해보세요.
              </p>
            </div>

            {/* 공개 설정 */}
            <div className='flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg'>
              <div className='flex items-center gap-2'>
                {isPublic ? (
                  <Globe className='h-5 w-5 text-blue-500' />
                ) : (
                  <Lock className='h-5 w-5 text-gray-400' />
                )}
                <div>
                  <label className='text-sm font-medium text-gray-900 dark:text-white cursor-pointer'>
                    공개하기
                  </label>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                    {isPublic
                      ? "다른 독서자들이 이 서평을 볼 수 있습니다"
                      : "나만 볼 수 있습니다"}
                  </p>
                </div>
              </div>
              <button
                type='button'
                onClick={() => setIsPublic(!isPublic)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isPublic ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isPublic ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </form>

        {/* 하단 버튼 */}
        <div className='p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-shrink-0'>
          <div className='flex gap-3'>
            <button
              type='button'
              onClick={handleClose}
              className='flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors'
            >
              취소
            </button>
            <button
              type='submit'
              onClick={handleSubmit}
              className='flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors'
            >
              {existingCritique ? "수정하기" : "저장하기"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

