"use client"

import { useState, useEffect } from "react"
import { BookOpen } from "lucide-react"
import { Book, BOOK_LEVELS, BOOK_FIELDS, type BookLevel, type BookField } from "@/types/book"
import FormModalFrame from "@/components/FormModalFrame"
import { FormNativePickerInput } from "@/components/FormNativePickerInput"
import Select, { type SelectOption } from "@/components/Select"

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
  const [level, setLevel] = useState<BookLevel | "">(
    (book.level as BookLevel) || ""
  )
  const [category, setCategory] = useState<BookField | "">(
    (book.category as BookField) || ""
  )

  useEffect(() => {
    if (isOpen) {
      setTitle(book.title)
      setAuthor(book.author || "")
      setRating(book.rating)
      setPublishedDate(book.publishedDate || "")
      setLevel((book.level as BookLevel) || "")
      setCategory((book.category as BookField) || "")
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
      ...(level ? { level } : { level: undefined }),
      ...(category ? { category } : { category: undefined }),
    }

    onSave(updatedBook)
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

  return (
    <FormModalFrame
      isOpen={isOpen}
      onClose={onClose}
      title="책 정보 편집"
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
              className="form-control"
              placeholder="책 제목을 입력하세요"
              required
            />
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
              평점
            </label>
            <div className="flex gap-1 pt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1"
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
            <p className="mt-1 text-xs text-theme-tertiary">{rating}점</p>
          </div>

          <div className="mt-4 flex justify-end gap-2 sm:mt-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-theme-secondary px-4 py-2 text-sm font-medium text-theme-primary transition-colors hover:bg-theme-tertiary"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="rounded-md bg-accent-theme px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-theme-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              저장하기
            </button>
          </div>
        </form>
    </FormModalFrame>
  )
}
