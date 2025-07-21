"use client"

import { useState, useEffect } from "react"
import { X, BookOpen } from "lucide-react"
import { Book } from "@/types/book"

interface EditBookModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (updatedBook: Book) => void
  book: Book
}

export default function EditBookModal({
  isOpen,
  onClose,
  onSave,
  book,
}: EditBookModalProps) {
  const [title, setTitle] = useState(book.title)
  const [author, setAuthor] = useState(book.author || "")
  const [rating, setRating] = useState(book.rating)
  const [publishedDate, setPublishedDate] = useState(book.publishedDate || "")

  useEffect(() => {
    if (isOpen) {
      setTitle(book.title)
      setAuthor(book.author || "")
      setRating(book.rating)
      setPublishedDate(book.publishedDate || "")
    }
  }, [isOpen, book])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    const updatedBook: Book = {
      ...book,
      title: title.trim(),
      author: author.trim() || "",
      rating,
      publishedDate: publishedDate.trim() || "",
    }

    onSave(updatedBook)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 bg-theme-backdrop flex items-center justify-center z-50'>
      <div className='bg-theme-secondary rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto shadow-lg'>
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-lg font-semibold text-theme-primary'>
            책 정보 편집
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
            />
          </div>

          <div className='mb-4'>
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

          <div className='mb-4'>
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
                colorScheme: "dark",
              }}
            />
          </div>

          <div className='mb-6'>
            <label className='block text-sm font-medium text-theme-primary mb-2'>
              평점
            </label>
            <div className='flex gap-1'>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type='button'
                  onClick={() => setRating(star)}
                  className='p-1'
                >
                  <BookOpen
                    className={`h-6 w-6 ${
                      star <= rating
                        ? "text-yellow-400 fill-current"
                        : "text-theme-tertiary"
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className='text-xs text-theme-tertiary mt-1'>{rating}점</p>
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
              저장하기
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
