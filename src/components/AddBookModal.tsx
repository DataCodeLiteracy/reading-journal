"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { BookOpen, AlertCircle } from "lucide-react"
import { Book, BOOK_LEVELS, BOOK_FIELDS, type BookLevel, type BookField } from "@/types/book"
import FormModalFrame from "@/components/FormModalFrame"
import { FormNativePickerInput } from "@/components/FormNativePickerInput"
import Select, { type SelectOption } from "@/components/Select"
import OwnBookDuplicateModal from "@/components/OwnBookDuplicateModal"
import { normalizeBookTitleKey } from "@/utils/bookTitleKey"

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
  /**
   * 현재 로그인 유저 서재에 이미 있는 책 제목 키 목록
   * (`normalizeBookTitleKey` 적용값). 중복 등록 방지용.
   */
  userBookTitleKeys: readonly string[]
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
  userBookTitleKeys,
}: AddBookModalProps) {
  const [title, setTitle] = useState(initialTitle)
  const [author, setAuthor] = useState(initialAuthor)
  const [publishedDate, setPublishedDate] = useState(initialPublishedDate)
  const [status, setStatus] = useState<Book["status"]>("want-to-read")
  const [rating, setRating] = useState(0)
  const [level, setLevel] = useState<BookLevel | "">(initialLevel || "")
  const [category, setCategory] = useState<BookField | "">(initialCategory || "")
  const titleInputRef = useRef<HTMLInputElement>(null)
  const [ownDuplicateModalOpen, setOwnDuplicateModalOpen] = useState(false)

  const titleKeySet = useMemo(
    () => new Set(userBookTitleKeys),
    [userBookTitleKeys],
  )

  const hasOwnDuplicateTitle = useMemo(() => {
    const t = title.trim()
    if (!t) return false
    return titleKeySet.has(normalizeBookTitleKey(t))
  }, [title, titleKeySet])

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
      setOwnDuplicateModalOpen(false)
    }
  }, [isOpen, initialTitle, initialAuthor, initialPublishedDate, initialLevel, initialCategory])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    if (hasOwnDuplicateTitle) {
      setOwnDuplicateModalOpen(true)
      return
    }

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
    setOwnDuplicateModalOpen(false)
    onClose()
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
    <>
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
                hasOwnDuplicateTitle ? "!border-amber-500 ring-1 ring-amber-500/30" : ""
              }`}
              placeholder="책 제목을 입력하세요"
              required
              ref={titleInputRef}
            />
            {hasOwnDuplicateTitle && (
              <p className="mt-1.5 flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>
                  내 서재에 이미 같은 제목으로 등록된 책이 있습니다. 제목을 바꾸거나
                  추가하기를 누르면 안내를 확인할 수 있어요.
                </span>
              </p>
            )}
          </div>

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

      <OwnBookDuplicateModal
        isOpen={ownDuplicateModalOpen}
        onClose={() => setOwnDuplicateModalOpen(false)}
        title={title.trim()}
      />
    </>
  )
}
