"use client"

import { useState, useEffect, useMemo } from "react"
import { BookOpen, Star } from "lucide-react"
import BookLookup from "@/components/BookLookup"
import BookCoverInlineEditor from "@/components/BookCoverInlineEditor"
import BookLookupFormApplyOverlay from "@/components/BookLookupFormApplyOverlay"
import { useBookLookupFormApply } from "@/hooks/useBookLookupFormApply"
import type { BookLookupFormSetters } from "@/utils/applyBookLookupMetadata"
import { Book, BOOK_LEVELS, type BookLevel } from "@/types/book"
import FormModalFrame from "@/components/FormModalFrame"
import { FormNativePickerInput } from "@/components/FormNativePickerInput"
import Select, { type SelectOption } from "@/components/Select"
import KdcClassificationPicker from "@/components/KdcClassificationPicker"
import {
  buildBookKdcFieldsForSave,
  clearLegacyBookCategoryFields,
} from "@/utils/bookKdcFields"

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
  const [publisher, setPublisher] = useState(book.publisher || "")
  const [rating, setRating] = useState(book.rating)
  const [publishedDate, setPublishedDate] = useState(book.publishedDate || "")
  const [notes, setNotes] = useState(book.notes || "")
  const [toReadThisYear, setToReadThisYear] = useState(!!book.toReadThisYear)
  const [level, setLevel] = useState<BookLevel | "">(
    (book.level as BookLevel) || ""
  )
  const [coverUrl, setCoverUrl] = useState(book.coverUrl || "")
  const [isbn13, setIsbn13] = useState(book.isbn13 || "")
  const [kdcMajorCode, setKdcMajorCode] = useState(book.kdcMajorCode || "")
  const [kdcMajorLabel, setKdcMajorLabel] = useState(book.kdcMajorLabel || "")
  const [kdcMiddleCode, setKdcMiddleCode] = useState(book.kdcMiddleCode || "")
  const [kdcMiddleLabel, setKdcMiddleLabel] = useState(book.kdcMiddleLabel || "")
  const [kdcDetailCode, setKdcDetailCode] = useState(book.kdcDetailCode || "")
  const [subjects, setSubjects] = useState<string[]>(book.subjects ?? [])
  const [coverUploadHint, setCoverUploadHint] = useState<string | undefined>()
  const [bookLookupFetchBusy, setBookLookupFetchBusy] = useState(false)

  const bookLookupSetters = useMemo(
    (): BookLookupFormSetters => ({
      setTitle,
      setAuthor,
      setPublisher,
      setPublishedDate,
      setCoverUrl,
      setIsbn13,
      setKdcMajorCode,
      setKdcMajorLabel,
      setKdcMiddleCode,
      setKdcMiddleLabel,
      setKdcDetailCode,
      setSubjects,
      setNotes,
      getNotes: () => notes,
    }),
    [notes],
  )

  const { isApplying: isBookLookupApplying, applyBookMetadata } =
    useBookLookupFormApply({
      formState: {
        title,
        author,
        publisher,
        publishedDate,
        coverUrl,
        isbn13,
        kdcMajorCode,
        kdcMajorLabel,
        kdcMiddleCode,
        kdcMiddleLabel,
        kdcDetailCode,
        subjects,
        notes,
      },
      setters: bookLookupSetters,
    })

  const bookLookupBusy = isBookLookupApplying || bookLookupFetchBusy

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
      setCoverUrl(book.coverUrl || "")
      setIsbn13(book.isbn13 || "")
      setKdcMajorCode(book.kdcMajorCode || "")
      setKdcMajorLabel(book.kdcMajorLabel || "")
      setKdcMiddleCode(book.kdcMiddleCode || "")
      setKdcMiddleLabel(book.kdcMiddleLabel || "")
      setKdcDetailCode(book.kdcDetailCode || "")
      setSubjects(book.subjects ?? [])
      setCoverUploadHint(undefined)
      setBookLookupFetchBusy(false)
    }
  }, [isOpen, book])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || bookLookupBusy) return

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
      ...clearLegacyBookCategoryFields(),
      ...buildBookKdcFieldsForSave({
        kdcMajorCode,
        kdcMajorLabel,
        kdcMiddleCode,
        kdcMiddleLabel,
        kdcDetailCode,
        subjects,
      }),
      coverUrl: coverUrl.trim() || undefined,
      isbn13: isbn13.trim() || undefined,
    }

    onSave(updatedBook)
    onClose()
  }

  const handleClose = () => {
    if (bookLookupBusy) return
    onClose()
  }

  const levelOptions: SelectOption<BookLevel | "">[] = [
    { value: "", label: "선택 안 함" },
    ...BOOK_LEVELS.map((l) => ({ value: l, label: l })),
  ]

  return (
    <FormModalFrame
      isOpen={isOpen}
      onClose={handleClose}
      title="책 정보 편집"
      interactionLocked={bookLookupBusy}
      lockOverlay={
        <BookLookupFormApplyOverlay
          active={bookLookupBusy}
          phase={isBookLookupApplying ? "apply" : "search"}
        />
      }
      headerStart={
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-theme-tertiary">
          <BookOpen className="h-5 w-5 accent-theme-primary" aria-hidden />
        </div>
      }
    >
      <form
        onSubmit={handleSubmit}
        className="form-modal-fieldset"
      >
        <fieldset
          disabled={bookLookupBusy}
          className="m-0 min-w-0 space-y-4 border-0 p-0 sm:space-y-5"
        >
        <div>
          <p className="mb-1 text-xs font-semibold text-theme-secondary">필수</p>
          <label className="mb-0.5 block text-sm font-medium text-theme-primary">
            책 제목 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="form-control"
            required
          />
        </div>

        <div className="space-y-3 sm:space-y-4">
          <BookLookup
            title={title}
            disabled={bookLookupBusy}
            onBusyChange={setBookLookupFetchBusy}
            onLookupStart={() => {
              setCoverUploadHint(undefined)
            }}
            onNeedsManualCover={(reason) => {
              setCoverUploadHint(
                reason === "not_found"
                  ? "도서를 찾지 못했습니다."
                  : "표지 정보가 없습니다.",
              )
            }}
            onApply={async (metadata) => {
              const applied = await applyBookMetadata(metadata)
              if (applied.coverUrl?.trim()) {
                setCoverUploadHint(undefined)
              }
            }}
          />

          <BookCoverInlineEditor
            bookId={book.id}
            coverUrl={coverUrl}
            onCoverUrlChange={(url) => {
              setCoverUrl(url)
              if (url.trim()) setCoverUploadHint(undefined)
            }}
            hint={coverUploadHint}
          />
        </div>

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

        <KdcClassificationPicker
          majorCode={kdcMajorCode}
          middleCode={kdcMiddleCode}
          onMajorChange={(code, label) => {
            setKdcMajorCode(code)
            setKdcMajorLabel(label)
            setKdcMiddleCode("")
            setKdcMiddleLabel("")
            setKdcDetailCode("")
          }}
          onMiddleChange={(code, label) => {
            setKdcMiddleCode(code)
            setKdcMiddleLabel(label)
            setKdcDetailCode(code)
          }}
          disabled={bookLookupBusy}
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
            onChangeAction={setLevel}
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

        <div className="flex justify-end gap-2 border-t border-theme-tertiary pt-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={bookLookupBusy}
            className="rounded-md bg-theme-secondary px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={!title.trim() || bookLookupBusy}
            className="rounded-md bg-accent-theme px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            저장하기
          </button>
        </div>
        </fieldset>
      </form>
    </FormModalFrame>
  )
}
