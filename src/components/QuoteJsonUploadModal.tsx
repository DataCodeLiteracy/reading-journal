"use client"

import { useState, useRef } from "react"
import { Upload, X, AlertCircle, CheckCircle } from "lucide-react"
import { QuoteService } from "@/services/quoteService"
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock"

export interface QuoteImportItem {
  quoteText: string
  thoughts?: string
  generalThoughts?: string
  page?: number
  isPublic?: boolean
}

interface QuoteJsonUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  bookId: string
  userId: string
}

export default function QuoteJsonUploadModal({
  isOpen,
  onClose,
  onSuccess,
  bookId,
  userId,
}: QuoteJsonUploadModalProps) {
  const [jsonData, setJsonData] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState("")
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useBodyScrollLock(isOpen)

  if (!isOpen) return null

  const validateJson = (jsonString: string): QuoteImportItem[] | null => {
    const errors: string[] = []
    setValidationErrors([])
    try {
      const parsed = JSON.parse(jsonString)
      const list = Array.isArray(parsed) ? parsed : parsed.quotes
      if (!Array.isArray(list) || list.length === 0) {
        errors.push('JSON 배열 또는 { "quotes": [ ... ] } 형식이며, 최소 1개 이상의 항목이 필요합니다.')
        setValidationErrors(errors)
        return null
      }
      const items: QuoteImportItem[] = []
      list.forEach((item: unknown, index: number) => {
        if (!item || typeof item !== "object") {
          errors.push(`항목 ${index + 1}: 객체가 아닙니다.`)
          return
        }
        const o = item as Record<string, unknown>
        // 보고서 형식: passage | 기존 형식: quoteText
        const text = (o.quoteText != null ? String(o.quoteText) : o.passage != null ? String(o.passage) : "").trim()
        if (!text) {
          errors.push(`항목 ${index + 1}: quoteText 또는 passage(구절 텍스트)가 필요합니다.`)
          return
        }
        const purposes = Array.isArray(o.purposes)
          ? (o.purposes as string[]).join(", ")
          : undefined
        const thoughtPoint = o.thought_point != null ? String(o.thought_point).trim() : undefined
        const reason = o.reason != null ? String(o.reason).trim() : undefined
        const generalPart = [reason, purposes].filter(Boolean).join(" / ") || undefined
        items.push({
          quoteText: text,
          thoughts: thoughtPoint ?? (o.thoughts != null ? String(o.thoughts) : undefined),
          generalThoughts: generalPart ?? (o.generalThoughts != null ? String(o.generalThoughts) : undefined),
          page: typeof o.page === "number" && !Number.isNaN(o.page) ? o.page : undefined,
          isPublic: typeof o.isPublic === "boolean" ? o.isPublic : true,
        })
      })
      if (errors.length > 0) {
        setValidationErrors(errors)
        return null
      }
      return items
    } catch (e) {
      errors.push(`JSON 파싱 오류: ${e instanceof Error ? e.message : "알 수 없는 오류"}`)
      setValidationErrors(errors)
      return null
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        setJsonData(content)
        validateJson(content)
      }
      reader.readAsText(file)
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setJsonData(value)
    if (value.trim()) validateJson(value)
    else setValidationErrors([])
  }

  const handleUpload = async () => {
    if (!jsonData.trim()) {
      setUploadError("JSON 데이터를 입력하거나 파일을 업로드해주세요.")
      return
    }
    const items = validateJson(jsonData)
    if (!items) {
      setUploadError("JSON 검증에 실패했습니다. 오류를 확인해주세요.")
      return
    }
    try {
      setIsUploading(true)
      setUploadError(null)
      setUploadMessage("")
      const result = await QuoteService.createQuotes(bookId, userId, items)
      if (result.failed > 0) {
        setUploadError(
          `${result.success}개 성공, ${result.failed}개 실패\n${result.errors.join("\n")}`
        )
      } else {
        setUploadMessage(`${result.success}개의 구절 기록이 등록되었습니다.`)
        setTimeout(() => {
          setJsonData("")
          setValidationErrors([])
          setUploadMessage("")
          if (fileInputRef.current) fileInputRef.current.value = ""
          onSuccess?.()
          onClose()
        }, 2000)
      }
    } catch (e) {
      setUploadError(`업로드 실패: ${e instanceof Error ? e.message : "알 수 없는 오류"}`)
    } finally {
      setIsUploading(false)
    }
  }

  const handleClose = () => {
    setJsonData("")
    setValidationErrors([])
    setUploadError(null)
    setUploadMessage("")
    if (fileInputRef.current) fileInputRef.current.value = ""
    onClose()
  }

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-none bg-theme-backdrop'>
      <div className='modal-dialog-surface w-full max-w-2xl rounded-xl p-6 mx-4 max-h-[90vh] overflow-y-auto overflow-x-hidden'>
        <div className='flex items-center justify-between mb-4'>
          <div className='flex items-center gap-3'>
            <div className='p-2 bg-blue-100 dark:bg-blue-900/20 rounded-full'>
              <Upload className='h-5 w-5 text-blue-500' />
            </div>
            <div>
              <h3 className='text-lg font-semibold text-theme-primary'>
                구절 기록 JSON 업로드
              </h3>
              <p className='text-sm text-theme-secondary'>
                JSON 배열 또는 &#123; "quotes": [ ... ] &#125; · 항목: quoteText 또는 passage, page, purposes 등
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className='p-2 text-theme-secondary hover:bg-theme-tertiary rounded-full transition-colors'
          >
            <X className='h-5 w-5' />
          </button>
        </div>

        <div className='mb-4'>
          <label className='block text-sm font-medium text-theme-primary mb-2'>
            JSON 파일 업로드
          </label>
          <input
            ref={fileInputRef}
            type='file'
            accept='.json'
            onChange={handleFileUpload}
            className='block w-full text-sm text-theme-secondary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-accent-theme file:text-white hover:file:bg-accent-theme-secondary'
          />
        </div>

        <div className='mb-4'>
          <label className='block text-sm font-medium text-theme-primary mb-2'>
            또는 JSON 직접 입력
          </label>
          <textarea
            value={jsonData}
            onChange={handleTextareaChange}
            placeholder='[ { "quoteText": "구절...", "page": 42 } ] 또는 [ { "passage": "구절...", "page": 67, "purposes": ["core_message"] } ]'
            className='w-full h-64 p-3 border border-theme-tertiary rounded-lg bg-theme-tertiary text-theme-primary font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent-theme'
          />
        </div>

        {validationErrors.length > 0 && (
          <div className='mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg'>
            <div className='flex items-start gap-2'>
              <AlertCircle className='h-5 w-5 text-red-500 flex-shrink-0 mt-0.5' />
              <ul className='text-xs text-red-600 dark:text-red-300 space-y-1 list-disc list-inside'>
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {uploadMessage && (
          <div className='mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg'>
            <div className='flex items-center gap-2'>
              <CheckCircle className='h-5 w-5 text-green-500' />
              <p className='text-sm text-green-700 dark:text-green-400'>{uploadMessage}</p>
            </div>
          </div>
        )}

        {uploadError && (
          <div className='mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg'>
            <div className='flex items-start gap-2'>
              <AlertCircle className='h-5 w-5 text-red-500 flex-shrink-0 mt-0.5' />
              <pre className='text-xs text-red-600 dark:text-red-300 whitespace-pre-wrap'>
                {uploadError}
              </pre>
            </div>
          </div>
        )}

        <div className='flex gap-3'>
          <button
            onClick={handleClose}
            className='flex-1 px-4 py-2 border border-theme-tertiary text-theme-primary rounded-md hover:bg-theme-tertiary transition-colors'
          >
            취소
          </button>
          <button
            onClick={handleUpload}
            disabled={isUploading || !jsonData.trim() || validationErrors.length > 0}
            className='flex-1 px-4 py-2 bg-accent-theme hover:bg-accent-theme-secondary text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
          >
            {isUploading ? (
              <>
                <div className='animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent' />
                업로드 중...
              </>
            ) : (
              <>
                <Upload className='h-4 w-4' />
                업로드
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
