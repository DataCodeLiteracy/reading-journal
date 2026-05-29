"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { BookOpen, Star } from "lucide-react"
import AladinBookLookup from "@/components/AladinBookLookup"
import BookCoverUpload from "@/components/BookCoverUpload"
import { coverPreviewCaption } from "@/utils/coverUrlSource"
import { applyAladinBookMetadata } from "@/utils/applyAladinBookMetadata"
import { enrichAladinBookMetadata } from "@/utils/enrichAladinBookMetadata"
import { Book, BOOK_LEVELS, type BookLevel } from "@/types/book"
import FormModalFrame from "@/components/FormModalFrame"
import { FormNativePickerInput } from "@/components/FormNativePickerInput"
import Select, { type SelectOption } from "@/components/Select"
import BookCategoryPicker from "@/components/BookCategoryPicker"
import { useBookCategories } from "@/hooks/useBookCategories"
import { BookCategoryService } from "@/services/bookCategoryService"
import { buildBookCategoryFields } from "@/utils/bookCategoryFields"

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
  const { data: categoryTree } = useBookCategories()
  const [title, setTitle] = useState(book.title)
  const [author, setAuthor] = useState(book.author || "")
  const [publisher, setPublisher] = useState(book.publisher || "")
  const [rating, setRating] = useState(book.rating)
  const [publishedDate, setPublishedDate] = useState(book.publishedDate || "")
  const [notes, setNotes] = useState(book.notes || "")
  const [toReadThisYear, setToReadThisYear] = useState(!!book.toReadThisYear)
  const [level, setLevel] = useState<BookLevel | "">(
    (book.level as BookLevel) || ""
  )
  const [categoryDepth1Id, setCategoryDepth1Id] = useState(
    book.categoryDepth1Id || ""
  )
  const [categoryDepth2Id, setCategoryDepth2Id] = useState(
    book.categoryDepth2Id || ""
  )
  const [coverUrl, setCoverUrl] = useState(book.coverUrl || "")
  const [isbn13, setIsbn13] = useState(book.isbn13 || "")
  const [promptCoverUpload, setPromptCoverUpload] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setTitle(book.title)
      setAuthor(book.author || "")
      setPublisher(book.publisher || "")
      setRating(book.rating)
      setPublishedDate(book.publishedDate || "")
      setNotes(book.notes || "")
      setToReadThisYear(!!book.toReadThisYear)
      setLevel((book.level as BookLevel) || "")
      setCategoryDepth1Id(book.categoryDepth1Id || "")
      setCategoryDepth2Id(book.categoryDepth2Id || "")
      setCoverUrl(book.coverUrl || "")
      setIsbn13(book.isbn13 || "")
      setPromptCoverUpload(!book.coverUrl?.trim())
    }
  }, [isOpen, book])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    const d1 = categoryTree
      ? BookCategoryService.findDepth1(categoryTree, categoryDepth1Id)
      : undefined
    const d2 = categoryTree
      ? BookCategoryService.findDepth2(categoryTree, categoryDepth2Id)
      : undefined
    const categoryFields = buildBookCategoryFields(d1, d2)

    const updatedBook: Book = {
      ...book,
      title: title.trim(),
      author: author.trim() || "",
      publisher: publisher.trim() || undefined,
      rating,
      publishedDate: publishedDate.trim() || "",
      notes: notes.trim() || undefined,
      toReadThisYear: toReadThisYear || undefined,
      ...(level ? { level } : { level: undefined }),
      ...categoryFields,
      coverUrl: coverUrl.trim() || undefined,
      isbn13: isbn13.trim() || undefined,
    }

    onSave(updatedBook)
    onClose()
  }

  const levelOptions: SelectOption<BookLevel | "">[] = [
    { value: "", label: "선택 안 함" },
    ...BOOK_LEVELS.map((l) => ({ value: l, label: l })),
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
      <form
        onSubmit={handleSubmit}
        className="form-modal-fieldset max-h-[min(70vh,32rem)] space-y-3 overflow-y-auto sm:space-y-4"
      >
        <div>
          <p className="mb-1 text-xs font-semibold text-theme-secondary">필수</p>
          <label className="mb-0.5 block text-sm font-medium text-theme-primary">
            책 제목 *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="form-control"
            required
          />
        </div>

        <AladinBookLookup
          title={title}
          onAladinCoverMissing={() => setPromptCoverUpload(true)}
          onApply={(metadata) => {
            applyAladinBookMetadata(
              enrichAladinBookMetadata(metadata, categoryTree),
              {
                setTitle,
                setAuthor,
                setPublisher,
                setPublishedDate,
                setCategoryDepth1Id,
                setCategoryDepth2Id,
                setCoverUrl,
                setIsbn13,
                setNotes,
                getNotes: () => notes,
              },
            )
            if (metadata.coverUrl?.trim()) {
              setPromptCoverUpload(false)
            }
          }}
        />

        <BookCoverUpload
          bookId={book.id}
          visible={!coverUrl && promptCoverUpload}
          coverUrl={coverUrl}
          onCoverUrlChange={setCoverUrl}
        />

        {coverUrl && (
          <div className="flex items-start gap-3">
            <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-md bg-theme-tertiary shadow-sm">
              <Image
                src={coverUrl}
                alt="표지 미리보기"
                fill
                className="object-cover"
                sizes="64px"
                unoptimized
              />
            </div>
            <p className="text-xs text-theme-tertiary pt-1">
              {coverPreviewCaption(coverUrl)}
            </p>
          </div>
        )}

        <div>
          <p className="mb-1 text-xs font-semibold text-theme-secondary">선택 (권장 순)</p>
          <label className="mb-0.5 block text-sm font-medium text-theme-primary">
            저자
          </label>
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="form-control"
          />
        </div>

        <BookCategoryPicker
          depth1Id={categoryDepth1Id}
          depth2Id={categoryDepth2Id}
          onDepth1Change={setCategoryDepth1Id}
          onDepth2Change={setCategoryDepth2Id}
        />

        <div>
          <label className="mb-0.5 block text-sm font-medium text-theme-primary">
            출판사
          </label>
          <input
            type="text"
            value={publisher}
            onChange={(e) => setPublisher(e.target.value)}
            className="form-control"
          />
        </div>

        <div>
          <label className="mb-0.5 block text-sm font-medium text-theme-primary">
            비고
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="form-control min-h-[64px] resize-y"
            rows={2}
          />
        </div>

        <div>
          <label className="mb-0.5 block text-sm font-medium text-theme-primary">
            출판일
          </label>
          <FormNativePickerInput
            picker="date"
            value={publishedDate}
            onChange={(e) => setPublishedDate(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-0.5 block text-sm font-medium text-theme-primary">
            문해력 수준
          </label>
          <Select<BookLevel | "">
            value={level}
            onChange={setLevel}
            options={levelOptions}
            variant="form-modal"
          />
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={toReadThisYear}
            onChange={(e) => setToReadThisYear(e.target.checked)}
            className="rounded border-theme-tertiary"
          />
          이번 년도에 읽을 책
        </label>

        <div>
          <label className="mb-0.5 block text-sm font-medium text-theme-primary">
            평점
          </label>
          <div className="flex gap-0.5 pt-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="p-1"
              >
                <Star
                  className={`h-6 w-6 ${
                    star <= rating
                      ? "text-yellow-400 fill-current"
                      : "text-theme-tertiary"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-theme-secondary px-4 py-2 text-sm font-medium"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={!title.trim()}
            className="rounded-md bg-accent-theme px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            저장하기
          </button>
        </div>
      </form>
    </FormModalFrame>
  )
}
