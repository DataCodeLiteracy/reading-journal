"use client"

import { useState } from "react"
import { X, BookOpen } from "lucide-react"
import { Book } from "@/types/book"

interface AddBookModalProps {
  isOpen: boolean
  onClose: () => void
  onAddBook: (book: Omit<Book, "id">) => void
}

export default function AddBookModal({
  isOpen,
  onClose,
  onAddBook,
}: AddBookModalProps) {
  const [title, setTitle] = useState("")
  const [author, setAuthor] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    const newBook: Omit<Book, "id"> = {
      title: title.trim(),
      author: author.trim() || undefined,
      cover: "/api/placeholder/150/200",
      rating: 0,
      status: "want-to-read",
      startDate: new Date().toISOString().split("T")[0],
      notes: [],
      readingSessions: [],
      hasStartedReading: false,
      isEdited: false,
    }

    onAddBook(newBook)
    setTitle("")
    setAuthor("")
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
      <div className='bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4'>
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-lg font-semibold text-gray-900 dark:text-white'>
            새 책 추가
          </h2>
          <button
            onClick={onClose}
            className='p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700'
          >
            <X className='h-5 w-5 text-gray-500' />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className='mb-4'>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              책 제목 *
            </label>
            <input
              type='text'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white'
              placeholder='책 제목을 입력하세요'
              required
            />
          </div>

          <div className='mb-6'>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              저자 (선택사항)
            </label>
            <input
              type='text'
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white'
              placeholder='저자를 입력하세요'
            />
          </div>

          <div className='flex gap-3'>
            <button
              type='button'
              onClick={onClose}
              className='flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'
            >
              취소
            </button>
            <button
              type='submit'
              disabled={!title.trim()}
              className='flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors'
            >
              추가하기
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
