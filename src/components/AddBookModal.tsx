"use client"

import { useState, useRef, useEffect } from "react"
import { X, BookOpen } from "lucide-react"
import { Book } from "@/types/book"

interface AddBookModalProps {
  isOpen: boolean
  onClose: () => void
  onAddBook: (book: Omit<Book, "id" | "user_id">) => void
}

export default function AddBookModal({
  isOpen,
  onClose,
  onAddBook,
}: AddBookModalProps) {
  const [title, setTitle] = useState("")
  const [author, setAuthor] = useState("")
  const [publishedDate, setPublishedDate] = useState("")
  const [status, setStatus] = useState<Book["status"]>("want-to-read")
  const [rating, setRating] = useState(0)
  const titleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen && titleInputRef.current) {
      titleInputRef.current.focus()
    }
  }, [isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    const newBook: Omit<Book, "id" | "user_id"> = {
      title: title.trim(),
      author: author.trim() || "",
      publishedDate: publishedDate || "",
      status,
      rating,
      hasStartedReading: false,
    }

    onAddBook(newBook)
    setTitle("")
    setAuthor("")
    setPublishedDate("")
    setStatus("want-to-read")
    setRating(0)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 bg-theme-backdrop flex items-center justify-center z-50'>
      <div className='bg-theme-secondary rounded-lg p-6 w-full max-w-md mx-4 shadow-lg'>
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-lg font-semibold text-theme-primary'>
            새 책 추가
          </h2>
          <button
            onClick={onClose}
            className='p-1 rounded-full hover:bg-theme-tertiary transition-colors'
          >
            <X className='h-5 w-5 text-theme-secondary' />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className='mb-4'>
            <label className='block text-sm font-medium text-theme-primary mb-2'>
              책 제목 *
            </label>
            <input
              type='text'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className='w-full px-3 py-2 border border-theme-tertiary rounded-md focus:outline-none focus:ring-2 focus:ring-accent-theme bg-theme-primary text-theme-primary placeholder:text-theme-tertiary'
              placeholder='책 제목을 입력하세요'
              required
              ref={titleInputRef}
            />
          </div>

          <div className='mb-6'>
            <label className='block text-sm font-medium text-theme-primary mb-2'>
              저자 (선택사항)
            </label>
            <input
              type='text'
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className='w-full px-3 py-2 border border-theme-tertiary rounded-md focus:outline-none focus:ring-2 focus:ring-accent-theme bg-theme-primary text-theme-primary placeholder:text-theme-tertiary'
              placeholder='저자를 입력하세요'
            />
          </div>

          <div className='mb-6'>
            <label className='block text-sm font-medium text-theme-primary mb-2'>
              출판일 (선택사항)
            </label>
            <input
              type='date'
              value={publishedDate}
              onChange={(e) => setPublishedDate(e.target.value)}
              className='w-full px-3 py-2 border border-theme-tertiary rounded-md focus:outline-none focus:ring-2 focus:ring-accent-theme bg-theme-primary text-theme-primary cursor-pointer'
              style={{
                WebkitAppearance: "none",
                MozAppearance: "none",
              }}
            />
          </div>

          <div className='mb-6'>
            <label className='block text-sm font-medium text-theme-primary mb-2'>
              상태
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Book["status"])}
              className='w-full px-3 py-2 border border-theme-tertiary rounded-md focus:outline-none focus:ring-2 focus:ring-accent-theme bg-theme-primary text-theme-primary'
            >
              <option value='want-to-read'>읽고 싶은 책</option>
              <option value='reading'>읽는 중</option>
              <option value='on-hold'>보류</option>
              <option value='completed'>완독</option>
            </select>
          </div>

          <div className='flex gap-3'>
            <button
              type='button'
              onClick={onClose}
              className='flex-1 px-4 py-2 border border-theme-tertiary text-theme-primary rounded-md hover:bg-theme-tertiary transition-colors'
            >
              취소
            </button>
            <button
              type='submit'
              disabled={!title.trim()}
              className='flex-1 px-4 py-2 bg-accent-theme text-white rounded-md hover:bg-accent-theme-secondary disabled:bg-theme-tertiary disabled:cursor-not-allowed transition-colors'
            >
              추가하기
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
