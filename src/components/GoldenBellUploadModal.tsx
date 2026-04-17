"use client"

import { useState, useRef, useEffect } from "react"
import { X, Upload, AlertCircle, FileJson, RefreshCw } from "lucide-react"
import { GoldenBellService } from "@/services/goldenBellService"
import {
  GoldenBellJsonData,
  GoldenBellDifficulty,
  GOLDEN_BELL_DIFFICULTIES,
} from "@/types/goldenBell"
import ConfirmModal from "@/components/ConfirmModal"
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock"

interface GoldenBellUploadModalProps {
  isOpen: boolean
  onClose: () => void
  bookTitle: string
  userId: string
  onUploadSuccess: () => void
  /** 재등록 모드: 지정 시 해당 버전을 새 JSON으로 교체 (난이도 고정) */
  reregisterQuizId?: string | null
  reregisterDifficulty?: GoldenBellDifficulty | null
}

export default function GoldenBellUploadModal({
  isOpen,
  onClose,
  bookTitle,
  userId,
  onUploadSuccess,
  reregisterQuizId = null,
  reregisterDifficulty = null,
}: GoldenBellUploadModalProps) {
  const isReregister = Boolean(reregisterQuizId && reregisterDifficulty)
  const [jsonText, setJsonText] = useState("")
  const [difficulty, setDifficulty] = useState<GoldenBellDifficulty>(reregisterDifficulty ?? "easy")
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [preview, setPreview] = useState<{
    version: string
    questionCount: number
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [existingQuizId, setExistingQuizId] = useState<string | null>(null)
  const [isUpdateConfirmOpen, setIsUpdateConfirmOpen] = useState(false)

  useEffect(() => {
    if (isOpen && reregisterDifficulty) {
      setDifficulty(reregisterDifficulty)
    }
  }, [isOpen, reregisterDifficulty])

  useBodyScrollLock(isOpen)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      setJsonText(text)
      validateAndPreview(text)
    }
    reader.onerror = () => {
      setError("파일을 읽는 중 오류가 발생했습니다.")
    }
    reader.readAsText(file)
  }

  const validateAndPreview = (text: string) => {
    setError(null)
    setPreview(null)

    if (!text.trim()) {
      return
    }

    try {
      const parsed = JSON.parse(text)

      if (!GoldenBellService.validateJsonData(parsed)) {
        setError(
          "올바른 골든벨 JSON 형식이 아닙니다. document_info, questions, answers 필드를 확인해주세요."
        )
        return
      }

      const data = parsed as GoldenBellJsonData
      setPreview({
        version: data.document_info.version || "1.0",
        questionCount: data.questions.length,
      })
    } catch {
      setError("JSON 파싱 오류: 올바른 JSON 형식인지 확인해주세요.")
    }
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value
    setJsonText(text)
    validateAndPreview(text)
  }

  const handleUpload = async () => {
    if (!jsonText.trim() || error) return

    try {
      setIsUploading(true)
      setError(null)

      if (isReregister && reregisterQuizId) {
        await performUpload(true, reregisterQuizId)
        return
      }

      const existingQuiz = await GoldenBellService.findExistingQuiz(bookTitle, difficulty)

      if (existingQuiz) {
        setExistingQuizId(existingQuiz.id)
        setIsUpdateConfirmOpen(true)
        setIsUploading(false)
        return
      }

      await performUpload(false)
    } catch (e) {
      console.error("Upload error:", e)
      setError("업로드 중 오류가 발생했습니다. 다시 시도해주세요.")
    } finally {
      setIsUploading(false)
    }
  }

  const performUpload = async (isUpdate: boolean, quizIdToUpdate?: string) => {
    const targetQuizId = quizIdToUpdate ?? existingQuizId
    try {
      setIsUploading(true)
      setError(null)

      const parsed = JSON.parse(jsonText) as GoldenBellJsonData

      if (isUpdate && targetQuizId) {
        await GoldenBellService.updateQuiz(targetQuizId, parsed, difficulty)
      } else {
        await GoldenBellService.createQuizFromJson(bookTitle, parsed, userId, difficulty)
      }

      onUploadSuccess()
      handleClose()
    } catch (e) {
      console.error("Upload error:", e)
      setError("업로드 중 오류가 발생했습니다. 다시 시도해주세요.")
    } finally {
      setIsUploading(false)
    }
  }

  const handleConfirmUpdate = () => {
    setIsUpdateConfirmOpen(false)
    performUpload(true)
  }

  const handleCancelUpdate = () => {
    setIsUpdateConfirmOpen(false)
    setExistingQuizId(null)
  }

  const handleClose = () => {
    setJsonText("")
    setDifficulty(reregisterDifficulty ?? "easy")
    setError(null)
    setPreview(null)
    setExistingQuizId(null)
    setIsUpdateConfirmOpen(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-none bg-theme-backdrop'>
      <div className='modal-dialog-surface w-full max-w-lg rounded-xl p-6 mx-4 max-h-[90vh] overflow-y-auto'>
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-lg font-semibold text-theme-primary'>
            {isReregister ? "🔔 독서 골든벨 재등록" : "🔔 독서 골든벨 등록"}
          </h2>
          <button
            onClick={handleClose}
            className='p-1 rounded-full hover:bg-theme-tertiary transition-colors'
          >
            <X className='h-5 w-5 text-theme-secondary' />
          </button>
        </div>

        <p className='text-sm text-theme-secondary mb-4'>
          {isReregister ? (
            <>
              <strong>"{bookTitle}"</strong>의 {difficulty === "easy" ? "쉬운 버전" : "어려운 버전"} 퀴즈를 새 JSON으로 재등록합니다.
              <br />
              기존 문제가 새 내용으로 바뀝니다.
            </>
          ) : (
            <>
              <strong>"{bookTitle}"</strong>에 대한 골든벨 퀴즈를 등록합니다.
              <br />
              같은 제목의 책을 읽는 모든 사용자가 이 퀴즈를 볼 수 있습니다.
            </>
          )}
        </p>

        {/* 난이도 선택 (재등록 모드에서는 표시만) */}
        <div className='mb-4'>
          <label className='block text-sm font-medium text-theme-primary mb-2'>
            난이도 선택
          </label>
          {isReregister ? (
            <div className='px-3 py-2 border border-theme-tertiary rounded-md bg-theme-tertiary/50 text-theme-primary'>
              {difficulty === "easy" ? "😊 쉬운 버전" : "🔥 어려운 버전"} (재등록 대상)
            </div>
          ) : (
            <div className='flex gap-3'>
              {GOLDEN_BELL_DIFFICULTIES.map((diff) => (
                <button
                  key={diff.value}
                  type='button'
                  onClick={() => setDifficulty(diff.value)}
                  className={`flex-1 py-2.5 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${
                    difficulty === diff.value
                      ? diff.value === "easy"
                        ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300"
                        : "border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300"
                      : "border-theme-tertiary text-theme-secondary hover:border-theme-secondary"
                  }`}
                >
                  {diff.value === "easy" ? "😊 " : "🔥 "}
                  {diff.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 파일 업로드 */}
        <div className='mb-4'>
          <input
            ref={fileInputRef}
            type='file'
            accept='.json,application/json'
            onChange={handleFileSelect}
            className='hidden'
          />
          <button
            type='button'
            onClick={() => fileInputRef.current?.click()}
            className='flex items-center gap-2 w-full px-4 py-3 border-2 border-dashed border-theme-tertiary rounded-lg hover:border-accent-theme hover:bg-theme-tertiary/30 transition-colors text-theme-secondary'
          >
            <FileJson className='h-5 w-5' />
            JSON 파일 선택하기
          </button>
        </div>

        {/* 또는 직접 입력 */}
        <div className='mb-4'>
          <label className='block text-sm font-medium text-theme-primary mb-2'>
            또는 JSON 직접 입력
          </label>
          <textarea
            value={jsonText}
            onChange={handleTextChange}
            rows={8}
            className='w-full px-3 py-2 border border-theme-tertiary rounded-md focus:outline-none focus:ring-2 focus:ring-accent-theme bg-theme-primary text-theme-primary placeholder:text-theme-tertiary font-mono text-xs'
            placeholder='{"document_info": {...}, "questions": [...], "answers": [...]}'
          />
        </div>

        {/* 에러 표시 */}
        {error && (
          <div className='mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg'>
            <div className='flex items-start gap-2'>
              <AlertCircle className='h-4 w-4 text-red-500 mt-0.5 shrink-0' />
              <p className='text-red-700 dark:text-red-400 text-sm'>{error}</p>
            </div>
          </div>
        )}

        {/* 미리보기 */}
        {preview && !error && (
          <div className='mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg'>
            <p className='text-green-700 dark:text-green-400 text-sm font-medium mb-1'>
              ✓ 유효한 JSON입니다
            </p>
            <p className='text-green-600 dark:text-green-300 text-sm'>
              {difficulty === "easy" ? "😊 쉬운 버전" : "🔥 어려운 버전"} · 총 {preview.questionCount}문제
            </p>
          </div>
        )}

        {/* 버튼 */}
        <div className='flex gap-3'>
          <button
            type='button'
            onClick={handleClose}
            className='flex-1 px-4 py-2 border border-theme-tertiary text-theme-primary rounded-md hover:bg-theme-tertiary transition-colors'
          >
            취소
          </button>
          <button
            type='button'
            onClick={handleUpload}
            disabled={!preview || !!error || isUploading}
            className='flex-1 px-4 py-2 bg-accent-theme text-white rounded-md hover:bg-accent-theme-secondary disabled:bg-theme-tertiary disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2'
          >
            {isUploading ? (
              <>
                <div className='animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent' />
                {isReregister ? "재등록 중..." : "등록 중..."}
              </>
            ) : (
              <>
                <Upload className='h-4 w-4' />
                {isReregister ? "재등록하기" : "등록하기"}
              </>
            )}
          </button>
        </div>
      </div>

      {/* 재등록 확인 모달 (같은 버전이 이미 있을 때) */}
      <ConfirmModal
        isOpen={isUpdateConfirmOpen}
        onClose={handleCancelUpdate}
        onConfirm={handleConfirmUpdate}
        title='기존 버전 재등록'
        message={`이미 "${difficulty === "easy" ? "쉬운 버전" : "어려운 버전"}" 퀴즈가 등록되어 있습니다.\n새 JSON으로 해당 버전을 재등록하시겠습니까? (기존 내용이 새 내용으로 바뀝니다)`}
        confirmText='재등록'
        cancelText='취소'
        icon={RefreshCw}
        iconColor='text-blue-500'
        iconBgColor='bg-blue-100 dark:bg-blue-900/20'
        confirmButtonColor='bg-blue-500'
        confirmButtonHoverColor='hover:bg-blue-600'
        showSubtitle={false}
      />
    </div>
  )
}
