"use client"

import { useState, useRef, useEffect } from "react"
import { X, BookOpen, Search, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { Book, BOOK_LEVELS, BOOK_FIELDS, type BookLevel, type BookField } from "@/types/book"
import { BookService } from "@/services/bookService"

interface AddBookModalProps {
  isOpen: boolean
  onClose: () => void
  onAddBook: (book: Omit<Book, "id" | "user_id">) => void
  /** 탐색 등에서 다른 유저 책을 내 책으로 추가할 때 제목/저자 미리 채우기 */
  initialTitle?: string
  initialAuthor?: string
  initialPublishedDate?: string
  initialLevel?: BookLevel
  initialCategory?: BookField
  /** 현재 사용자 ID (중복 체크 시 본인 책 제외용) */
  currentUserId?: string
  /** 탐색에서 추가하는 경우 중복 체크 건너뛰기 */
  skipDuplicateCheck?: boolean
}

export default function AddBookModal({
  isOpen,
  onClose,
  onAddBook,
  initialTitle = "",
  initialAuthor = "",
  initialPublishedDate = "",
  initialLevel,
  initialCategory,
  currentUserId,
  skipDuplicateCheck = false,
}: AddBookModalProps) {
  const router = useRouter()
  const [title, setTitle] = useState(initialTitle)
  const [author, setAuthor] = useState(initialAuthor)
  const [publishedDate, setPublishedDate] = useState(initialPublishedDate)
  const [status, setStatus] = useState<Book["status"]>("want-to-read")
  const [rating, setRating] = useState(0)
  const [level, setLevel] = useState<BookLevel | "">(initialLevel || "")
  const [category, setCategory] = useState<BookField | "">(initialCategory || "")
  const titleInputRef = useRef<HTMLInputElement>(null)

  // 중복 체크 관련 상태
  const [duplicateBooks, setDuplicateBooks] = useState<Book[]>([])
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false)
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isOpen && titleInputRef.current) {
      titleInputRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle)
      setAuthor(initialAuthor)
      setPublishedDate(initialPublishedDate)
      setLevel(initialLevel || "")
      setCategory(initialCategory || "")
      setDuplicateBooks([])
    }
  }, [isOpen, initialTitle, initialAuthor, initialPublishedDate, initialLevel, initialCategory])

  // 제목 변경 시 중복 체크 (디바운스)
  useEffect(() => {
    if (skipDuplicateCheck || !title.trim()) {
      setDuplicateBooks([])
      return
    }

    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current)
    }

    checkTimeoutRef.current = setTimeout(async () => {
      setIsCheckingDuplicate(true)
      try {
        const books = await BookService.findBooksByTitle(title.trim(), currentUserId)
        setDuplicateBooks(books)
      } catch (error) {
        console.error("Duplicate check error:", error)
        setDuplicateBooks([])
      } finally {
        setIsCheckingDuplicate(false)
      }
    }, 500)

    return () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current)
      }
    }
  }, [title, currentUserId, skipDuplicateCheck])

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
      ...(level ? { level } : {}),
      ...(category ? { category } : {}),
    }

    onAddBook(newBook)
    setTitle("")
    setAuthor("")
    setPublishedDate("")
    setStatus("want-to-read")
    setRating(0)
    setLevel("")
    setCategory("")
    onClose()
  }

  const handleClose = () => {
    setTitle("")
    setAuthor("")
    setPublishedDate("")
    setStatus("want-to-read")
    setRating(0)
    setLevel("")
    setCategory("")
    setDuplicateBooks([])
    onClose()
  }

  const handleGoToExplore = () => {
    handleClose()
    router.push(`/explore?search=${encodeURIComponent(title.trim())}`)
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
            onClick={handleClose}
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
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-accent-theme bg-theme-primary text-theme-primary placeholder:text-theme-tertiary ${
                duplicateBooks.length > 0 ? "border-blue-400" : "border-theme-tertiary"
              }`}
              placeholder='책 제목을 입력하세요'
              required
              ref={titleInputRef}
            />
            {isCheckingDuplicate && (
              <p className='mt-1 text-xs text-theme-tertiary'>확인 중...</p>
            )}
          </div>

          {/* 중복 책 안내 */}
          {duplicateBooks.length > 0 && !isCheckingDuplicate && (
            <div className='mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg'>
              <div className='flex items-start gap-2 mb-2'>
                <AlertCircle className='h-4 w-4 text-blue-500 mt-0.5 shrink-0' />
                <div className='flex-1'>
                  <p className='text-blue-700 dark:text-blue-300 text-sm font-medium'>
                    이미 등록된 책이 있어요!
                  </p>
                  <p className='text-blue-600 dark:text-blue-400 text-xs mt-1'>
                    다른 사용자가 "{title.trim()}" 책을 {duplicateBooks.length}권 등록했습니다.
                    <br />
                    탐색에서 찾아 추가하면 골든벨 문제도 함께 볼 수 있어요.
                  </p>
                </div>
              </div>
              <button
                type='button'
                onClick={handleGoToExplore}
                className='w-full flex items-center justify-center gap-2 py-2 px-3 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-md transition-colors'
              >
                <Search className='h-4 w-4' />
                탐색에서 찾아보기
              </button>
            </div>
          )}

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
              레벨 (대상 연령/학년, 선택사항)
            </label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as BookLevel | "")}
              className='w-full px-3 py-2 border border-theme-tertiary rounded-md focus:outline-none focus:ring-2 focus:ring-accent-theme bg-theme-primary text-theme-primary'
            >
              <option value=''>선택 안 함</option>
              {BOOK_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          <div className='mb-6'>
            <label className='block text-sm font-medium text-theme-primary mb-2'>
              분야 (선택사항)
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as BookField | "")}
              className='w-full px-3 py-2 border border-theme-tertiary rounded-md focus:outline-none focus:ring-2 focus:ring-accent-theme bg-theme-primary text-theme-primary'
            >
              <option value=''>선택 안 함</option>
              {BOOK_FIELDS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
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
              onClick={handleClose}
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
