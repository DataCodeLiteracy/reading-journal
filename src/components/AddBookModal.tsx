"use client"

import { useState, useRef, useEffect } from "react"
import { BookOpen, Search, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { Book, BOOK_LEVELS, BOOK_FIELDS, type BookLevel, type BookField } from "@/types/book"
import { BookService } from "@/services/bookService"
import FormModalFrame from "@/components/FormModalFrame"
import { FormNativePickerInput } from "@/components/FormNativePickerInput"
import Select, { type SelectOption } from "@/components/Select"

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

  const levelOptions: SelectOption<BookLevel | "">[] = [
    { value: "", label: "선택 안 함" },
    ...BOOK_LEVELS.map((l) => ({ value: l, label: l })),
  ]
  const categoryOptions: SelectOption<BookField | "">[] = [
    { value: "", label: "선택 안 함" },
    ...BOOK_FIELDS.map((f) => ({ value: f, label: f })),
  ]
  const statusOptions: SelectOption<Book["status"]>[] = [
    { value: "want-to-read", label: "읽고 싶은 책" },
    { value: "reading", label: "읽는 중" },
    { value: "on-hold", label: "보류" },
    { value: "completed", label: "완독" },
  ]

  return (
    <FormModalFrame
      isOpen={isOpen}
      onClose={handleClose}
      title="새 책 추가"
      headerStart={
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-theme-tertiary">
          <BookOpen className="h-5 w-5 accent-theme-primary" aria-hidden />
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="form-modal-fieldset space-y-3 sm:space-y-4">
          <div>
            <label className="mb-0.5 block text-sm font-medium text-theme-primary">
              책 제목 *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`form-control ${
                duplicateBooks.length > 0 ? "!border-blue-400" : ""
              }`}
              placeholder="책 제목을 입력하세요"
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

          <div>
            <label className="mb-0.5 block text-sm font-medium text-theme-primary">
              저자 (선택사항)
            </label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="form-control"
              placeholder="저자를 입력하세요"
            />
          </div>

          <div>
            <label className="mb-0.5 block text-sm font-medium text-theme-primary">
              출판일 (선택사항)
            </label>
            <FormNativePickerInput
              picker="date"
              value={publishedDate}
              onChange={(e) => setPublishedDate(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-0.5 block text-sm font-medium text-theme-primary">
              레벨 (대상 연령/학년, 선택사항)
            </label>
            <Select<BookLevel | "">
              value={level}
              onChange={setLevel}
              options={levelOptions}
              variant="form-modal"
            />
          </div>

          <div>
            <label className="mb-0.5 block text-sm font-medium text-theme-primary">
              분야 (선택사항)
            </label>
            <Select<BookField | "">
              value={category}
              onChange={setCategory}
              options={categoryOptions}
              variant="form-modal"
            />
          </div>

          <div>
            <label className="mb-0.5 block text-sm font-medium text-theme-primary">
              상태
            </label>
            <Select<Book["status"]>
              value={status}
              onChange={setStatus}
              options={statusOptions}
              variant="form-modal"
            />
          </div>

          <div className="mt-4 flex justify-end gap-2 sm:mt-6">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md bg-theme-secondary px-4 py-2 text-sm font-medium text-theme-primary transition-colors hover:bg-theme-tertiary"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="rounded-md bg-accent-theme px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-theme-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              추가하기
            </button>
          </div>
        </form>
    </FormModalFrame>
  )
}
