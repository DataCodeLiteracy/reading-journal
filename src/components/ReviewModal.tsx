"use client"

import { useEffect, useRef, useState } from "react"
import { Globe, Lock, Star, X } from "lucide-react"
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock"

export type ReviewModalSaveData = {
  review: string
  rating: number
  reviewIsPublic: boolean
}

type Props = {
  isOpen: boolean
  onClose: () => void
  onSave: (data: ReviewModalSaveData) => Promise<void>
  bookTitle?: string
  initialReview?: string
  initialRating?: number
  initialIsPublic?: boolean
}

const PANEL_MAX_H =
  "max-h-[calc(min(85dvh,100dvh-2rem)-105px)] sm:max-h-[calc(min(90dvh,100dvh-2rem)-105px)]"

export default function ReviewModal({
  isOpen,
  onClose,
  onSave,
  bookTitle,
  initialReview = "",
  initialRating = 0,
  initialIsPublic = true,
}: Props) {
  const [review, setReview] = useState("")
  const [rating, setRating] = useState(0)
  const [isPublic, setIsPublic] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const savingRef = useRef(false)
  const reviewRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isOpen) {
      setReview(initialReview)
      setRating(initialRating)
      setIsPublic(initialIsPublic)
      setIsSaving(false)
      savingRef.current = false
      setTimeout(() => reviewRef.current?.focus(), 100)
    }
  }, [isOpen, initialReview, initialRating, initialIsPublic])

  useBodyScrollLock(isOpen)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (savingRef.current) return
    if (!review.trim()) {
      alert("리뷰 내용을 입력해주세요.")
      return
    }

    savingRef.current = true
    setIsSaving(true)
    try {
      await onSave({
        review: review.trim(),
        rating,
        reviewIsPublic: isPublic,
      })
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : "리뷰를 저장하는 중 오류가 발생했습니다.")
    } finally {
      savingRef.current = false
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    setReview("")
    setRating(0)
    setIsPublic(true)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-none bg-theme-backdrop p-4">
      <div
        className={`modal-legacy-panel flex w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white dark:border-slate-600/80 dark:bg-gray-800 ${PANEL_MAX_H}`}
      >
        <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700 sm:p-6">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white sm:text-xl">
              {initialReview.trim() ? "리뷰 수정" : "리뷰 작성"}
            </h2>
            {bookTitle ? (
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 sm:text-sm">
                {bookTitle}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="ml-2 flex-shrink-0 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="닫기"
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

        <form
          id="review-modal-form"
          onSubmit={handleSubmit}
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-4 sm:p-6"
        >
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
                별점
              </label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star === rating ? 0 : star)}
                    className="rounded p-0.5 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                    aria-label={`${star}점`}
                    aria-pressed={star <= rating}
                  >
                    <Star
                      className={`h-7 w-7 ${
                        star <= rating
                          ? "fill-amber-400 text-amber-400"
                          : "text-gray-300 dark:text-gray-600"
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                  {rating > 0 ? `${rating}점` : "선택 안 함"}
                </span>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
                리뷰 내용 <span className="text-red-500">*</span>
              </label>
              <textarea
                ref={reviewRef}
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="책을 읽고 느낀 점을 적어보세요..."
                className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-theme dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                rows={10}
                required
              />
            </div>

            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
              <div className="flex items-center gap-2">
                {isPublic ? (
                  <Globe className="h-5 w-5 text-blue-500" aria-hidden />
                ) : (
                  <Lock className="h-5 w-5 text-gray-400" aria-hidden />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    공개하기
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {isPublic
                      ? "다른 독서자들이 이 리뷰를 볼 수 있습니다"
                      : "나만 볼 수 있습니다"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPublic(!isPublic)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isPublic ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"
                }`}
                aria-pressed={isPublic}
                aria-label="리뷰 공개 여부"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isPublic ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </form>

        <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800 sm:p-6">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              취소
            </button>
            <button
              type="submit"
              form="review-modal-form"
              disabled={isSaving}
              className="flex-1 rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving
                ? "저장 중..."
                : initialReview.trim()
                  ? "수정하기"
                  : "저장하기"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
