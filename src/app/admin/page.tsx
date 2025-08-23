"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Upload,
  BarChart3,
  Calendar,
  MessageSquare,
  BookOpen,
  Home,
  ArrowLeft,
  TrendingUp,
} from "lucide-react"
import { adminService } from "@/services/adminService"
import { ReadingRecord } from "@/types/admin"
import JsonPreviewModal from "@/components/JsonPreviewModal"
import { useAuth } from "@/contexts/AuthContext"
import { formatReadingTime } from "@/utils/timeUtils"

export default function AdminPage() {
  const router = useRouter()
  const { user, userData, loading, isLoggedIn } = useAuth()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [jsonData, setJsonData] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [stats, setStats] = useState({
    totalRecords: 0,
    monthlyRecords: 0,
    totalWords: 0,
  })
  const [isLoadingStats, setIsLoadingStats] = useState(true)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        setJsonData(content)
        setIsModalOpen(true)
      }
      reader.readAsText(file)
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJsonData(e.target.value)
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedText = e.clipboardData.getData("text")
    setJsonData(pastedText)
    setIsModalOpen(true)
  }

  // 통계 데이터 로드
  const loadStats = async () => {
    try {
      setIsLoadingStats(true)
      const allRecords = await adminService.getAllReadingRecords()
      const currentYear = new Date().getFullYear()
      const currentMonth = new Date().getMonth() + 1
      const monthlyRecords = await adminService.getMonthlyRecords(
        currentYear,
        currentMonth
      )
      const wordAnalysis = await adminService.getWordAnalysis()

      setStats({
        totalRecords: allRecords.length,
        monthlyRecords: monthlyRecords.length,
        totalWords: wordAnalysis.length,
      })
    } catch (error) {
      console.error("Error loading stats:", error)
    } finally {
      setIsLoadingStats(false)
    }
  }

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push("/login")
      return
    }

    if (!loading && isLoggedIn && userData && !userData.isAdmin) {
      router.push("/mypage")
      return
    }

    if (isLoggedIn && userData && userData.isAdmin) {
      loadStats()
    }
  }, [isLoggedIn, loading, user, router])

  // 업로드 후 통계 새로고침
  const handleJsonUpload = async () => {
    if (!jsonData.trim()) return

    try {
      setIsUploading(true)
      setUploadMessage("")

      const parsedData = JSON.parse(jsonData)
      let records: ReadingRecord[]

      // 배열인지 단일 객체인지 확인
      if (Array.isArray(parsedData)) {
        records = parsedData
      } else {
        records = [parsedData]
      }

      // 각 레코드 검증 및 업로드
      let successCount = 0
      let errorCount = 0

      for (const record of records) {
        try {
          // 필수 필드 검증
          if (!record.date || !record.title || !record.children) {
            errorCount++
            continue
          }

          await adminService.uploadReadingRecord(record)
          successCount++
        } catch (error) {
          console.error(`Record upload error:`, error)
          errorCount++
        }
      }

      // 결과 메시지 설정
      if (successCount > 0) {
        setUploadMessage(
          `✅ ${successCount}개 데이터 업로드 성공${
            errorCount > 0 ? `, ${errorCount}개 실패` : ""
          }`
        )
      } else {
        setUploadMessage(`❌ 모든 데이터 업로드 실패`)
      }

      setJsonData("")
      setIsModalOpen(false)

      // 파일 입력 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }

      // 통계 새로고침
      await loadStats()
    } catch (error) {
      console.error("Upload error:", error)
      setUploadMessage(
        `❌ 업로드 실패: ${
          error instanceof Error ? error.message : "알 수 없는 오류"
        }`
      )
    } finally {
      setIsUploading(false)
    }
  }

  // 로딩 중이거나 권한이 없는 경우
  if (loading) {
    return (
      <div className='min-h-screen bg-theme-gradient flex items-center justify-center'>
        <div className='text-center'>
          <BarChart3 className='h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse' />
          <p className='text-theme-secondary'>로딩 중...</p>
        </div>
      </div>
    )
  }

  // 로그인하지 않았거나 관리자가 아닌 경우
  if (!isLoggedIn || !userData || !userData.isAdmin) {
    return null
  }

  return (
    <div className='min-h-screen bg-theme-gradient'>
      <div className='container mx-auto px-4 py-6'>
        {/* 헤더 */}
        <header className='mb-6'>
          <div className='flex items-center gap-4 mb-4'>
            <button
              onClick={() => router.push("/mypage")}
              className='flex items-center gap-2 text-theme-secondary hover:text-theme-primary transition-colors'
            >
              <ArrowLeft className='h-5 w-5' />
              마이페이지로 돌아가기
            </button>
            <button
              onClick={() => router.push("/")}
              className='flex items-center gap-2 text-theme-secondary hover:text-theme-primary transition-colors'
            >
              <Home className='h-5 w-5' />
              메인 페이지
            </button>
          </div>
          <h1 className='text-3xl font-bold text-theme-primary mb-2'>
            🛠️ 관리자 페이지
          </h1>
          <p className='text-theme-secondary text-sm'>
            독서 기록을 관리하고 분석 결과를 확인하세요
          </p>
        </header>

        {/* JSON 업로드 섹션 */}
        <div className='bg-theme-secondary rounded-lg p-6 shadow-sm mb-6'>
          <h2 className='text-xl font-semibold text-theme-primary mb-4'>
            📤 JSON 데이터 업로드
          </h2>
          <p className='text-sm text-theme-secondary mb-4'>
            단일 레코드 또는 레코드 배열 모두 지원합니다.
          </p>

          <div className='space-y-4'>
            {/* 파일 업로드 */}
            <div>
              <label className='block text-sm font-medium text-theme-primary mb-2'>
                JSON 파일 선택
              </label>
              <input
                ref={fileInputRef}
                type='file'
                accept='.json'
                onChange={handleFileUpload}
                className='block w-full text-sm text-theme-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-theme-primary file:text-white hover:file:bg-theme-primary/80'
              />
            </div>

            {/* 직접 입력 */}
            <div>
              <label className='block text-sm font-medium text-theme-primary mb-2'>
                또는 JSON 데이터를 직접 입력하거나 붙여넣기
              </label>
              <textarea
                value={jsonData}
                onChange={handleTextareaChange}
                onPaste={handlePaste}
                placeholder='JSON 데이터를 여기에 입력하거나 붙여넣기하세요...'
                className='w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-theme-primary focus:border-transparent resize-none'
              />
            </div>

            {/* 업로드 버튼 */}
            <button
              onClick={() => setIsModalOpen(true)}
              disabled={!jsonData.trim()}
              className='flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
            >
              <Upload className='h-4 w-4' />
              데이터 미리보기
            </button>
          </div>

          {/* 업로드 메시지 */}
          {uploadMessage && (
            <div
              className={`mt-4 p-3 rounded-lg ${
                uploadMessage.includes("✅")
                  ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                  : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
              }`}
            >
              {uploadMessage}
            </div>
          )}
        </div>

        {/* 분석 도구 메뉴 */}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6'>
          <button
            onClick={() => router.push("/admin/analysis")}
            className='bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 sm:p-6 shadow-sm hover:shadow-md transition-all duration-200 text-left text-white min-h-[120px] sm:min-h-[140px]'
          >
            <div className='flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3'>
              <div className='p-1.5 sm:p-2 bg-white/20 rounded-lg'>
                <BarChart3 className='h-4 w-4 sm:h-6 sm:w-6' />
              </div>
            </div>
            <h3 className='font-semibold text-base sm:text-lg mb-1 sm:mb-2'>
              종합 분석
            </h3>
            <p className='text-xs sm:text-sm text-white/80 leading-relaxed'>
              JSON 데이터를 활용한 다양한 분석 결과
            </p>
          </button>

          <button
            onClick={() => router.push("/admin/monthly-records")}
            className='bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 sm:p-6 shadow-sm hover:shadow-md transition-all duration-200 text-left text-white min-h-[120px] sm:min-h-[140px]'
          >
            <div className='flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3'>
              <div className='p-1.5 sm:p-2 bg-white/20 rounded-lg'>
                <Calendar className='h-4 w-4 sm:h-6 sm:w-6' />
              </div>
            </div>
            <h3 className='font-semibold text-base sm:text-lg mb-1 sm:mb-2'>
              실천 기록
            </h3>
            <p className='text-xs sm:text-sm text-white/80 leading-relaxed'>
              월별 실천 기록 정리
            </p>
          </button>

          <button
            onClick={() => router.push("/admin/communication")}
            className='bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-4 sm:p-6 shadow-sm hover:shadow-md transition-all duration-200 text-left text-white min-h-[120px] sm:min-h-[140px]'
          >
            <div className='flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3'>
              <div className='p-1.5 sm:p-2 bg-white/20 rounded-lg'>
                <MessageSquare className='h-4 w-4 sm:h-5 sm:w-5' />
              </div>
            </div>
            <h3 className='font-semibold text-base sm:text-lg mb-1 sm:mb-2'>
              소통 순간
            </h3>
            <p className='text-xs sm:text-sm text-white/80 leading-relaxed'>
              월별 소통 순간 분석
            </p>
          </button>

          <button
            onClick={() => router.push("/admin/words")}
            className='bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-4 sm:p-6 shadow-sm hover:shadow-md transition-all duration-200 text-left text-white min-h-[120px] sm:min-h-[140px]'
          >
            <div className='flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3'>
              <div className='p-1.5 sm:p-2 bg-white/20 rounded-lg'>
                <BookOpen className='h-4 w-4 sm:h-5 sm:w-5' />
              </div>
            </div>
            <h3 className='font-semibold text-base sm:text-lg mb-1 sm:mb-2'>
              모르는 단어
            </h3>
            <p className='text-xs sm:text-sm text-white/80 leading-relaxed'>
              월별 모르는 단어 정리
            </p>
          </button>

          <button
            onClick={() => router.push("/admin/monthly-reflection")}
            className='bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg p-4 sm:p-6 shadow-sm hover:shadow-md transition-all duration-200 text-left text-white min-h-[120px] sm:min-h-[140px]'
          >
            <div className='flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3'>
              <div className='p-1.5 sm:p-2 bg-white/20 rounded-lg'>
                <TrendingUp className='h-4 w-4 sm:h-6 sm:w-6' />
              </div>
            </div>
            <h3 className='font-semibold text-base sm:text-lg mb-1 sm:mb-2'>
              월별 회고
            </h3>
            <p className='text-xs sm:text-sm text-white/80 leading-relaxed'>
              월별 독서 활동 회고
            </p>
          </button>
        </div>

        {/* 최근 업로드된 데이터 요약 */}
        <div className='bg-theme-secondary rounded-lg p-6 shadow-sm'>
          <h2 className='text-xl font-semibold text-theme-primary mb-4'>
            📊 데이터 현황
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            <div className='text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg'>
              <div className='text-2xl font-bold text-blue-600 dark:text-blue-400'>
                {isLoadingStats ? "..." : stats.totalRecords}
              </div>
              <div className='text-sm text-theme-secondary'>총 독서 기록</div>
            </div>
            <div className='text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg'>
              <div className='text-2xl font-bold text-green-600 dark:text-green-400'>
                {isLoadingStats ? "..." : stats.monthlyRecords}
              </div>
              <div className='text-sm text-theme-secondary'>이번 달 기록</div>
            </div>
            <div className='text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg'>
              <div className='text-2xl font-bold text-purple-600 dark:text-purple-400'>
                {isLoadingStats ? "..." : stats.totalWords}
              </div>
              <div className='text-sm text-theme-secondary'>총 모르는 단어</div>
            </div>
          </div>
        </div>
      </div>

      {/* JSON 미리보기 모달 */}
      <JsonPreviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleJsonUpload}
        jsonData={jsonData}
        isUploading={isUploading}
      />
    </div>
  )
}
