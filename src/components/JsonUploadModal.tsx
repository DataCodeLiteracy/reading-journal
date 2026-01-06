"use client"

import { useState, useRef } from "react"
import { Upload, X, AlertCircle, CheckCircle, FileText } from "lucide-react"
import { BookQuestionsImport } from "@/types/question"
import { QuestionService } from "@/services/questionService"

interface JsonUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  bookId: string
  bookTitle: string
}

export default function JsonUploadModal({
  isOpen,
  onClose,
  onSuccess,
  bookId,
  bookTitle,
}: JsonUploadModalProps) {
  const [jsonData, setJsonData] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState("")
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

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

  const validateJson = (jsonString: string): boolean => {
    const errors: string[] = []
    setValidationErrors([])

    try {
      const parsed = JSON.parse(jsonString)
      const importData = parsed as BookQuestionsImport

      // 기본 검증
      if (!importData.bookTitle || importData.bookTitle.trim() === "") {
        errors.push("bookTitle은 필수입니다.")
      }

      if (!importData.questions || !Array.isArray(importData.questions)) {
        errors.push("questions는 배열이어야 합니다.")
      } else if (importData.questions.length === 0) {
        errors.push("questions 배열에 최소 1개 이상의 질문이 필요합니다.")
      } else {
        // 각 질문 검증
        importData.questions.forEach((question, index) => {
          const validation = QuestionService.validateQuestion(question)
          if (!validation.valid) {
            validation.errors.forEach((error) => {
              errors.push(`질문 ${index + 1}: ${error}`)
            })
          }
        })
      }

      if (errors.length > 0) {
        setValidationErrors(errors)
        return false
      }

      return true
    } catch (error) {
      errors.push(
        `JSON 파싱 오류: ${error instanceof Error ? error.message : "알 수 없는 오류"}`
      )
      setValidationErrors(errors)
      return false
    }
  }

  const handleTextareaChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ): void => {
    const value = e.target.value
    setJsonData(value)
    if (value.trim()) {
      validateJson(value)
    } else {
      setValidationErrors([])
    }
  }

  const handleUpload = async (): Promise<void> => {
    if (!jsonData.trim()) {
      setUploadError("JSON 데이터를 입력하거나 파일을 업로드해주세요.")
      return
    }

    if (!validateJson(jsonData)) {
      setUploadError("JSON 검증에 실패했습니다. 오류를 확인해주세요.")
      return
    }

    try {
      setIsUploading(true)
      setUploadError(null)
      setUploadMessage("")

      const parsed = JSON.parse(jsonData) as BookQuestionsImport
      const result = await QuestionService.importQuestions(parsed, bookId)

      if (result.failed > 0) {
        setUploadError(
          `${result.success}개 성공, ${result.failed}개 실패\n${result.errors.join("\n")}`
        )
      } else {
        setUploadMessage(`${result.success}개의 질문이 성공적으로 업로드되었습니다.`)
        setTimeout(() => {
          setJsonData("")
          setValidationErrors([])
          setUploadMessage("")
          if (fileInputRef.current) {
            fileInputRef.current.value = ""
          }
          onSuccess?.()
          onClose()
        }, 2000)
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "알 수 없는 오류"
      setUploadError(`업로드 실패: ${errorMessage}`)
    } finally {
      setIsUploading(false)
    }
  }

  const handleClose = (): void => {
    setJsonData("")
    setValidationErrors([])
    setUploadError(null)
    setUploadMessage("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    onClose()
  }

  return (
    <div className='fixed inset-0 bg-theme-backdrop flex items-center justify-center z-50'>
      <div className='bg-theme-secondary rounded-lg p-6 w-full max-w-2xl mx-4 shadow-lg max-h-[90vh] overflow-y-auto'>
        <div className='flex items-center justify-between mb-4'>
          <div className='flex items-center gap-3'>
            <div className='p-2 bg-blue-100 dark:bg-blue-900/20 rounded-full'>
              <Upload className='h-5 w-5 text-blue-500' />
            </div>
            <div>
              <h3 className='text-lg font-semibold text-theme-primary'>
                질문 JSON 업로드
              </h3>
              <p className='text-sm text-theme-secondary'>
                {bookTitle} - 질문 일괄 업로드
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

        {/* 파일 업로드 */}
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

        {/* JSON 입력 */}
        <div className='mb-4'>
          <label className='block text-sm font-medium text-theme-primary mb-2'>
            또는 JSON 직접 입력
          </label>
          <textarea
            value={jsonData}
            onChange={handleTextareaChange}
            placeholder='JSON 형식의 질문 데이터를 입력하세요...'
            className='w-full h-64 p-3 border border-theme-tertiary rounded-lg bg-theme-tertiary text-theme-primary font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent-theme'
          />
        </div>

        {/* 검증 오류 */}
        {validationErrors.length > 0 && (
          <div className='mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg'>
            <div className='flex items-start gap-2'>
              <AlertCircle className='h-5 w-5 text-red-500 flex-shrink-0 mt-0.5' />
              <div className='flex-1'>
                <p className='text-sm font-medium text-red-700 dark:text-red-400 mb-2'>
                  검증 오류:
                </p>
                <ul className='text-xs text-red-600 dark:text-red-300 space-y-1 list-disc list-inside'>
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* 업로드 메시지 */}
        {uploadMessage && (
          <div className='mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg'>
            <div className='flex items-center gap-2'>
              <CheckCircle className='h-5 w-5 text-green-500' />
              <p className='text-sm text-green-700 dark:text-green-400'>
                {uploadMessage}
              </p>
            </div>
          </div>
        )}

        {/* 업로드 오류 */}
        {uploadError && (
          <div className='mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg'>
            <div className='flex items-start gap-2'>
              <AlertCircle className='h-5 w-5 text-red-500 flex-shrink-0 mt-0.5' />
              <div className='flex-1'>
                <p className='text-sm font-medium text-red-700 dark:text-red-400 mb-1'>
                  업로드 오류:
                </p>
                <pre className='text-xs text-red-600 dark:text-red-300 whitespace-pre-wrap'>
                  {uploadError}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* 버튼 */}
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

