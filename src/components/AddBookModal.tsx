"use client"

import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { BookOpen, AlertCircle, Star } from "lucide-react"
import AladinBookLookup from "@/components/AladinBookLookup"
import BookCoverUpload from "@/components/BookCoverUpload"
import { coverPreviewCaption } from "@/utils/coverUrlSource"
import { useAuth } from "@/contexts/AuthContext"
import AladinFormApplyOverlay from "@/components/AladinFormApplyOverlay"
import { useAladinFormApply } from "@/hooks/useAladinFormApply"
import type { AladinBookFormSetters } from "@/utils/applyAladinBookMetadata"
import { Book, BOOK_LEVELS, type BookLevel } from "@/types/book"
import FormModalFrame from "@/components/FormModalFrame"
import { FormNativePickerInput } from "@/components/FormNativePickerInput"
import Select, { type SelectOption } from "@/components/Select"
import OwnBookDuplicateModal from "@/components/OwnBookDuplicateModal"
import ExploreEditionSuggestModal from "@/components/ExploreEditionSuggestModal"
import BookCategoryPicker from "@/components/BookCategoryPicker"
import { normalizeBookDuplicateKey } from "@/utils/bookTitleKey"
import { findExploreEditionRegisteredByOthers } from "@/services/bookRegistrationService"
import { useBookCategories } from "@/hooks/useBookCategories"
import { BookCategoryService } from "@/services/bookCategoryService"
import { buildBookCategoryFields } from "@/utils/bookCategoryFields"

interface AddBookModalProps {
  isOpen: boolean
  onClose: () => void
  onAddBook: (
    book: Omit<Book, "id" | "user_id">,
  ) => void | Promise<void>
  initialTitle?: string
  initialAuthor?: string
  initialPublishedDate?: string
  initialPublisher?: string
  initialNotes?: string
  initialLevel?: BookLevel
  initialCategoryDepth1Id?: string
  initialCategoryDepth2Id?: string
  userBookDuplicateKeys: readonly string[]
  /** 알라딘 적용 후 탐색 등록 안내 (탐색 페이지에서는 false) */
  enableExploreEditionSuggest?: boolean
}

export default function AddBookModal({
  isOpen,
  onClose,
  onAddBook,
  initialTitle = "",
  initialAuthor = "",
  initialPublishedDate = "",
  initialPublisher = "",
  initialNotes = "",
  initialLevel,
  initialCategoryDepth1Id = "",
  initialCategoryDepth2Id = "",
  userBookDuplicateKeys,
  enableExploreEditionSuggest = true,
}: AddBookModalProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { data: categoryTree, isLoading: categoryTreeLoading } =
    useBookCategories()
  const [title, setTitle] = useState(initialTitle)
  const [author, setAuthor] = useState(initialAuthor)
  const [publisher, setPublisher] = useState(initialPublisher)
  const [publishedDate, setPublishedDate] = useState(initialPublishedDate)
  const [notes, setNotes] = useState(initialNotes)
  const [status, setStatus] = useState<Book["status"]>("want-to-read")
  const [rating, setRating] = useState(0)
  const [toReadThisYear, setToReadThisYear] = useState(false)
  const [level, setLevel] = useState<BookLevel | "">(initialLevel || "")
  const [categoryDepth1Id, setCategoryDepth1Id] = useState(initialCategoryDepth1Id)
  const [categoryDepth2Id, setCategoryDepth2Id] = useState(initialCategoryDepth2Id)
  const [coverUrl, setCoverUrl] = useState("")
  const [isbn13, setIsbn13] = useState("")
  const titleInputRef = useRef<HTMLInputElement>(null)
  const [ownDuplicateModalOpen, setOwnDuplicateModalOpen] = useState(false)
  const [promptCoverUpload, setPromptCoverUpload] = useState(false)
  const [coverUploadHint, setCoverUploadHint] = useState<string | undefined>()
  const [exploreSuggestOpen, setExploreSuggestOpen] = useState(false)
  const [exploreSuggestEdition, setExploreSuggestEdition] = useState<{
    title: string
    publisher?: string
    userCount: number
  } | null>(null)
  const exploreSuggestDismissedKeyRef = useRef<string | null>(null)
  const [aladinFetchBusy, setAladinFetchBusy] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const duplicateKeySet = useMemo(
    () => new Set(userBookDuplicateKeys),
    [userBookDuplicateKeys],
  )

  const hasOwnDuplicateEdition = useMemo(() => {
    const t = title.trim()
    if (!t) return false
    return duplicateKeySet.has(normalizeBookDuplicateKey(t, publisher))
  }, [title, publisher, duplicateKeySet])

  const aladinSetters = useMemo(
    (): AladinBookFormSetters => ({
      setTitle,
      setAuthor,
      setPublisher,
      setPublishedDate,
      setCategoryDepth1Id,
      setCategoryDepth2Id,
      setCategories: (depth1Id, depth2Id) => {
        setCategoryDepth1Id(depth1Id)
        setCategoryDepth2Id(depth2Id)
      },
      setCoverUrl,
      setIsbn13,
      setNotes,
      getNotes: () => notes,
    }),
    [notes],
  )

  const { isAladinApplying, applyAladinMetadata } = useAladinFormApply({
    source: "add-book-modal",
    bookTitle: title,
    userId: user?.uid,
    categoryTree,
    categoryTreePending: categoryTreeLoading,
    formState: {
      title,
      author,
      publisher,
      publishedDate,
      categoryDepth1Id,
      categoryDepth2Id,
      coverUrl,
      isbn13,
      notes,
    },
    setters: aladinSetters,
  })

  const aladinBusy = isAladinApplying || aladinFetchBusy

  useEffect(() => {
    if (isOpen && titleInputRef.current) {
      titleInputRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle)
      setAuthor(initialAuthor)
      setPublisher(initialPublisher)
      setPublishedDate(initialPublishedDate)
      setNotes(initialNotes)
      setLevel(initialLevel || "")
      setCategoryDepth1Id(initialCategoryDepth1Id)
      setCategoryDepth2Id(initialCategoryDepth2Id)
      setOwnDuplicateModalOpen(false)
      setStatus("want-to-read")
      setRating(0)
      setToReadThisYear(false)
      setCoverUrl("")
      setIsbn13("")
      setPromptCoverUpload(false)
      setCoverUploadHint(undefined)
      setExploreSuggestOpen(false)
      setExploreSuggestEdition(null)
      exploreSuggestDismissedKeyRef.current = null
      setAladinFetchBusy(false)
      setIsSubmitting(false)
      setSubmitError(null)
    }
  }, [
    isOpen,
    initialTitle,
    initialAuthor,
    initialPublisher,
    initialPublishedDate,
    initialNotes,
    initialLevel,
    initialCategoryDepth1Id,
    initialCategoryDepth2Id,
  ])

  const resetForm = () => {
    setTitle("")
    setAuthor("")
    setPublisher("")
    setPublishedDate("")
    setNotes("")
    setStatus("want-to-read")
    setRating(0)
    setToReadThisYear(false)
    setLevel("")
    setCategoryDepth1Id("")
    setCategoryDepth2Id("")
    setCoverUrl("")
    setIsbn13("")
    setOwnDuplicateModalOpen(false)
    setPromptCoverUpload(false)
    setCoverUploadHint(undefined)
    setExploreSuggestOpen(false)
    setExploreSuggestEdition(null)
    exploreSuggestDismissedKeyRef.current = null
    setIsSubmitting(false)
    setSubmitError(null)
  }

  const maybeSuggestExploreEdition = useCallback(
    async (appliedTitle: string, appliedPublisher?: string) => {
      if (!enableExploreEditionSuggest || !user?.uid) return

      const t = appliedTitle.trim()
      if (!t) return

      const editionKey = normalizeBookDuplicateKey(t, appliedPublisher)
      if (duplicateKeySet.has(editionKey)) return
      if (exploreSuggestDismissedKeyRef.current === editionKey) return

      const match = await findExploreEditionRegisteredByOthers(
        user.uid,
        t,
        appliedPublisher,
      )
      if (!match.match) return

      setExploreSuggestEdition({
        title: match.title,
        publisher: match.publisher,
        userCount: match.userCount,
      })
      setExploreSuggestOpen(true)
    },
    [duplicateKeySet, enableExploreEditionSuggest, user?.uid],
  )

  const handleGoToExplore = () => {
    const t = exploreSuggestEdition?.title?.trim() || title.trim()
    if (!t) return
    setExploreSuggestOpen(false)
    resetForm()
    onClose()
    router.push(`/explore?search=${encodeURIComponent(t)}`)
  }

  const handleContinueRegisterHere = () => {
    if (exploreSuggestEdition) {
      exploreSuggestDismissedKeyRef.current = normalizeBookDuplicateKey(
        exploreSuggestEdition.title,
        exploreSuggestEdition.publisher,
      )
    }
    setExploreSuggestOpen(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || aladinBusy || isSubmitting) return

    if (hasOwnDuplicateEdition) {
      setOwnDuplicateModalOpen(true)
      return
    }

    const d1 = categoryTree
      ? BookCategoryService.findDepth1(categoryTree, categoryDepth1Id)
      : undefined
    const d2 = categoryTree
      ? BookCategoryService.findDepth2(categoryTree, categoryDepth2Id)
      : undefined
    const categoryFields = buildBookCategoryFields(d1, d2)

    const newBook: Omit<Book, "id" | "user_id"> = {
      title: title.trim(),
      author: author.trim() || "",
      publisher: publisher.trim() || undefined,
      publishedDate: publishedDate || "",
      notes: notes.trim() || undefined,
      status,
      rating,
      hasStartedReading: status === "reading" || status === "completed",
      toReadThisYear: toReadThisYear || undefined,
      ...(level ? { level } : {}),
      ...categoryFields,
      ...(coverUrl.trim() ? { coverUrl: coverUrl.trim() } : {}),
      ...(isbn13.trim() ? { isbn13: isbn13.trim() } : {}),
    }

    setIsSubmitting(true)
    setSubmitError(null)
    try {
      await onAddBook(newBook)
      resetForm()
      onClose()
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "책을 추가하지 못했습니다. 다시 시도해 주세요.",
      )
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (aladinBusy || isSubmitting) return
    resetForm()
    onClose()
  }

  const levelOptions: SelectOption<BookLevel | "">[] = [
    { value: "", label: "선택 안 함" },
    ...BOOK_LEVELS.map((l) => ({ value: l, label: l })),
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
        interactionLocked={aladinBusy || isSubmitting}
        lockOverlay={
          <AladinFormApplyOverlay
            active={aladinBusy}
            phase={isAladinApplying ? "apply" : "search"}
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
            disabled={aladinBusy || isSubmitting}
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
              className={`form-control ${
                hasOwnDuplicateEdition ? "!border-amber-500 ring-1 ring-amber-500/30" : ""
              }`}
              placeholder="책 제목을 입력하세요"
              required
              ref={titleInputRef}
            />
            {hasOwnDuplicateEdition && (
              <p className="mt-1.5 flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>
                  내 서재에 이미 같은 제목·출판사로 등록된 책이 있습니다.
                </span>
              </p>
            )}
          </div>

          <div className="space-y-3 sm:space-y-4">
            <AladinBookLookup
              title={title}
              disabled={aladinBusy}
              onBusyChange={setAladinFetchBusy}
              onLookupStart={() => {
                setPromptCoverUpload(false)
                setCoverUploadHint(undefined)
              }}
              onNeedsManualCover={(reason) => {
                setPromptCoverUpload(true)
                setCoverUploadHint(
                  reason === "not_found"
                    ? "알라딘에서 책을 찾지 못했습니다. 표지를 직접 올려 주세요."
                    : "알라딘에 표지가 없습니다. 표지를 직접 올려 주세요.",
                )
              }}
              onApply={async (metadata) => {
                const enriched = await applyAladinMetadata(metadata)
                if (enriched.coverUrl?.trim()) {
                  setPromptCoverUpload(false)
                  setCoverUploadHint(undefined)
                }
                void maybeSuggestExploreEdition(
                  enriched.title?.trim() || metadata.title?.trim() || title,
                  enriched.publisher?.trim() ||
                    metadata.publisher?.trim() ||
                    publisher,
                )
              }}
            />

            <BookCoverUpload
              visible={!coverUrl && promptCoverUpload}
              coverUrl={coverUrl}
              onCoverUrlChange={setCoverUrl}
              hint={coverUploadHint}
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
                  {coverPreviewCaption(coverUrl)} (저장 시 URL이 함께 기록됩니다)
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="mb-0.5 block text-sm font-medium text-theme-primary">
              상태 <span className="text-red-500">*</span>
            </label>
            <Select<Book["status"]>
              value={status}
              onChangeAction={setStatus}
              options={statusOptions}
              variant="form-modal"
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
              placeholder="저자"
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
              placeholder="출판사"
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
              비고
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="form-control min-h-[64px] resize-y"
              placeholder="시리즈명, 메모 등"
              rows={2}
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

          <label className="flex cursor-pointer items-center gap-2 text-sm text-theme-primary">
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
              평점 (선택)
            </label>
            <div className="flex gap-0.5 pt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star === rating ? 0 : star)}
                  className="p-1"
                  aria-label={`${star}점`}
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

          {submitError && (
            <p
              className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
              role="alert"
            >
              {submitError}
            </p>
          )}

          <div className="sticky bottom-0 mt-2 flex justify-end gap-2 border-t border-theme-tertiary bg-theme-secondary pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={aladinBusy || isSubmitting}
              className="rounded-md bg-theme-tertiary px-4 py-2 text-sm font-medium text-theme-primary disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!title.trim() || aladinBusy || isSubmitting}
              className="rounded-md bg-accent-theme px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {isSubmitting ? "추가 중…" : "추가하기"}
            </button>
          </div>
          </fieldset>
        </form>
      </FormModalFrame>

      <OwnBookDuplicateModal
        isOpen={ownDuplicateModalOpen}
        onClose={() => setOwnDuplicateModalOpen(false)}
        title={title.trim()}
      />

      <ExploreEditionSuggestModal
        isOpen={exploreSuggestOpen}
        title={exploreSuggestEdition?.title ?? title}
        publisher={exploreSuggestEdition?.publisher ?? publisher}
        registrantCount={exploreSuggestEdition?.userCount}
        onGoToExplore={handleGoToExplore}
        onContinueHere={handleContinueRegisterHere}
        onClose={handleContinueRegisterHere}
      />
    </>
  )
}
