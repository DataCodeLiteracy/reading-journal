"use client"

import { useState, useRef } from "react"
import { Upload, X, AlertCircle, CheckCircle } from "lucide-react"
import { BookQuestionsImport } from "@/types/question"
import type { QuestionType } from "@/types/question"
import { QuestionService } from "@/services/questionService"

interface JsonUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  bookId: string
  bookTitle: string
}

/** 보고서 8 형식(한글 필드) 및 기존 형식 지원 → 정규화 */
function parseAndNormalizeQuestions(
  parsed: unknown,
  fallbackBookTitle: string,
  bookId: string
): { importData: BookQuestionsImport; errors: string[] } {
  const errors: string[] = []
  let bookTitle = fallbackBookTitle
  let rawList: unknown[] = []
  if (Array.isArray(parsed)) {
    rawList = parsed
  } else if (parsed && typeof parsed === "object" && "questions" in parsed) {
    const o = parsed as { bookTitle?: string; questions?: unknown[] }
    if (o.bookTitle && typeof o.bookTitle === "string") bookTitle = o.bookTitle.trim()
    rawList = Array.isArray(o.questions) ? o.questions : []
  } else {
    return {
      importData: { bookId, bookTitle: fallbackBookTitle, questions: [] },
      errors: ["JSON은 질문 배열 [ ... ] 또는 { bookTitle, questions: [ ... ] } 형식이어야 합니다."],
    }
  }
  if (rawList.length === 0) {
    return { importData: { bookId, bookTitle, questions: [] }, errors: ["최소 1개 이상의 질문이 필요합니다."] }
  }
  const difficultyMap: Record<string, "easy" | "medium" | "hard"> = {
    쉬움: "easy", 보통: "medium", 어려움: "hard",
    easy: "easy", medium: "medium", hard: "hard",
  }
  const questionTypeMap: Record<string, QuestionType> = {
    "개념 이해": "comprehension", "추론": "analysis", "자기 연결": "application",
    "적용": "application", "비판": "analysis", "확장": "general",
    "해석": "analysis", "토론": "general",
    comprehension: "comprehension", analysis: "analysis", synthesis: "synthesis",
    application: "application", general: "general",
  }
  const questions: BookQuestionsImport["questions"] = []
  for (let i = 0; i < rawList.length; i++) {
    const raw = rawList[i]
    if (!raw || typeof raw !== "object") {
      errors.push(`질문 ${i + 1}: 객체가 아닙니다.`)
      continue
    }
    const o = raw as Record<string, unknown>
    const questionText = (o.questionText != null ? String(o.questionText) : o.question != null ? String(o.question) : "").trim()
    if (!questionText) {
      errors.push(`질문 ${i + 1}: questionText 또는 question이 필요합니다.`)
      continue
    }
    const chapterPath = Array.isArray(o.chapterPath) && o.chapterPath.length > 0
      ? o.chapterPath.map((x) => String(x)).filter(Boolean)
      : ["전체"]
    const difficultyRaw = o.difficulty != null ? String(o.difficulty).trim() : ""
    const difficulty = difficultyMap[difficultyRaw] ?? "medium"
    const questionTypeRaw = o.questionType != null ? String(o.questionType) : o.question_type != null ? String(o.question_type) : ""
    const questionType = questionTypeMap[questionTypeRaw] ?? "general"
    const thoughtHint = o.thought_hint != null ? String(o.thought_hint).trim() || undefined : undefined
    questions.push({ questionText, chapterPath, questionType, difficulty, ...(thoughtHint != null && thoughtHint !== "" && { thoughtHint }) })
  }
  if (questions.length === 0 && errors.length > 0) {
    return { importData: { bookId, bookTitle, questions: [] }, errors }
  }
  return { importData: { bookId, bookTitle, questions }, errors }
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
      const { importData, errors: parseErrors } = parseAndNormalizeQuestions(parsed, bookTitle, bookId)
      if (parseErrors.length > 0) {
        setValidationErrors(parseErrors)
        return false
      }
      if (!importData.questions.length) {
        setValidationErrors(["최소 1개 이상의 질문이 필요합니다."])
        return false
      }
      for (let i = 0; i < importData.questions.length; i++) {
        const validation = QuestionService.validateQuestion(importData.questions[i])
        if (!validation.valid) {
          validation.errors.forEach((err) => {
            errors.push(`질문 ${i + 1}: ${err}`)
          })
        }
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

      const parsed = JSON.parse(jsonData)
      const { importData, errors: parseErrors } = parseAndNormalizeQuestions(parsed, bookTitle, bookId)
      if (parseErrors.length > 0) {
        setUploadError(parseErrors.join("\n"))
        setIsUploading(false)
        return
      }
      const result = await QuestionService.importQuestions(importData, bookId)

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
            placeholder='{ "bookTitle": "...", "questions": [ ... ] } 또는 [ { "question": "질문 내용", "question_type": "개념 이해", "difficulty": "보통" } ]'
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

