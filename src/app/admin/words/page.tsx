"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  BookMarked,
  Search,
  Filter,
  Calendar,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  FileSpreadsheet,
  ExternalLink,
} from "lucide-react"
import { adminService } from "@/services/adminService"
import { WordAnalysis } from "@/types/admin"
import { useAuth } from "@/contexts/AuthContext"
import * as XLSX from "xlsx"
import { GenericRouteSkeleton } from "@/components/skeletons"
import Select, { type SelectOption } from "@/components/Select"

export default function WordsPage() {
  const router = useRouter()
  const { user, userData, loading, isLoggedIn } = useAuth()
  const [wordAnalysis, setWordAnalysis] = useState<WordAnalysis[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<
    "all" | "explained" | "unexplained"
  >("all")
  const [sortBy, setSortBy] = useState<"count" | "word" | "firstAppearance">(
    "count"
  )
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(0) // 0은 전체를 의미
  const [filteredWords, setFilteredWords] = useState<WordAnalysis[]>([])
  const [monthlyStats, setMonthlyStats] = useState<Map<string, any>>(new Map())
  const [filteredMonthlyStats, setFilteredMonthlyStats] = useState<
    Map<string, any>
  >(new Map())

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
      loadWordData()
    }
  }, [isLoggedIn, loading, user, router])

  const loadWordData = async () => {
    try {
      setIsLoading(true)
      const data = await adminService.getWordAnalysis()
      setWordAnalysis(data)
      setFilteredWords(data)
      generateMonthlyStats(data)
      setFilteredMonthlyStats(generateMonthlyStatsFromWords(data))
    } catch (error) {
      console.error("Error loading word data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateMonthlyStats = (words: WordAnalysis[]) => {
    const monthlyMap = new Map<string, any>()

    words.forEach((word) => {
      const firstDate = new Date(word.firstAppearance)
      const monthKey = `${firstDate.getFullYear()}-${(firstDate.getMonth() + 1)
        .toString()
        .padStart(2, "0")}`

      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          year: firstDate.getFullYear(),
          month: firstDate.getMonth() + 1,
          totalWords: 0,
          totalOccurrences: 0,
          explainedWords: 0,
          words: [],
        })
      }

      const monthData = monthlyMap.get(monthKey)
      monthData.totalWords++
      monthData.totalOccurrences += word.count
      if (word.explainedCount > 0) {
        monthData.explainedWords++
      }
      monthData.words.push(word)
    })

    setMonthlyStats(monthlyMap)
  }

  const generateMonthlyStatsFromWords = (words: WordAnalysis[]) => {
    const monthlyMap = new Map<string, any>()

    words.forEach((word) => {
      const firstDate = new Date(word.firstAppearance)
      const monthKey = `${firstDate.getFullYear()}-${(firstDate.getMonth() + 1)
        .toString()
        .padStart(2, "0")}`

      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          year: firstDate.getFullYear(),
          month: firstDate.getMonth() + 1,
          totalWords: 0,
          totalOccurrences: 0,
          explainedWords: 0,
          words: [],
        })
      }

      const monthData = monthlyMap.get(monthKey)
      monthData.totalWords++
      monthData.totalOccurrences += word.count
      if (word.explainedCount > 0) {
        monthData.explainedWords++
      }
      monthData.words.push(word)
    })

    return monthlyMap
  }

  const wordsYearOptions = useMemo((): SelectOption<string>[] => {
    const y = new Date().getFullYear()
    return [
      { value: "0", label: "전체" },
      { value: String(y), label: String(y) },
      { value: String(y - 1), label: String(y - 1) },
      { value: String(y - 2), label: String(y - 2) },
    ]
  }, [])

  const wordsMonthOptions = useMemo(
    (): SelectOption<string>[] => [
      { value: "0", label: "전체" },
      ...Array.from({ length: 12 }, (_, i) => i + 1).map((m) => ({
        value: String(m),
        label: `${m}월`,
      })),
    ],
    [],
  )

  const wordsFilterStatusOptions = useMemo(
    (): SelectOption<"all" | "explained" | "unexplained">[] => [
      { value: "all", label: "모든 단어" },
      { value: "explained", label: "설명된 단어" },
      { value: "unexplained", label: "설명되지 않은 단어" },
    ],
    [],
  )

  const wordsSortByOptions = useMemo(
    (): SelectOption<"count" | "word" | "firstAppearance">[] => [
      { value: "count", label: "등장 횟수" },
      { value: "word", label: "단어 순" },
      { value: "firstAppearance", label: "첫 등장일" },
    ],
    [],
  )

  const handleSearch = () => {
    let filtered = wordAnalysis

    // 년도 필터
    if (selectedYear > 0) {
      filtered = filtered.filter((word) => {
        const firstDate = new Date(word.firstAppearance)
        return firstDate.getFullYear() === selectedYear
      })
    }

    // 월 필터
    if (selectedMonth > 0) {
      filtered = filtered.filter((word) => {
        const firstDate = new Date(word.firstAppearance)
        return firstDate.getMonth() + 1 === selectedMonth
      })
    }

    // 검색어 필터
    if (searchTerm) {
      filtered = filtered.filter(
        (word) =>
          word.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
          word.contexts.some((context) =>
            context.toLowerCase().includes(searchTerm.toLowerCase())
          )
      )
    }

    // 상태 필터
    if (filterStatus === "explained") {
      filtered = filtered.filter((word) => word.explainedCount > 0)
    } else if (filterStatus === "unexplained") {
      filtered = filtered.filter((word) => word.unexplainedCount > 0)
    }

    // 정렬
    filtered.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortBy) {
        case "count":
          aValue = a.count
          bValue = b.count
          break
        case "word":
          aValue = a.word
          bValue = b.word
          break
        case "firstAppearance":
          aValue = new Date(a.firstAppearance).getTime()
          bValue = new Date(b.firstAppearance).getTime()
          break
        default:
          aValue = a.count
          bValue = b.count
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    setFilteredWords(filtered)
    setFilteredMonthlyStats(generateMonthlyStatsFromWords(filtered))
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return `${date.getFullYear()}-${(date.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`
  }

  const getTotalStats = () => {
    if (wordAnalysis.length === 0) return null

    const totalWords = wordAnalysis.length
    const totalOccurrences = wordAnalysis.reduce(
      (sum, word) => sum + word.count,
      0
    )
    const explainedWords = wordAnalysis.filter(
      (word) => word.explainedCount > 0
    ).length
    const unexplainedWords = wordAnalysis.filter(
      (word) => word.unexplainedCount > 0
    ).length
    const totalExplained = wordAnalysis.reduce(
      (sum, word) => sum + word.explainedCount,
      0
    )
    const totalUnexplained = wordAnalysis.reduce(
      (sum, word) => sum + word.unexplainedCount,
      0
    )

    return {
      totalWords,
      totalOccurrences,
      explainedWords,
      unexplainedWords,
      totalExplained,
      totalUnexplained,
    }
  }

  // 엑셀 내보내기 데이터 준비
  const prepareExportData = () => {
    const exportData: any[] = []
    let sequence = 1

    // 검색 결과가 있으면 검색 결과를, 없으면 전체 데이터를 사용
    const dataToExport = filteredWords.length > 0 ? filteredWords : wordAnalysis

    // 월별로 정렬된 데이터에서 단어 추출
    Array.from(filteredMonthlyStats.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .forEach(([monthKey, monthData]) => {
        monthData.words.forEach((word: WordAnalysis) => {
          exportData.push({
            순번: sequence++,
            "모르는 단어": word.word,
            "첫 등장일": formatDate(word.firstAppearance),
            "마지막 등장일": formatDate(word.lastAppearance),
            "총 등장 횟수": word.count,
            "설명된 횟수": word.explainedCount,
            "설명되지 않은 횟수": word.unexplainedCount,
            "설명 여부": word.explainedCount > 0 ? "설명됨" : "미설명",
            맥락: word.contexts.join(" | "),
            "등장 월": `${monthData.year}년 ${monthData.month}월`,
          })
        })
      })

    return exportData
  }

  // CSV 다운로드
  const downloadCSV = () => {
    const data = prepareExportData()
    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header as keyof typeof row]
            // CSV에서 쉼표와 따옴표 처리
            if (typeof value === "string" && value.includes(",")) {
              return `"${value.replace(/"/g, '""')}"`
            }
            return value
          })
          .join(",")
      ),
    ].join("\n")

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute(
      "download",
      `모르는_단어_목록_${new Date().toISOString().split("T")[0]}.csv`
    )
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Excel 파일 다운로드
  const downloadExcel = () => {
    const data = prepareExportData()
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "모르는 단어")

    // 열 너비 자동 조정
    const colWidths = [
      { wch: 8 }, // 순번
      { wch: 15 }, // 모르는 단어
      { wch: 12 }, // 첫 등장일
      { wch: 12 }, // 마지막 등장일
      { wch: 12 }, // 총 등장 횟수
      { wch: 12 }, // 설명된 횟수
      { wch: 15 }, // 설명되지 않은 횟수
      { wch: 12 }, // 설명 여부
      { wch: 50 }, // 맥락
      { wch: 15 }, // 등장 월
    ]
    ws["!cols"] = colWidths

    XLSX.writeFile(
      wb,
      `모르는_단어_목록_${new Date().toISOString().split("T")[0]}.xlsx`
    )
  }

  // 구글 시트용 데이터 복사
  const copyToClipboard = () => {
    const data = prepareExportData()
    const headers = Object.keys(data[0])

    // 탭으로 구분된 형식으로 변환 (구글 시트에 붙여넣기 용이)
    const tsvContent = [
      headers.join("\t"),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header as keyof typeof row]
            // 탭과 줄바꿈 문자 처리
            if (typeof value === "string") {
              return value.replace(/\t/g, " ").replace(/\n/g, " ")
            }
            return value
          })
          .join("\t")
      ),
    ].join("\n")

    // 클립보드에 복사
    navigator.clipboard
      .writeText(tsvContent)
      .then(() => {
        alert(
          "데이터가 클립보드에 복사되었습니다!\n\n구글 시트에서 Ctrl+V(또는 Cmd+V)로 붙여넣기하세요."
        )
      })
      .catch(() => {
        // 클립보드 API가 지원되지 않는 경우 대체 방법
        const textArea = document.createElement("textarea")
        textArea.value = tsvContent
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand("copy")
        document.body.removeChild(textArea)
        alert(
          "데이터가 클립보드에 복사되었습니다!\n\n구글 시트에서 Ctrl+V(또는 Cmd+V)로 붙여넣기하세요."
        )
      })
  }

  const totalStats = getTotalStats()

  // 로딩 중이거나 권한이 없는 경우
  if (loading) {
    return <GenericRouteSkeleton rows={4} />
  }

  // 로그인하지 않았거나 관리자가 아닌 경우
  if (!isLoggedIn || !userData || !userData.isAdmin) {
    return null
  }

  if (isLoading) {
    return (
      <>
        <span className="sr-only">단어 데이터를 불러오는 중</span>
        <GenericRouteSkeleton rows={6} />
      </>
    )
  }

  return (
    <div className='min-h-screen bg-theme-gradient'>
      <div className='container mx-auto px-4 py-6'>
        {/* 헤더 */}
        <header className='mb-6'>
          <button
            onClick={() => router.push("/admin")}
            className='flex items-center gap-2 text-theme-secondary hover:text-theme-primary mb-4 transition-colors'
          >
            <ArrowLeft className='h-5 w-5' />
            관리자 페이지로 돌아가기
          </button>
          <h1 className='text-3xl font-bold text-theme-primary mb-2'>
            📚 모르는 단어
          </h1>
          <p className='text-theme-secondary text-sm'>
            월별 모르는 단어 정리 및 분석
          </p>
        </header>

        {/* 전체 통계 */}
        {totalStats && (
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6'>
            <div className='bg-theme-secondary rounded-lg p-4 shadow-sm'>
              <div className='flex items-center gap-3 mb-2'>
                <div className='p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg'>
                  <BookMarked className='h-5 w-5 text-blue-600 dark:text-blue-400' />
                </div>
                <div>
                  <p className='text-sm text-theme-secondary'>총 단어 수</p>
                  <p className='text-2xl font-bold text-theme-primary'>
                    {totalStats.totalWords}개
                  </p>
                </div>
              </div>
            </div>

            <div className='bg-theme-secondary rounded-lg p-4 shadow-sm'>
              <div className='flex items-center gap-3 mb-2'>
                <div className='p-2 bg-green-100 dark:bg-blue-900/20 rounded-lg'>
                  <TrendingUp className='h-5 w-5 text-green-600 dark:text-green-400' />
                </div>
                <div>
                  <p className='text-sm text-theme-secondary'>총 등장 횟수</p>
                  <p className='text-2xl font-bold text-theme-primary'>
                    {totalStats.totalOccurrences}회
                  </p>
                </div>
              </div>
            </div>

            <div className='bg-theme-secondary rounded-lg p-4 shadow-sm'>
              <div className='flex items-center gap-3 mb-2'>
                <div className='p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg'>
                  <CheckCircle className='h-5 w-5 text-purple-600 dark:text-purple-400' />
                </div>
                <div>
                  <p className='text-sm text-theme-secondary'>설명된 단어</p>
                  <p className='text-2xl font-bold text-theme-primary'>
                    {totalStats.explainedWords}개
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 내보내기 버튼 */}
        <div className='bg-theme-secondary rounded-lg p-4 shadow-sm mb-6'>
          <h3 className='text-lg font-semibold text-theme-primary mb-3'>
            📊 데이터 내보내기
          </h3>
          <div className='flex flex-wrap gap-3'>
            <button
              onClick={downloadCSV}
              className='flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors'
            >
              <Download className='h-4 w-4' />
              CSV 다운로드
            </button>
            <button
              onClick={downloadExcel}
              className='flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors'
            >
              <FileSpreadsheet className='h-4 w-4' />
              Excel 다운로드
            </button>
            <button
              onClick={copyToClipboard}
              className='flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors'
            >
              <ExternalLink className='h-4 w-4' />
              클립보드 복사
            </button>
          </div>
          <p className='text-xs text-theme-secondary mt-2'>
            내보내기 데이터: 순번, 모르는 단어, 날짜, 맥락, 설명여부, 등장 횟수
            등
          </p>
        </div>

        {/* 검색 및 필터 */}
        <div className='bg-theme-secondary rounded-lg p-6 shadow-sm mb-6'>
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3'>
            <div className='sm:col-span-2'>
              <label className='block text-sm font-medium text-theme-primary mb-2'>
                <Search className='h-4 w-4 inline mr-2' />
                검색
              </label>
              <input
                type='text'
                placeholder='단어나 맥락으로 검색...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className='w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-theme-primary focus:border-transparent'
              />
            </div>

            <div>
              <label className='block text-sm font-medium text-theme-primary mb-2'>
                <Calendar className='h-4 w-4 inline mr-2' />
                년도
              </label>
              <Select
                value={String(selectedYear)}
                onChange={(v) => setSelectedYear(Number(v))}
                options={wordsYearOptions}
                variant='toolbar'
                triggerClassName='py-3 min-h-[3rem]'
                aria-label='년도'
              />
            </div>

            <div>
              <label className='block text-sm font-medium text-theme-primary mb-2'>
                <Calendar className='h-4 w-4 inline mr-2' />월
              </label>
              <Select
                value={String(selectedMonth)}
                onChange={(v) => setSelectedMonth(Number(v))}
                options={wordsMonthOptions}
                variant='toolbar'
                triggerClassName='py-3 min-h-[3rem]'
                aria-label='월'
              />
            </div>

            <div>
              <label className='block text-sm font-medium text-theme-primary mb-2'>
                <Filter className='h-4 w-4 inline mr-2' />
                상태
              </label>
              <Select
                value={filterStatus}
                onChange={(v) =>
                  setFilterStatus(v as "all" | "explained" | "unexplained")
                }
                options={wordsFilterStatusOptions}
                variant='toolbar'
                triggerClassName='py-3 min-h-[3rem]'
                aria-label='상태 필터'
              />
            </div>

            <div>
              <label className='block text-sm font-medium text-theme-primary mb-2'>
                <TrendingUp className='h-4 w-4 inline mr-2' />
                정렬
              </label>
              <Select
                value={sortBy}
                onChange={(v) =>
                  setSortBy(v as "count" | "word" | "firstAppearance")
                }
                options={wordsSortByOptions}
                variant='toolbar'
                triggerClassName='py-3 min-h-[3rem]'
                aria-label='정렬 기준'
              />
            </div>
          </div>

          <div className='mt-4 flex justify-center gap-3'>
            <button
              onClick={handleSearch}
              className='px-6 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary/80 transition-colors flex items-center gap-2'
            >
              <Search className='h-4 w-4' />
              검색
            </button>
            <button
              onClick={() =>
                setSortOrder(sortOrder === "desc" ? "asc" : "desc")
              }
              className='px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors'
            >
              {sortOrder === "desc" ? "내림차순" : "오름차순"}
            </button>
          </div>
        </div>

        {/* 월별 단어 목록 */}
        <div className='space-y-6'>
          {Array.from(filteredMonthlyStats.entries())
            .sort(([a], [b]) => b.localeCompare(a)) // 최신 월부터 정렬
            .map(([monthKey, monthData]) => (
              <div
                key={monthKey}
                className='bg-theme-secondary rounded-lg p-6 shadow-sm'
              >
                <div className='mb-4'>
                  <h2 className='text-xl font-semibold text-theme-primary mb-3'>
                    📅 {monthData.year}년 {monthData.month}월
                  </h2>
                  <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
                    <div className='text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg'>
                      <p className='text-sm text-theme-secondary'>총 단어</p>
                      <p className='text-lg font-bold text-blue-600'>
                        {monthData.totalWords}개
                      </p>
                    </div>
                    <div className='text-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg'>
                      <p className='text-sm text-theme-secondary'>총 등장</p>
                      <p className='text-lg font-bold text-green-600'>
                        {monthData.totalOccurrences}회
                      </p>
                    </div>
                    <div className='text-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg'>
                      <p className='text-sm text-theme-secondary'>
                        설명된 단어
                      </p>
                      <p className='text-lg font-bold text-purple-600'>
                        {monthData.explainedWords}개
                      </p>
                    </div>
                  </div>
                </div>

                {monthData.words.length === 0 ? (
                  <div className='text-center py-4'>
                    <p className='text-theme-secondary'>
                      이번 달에는 모르는 단어가 없습니다.
                    </p>
                  </div>
                ) : (
                  <div className='space-y-4'>
                    {monthData.words.map(
                      (word: WordAnalysis, index: number) => (
                        <div
                          key={word.word}
                          className='border border-gray-200 dark:border-gray-700 rounded-lg p-4'
                        >
                          <div className='mb-3'>
                            <div className='flex justify-between items-center mb-2'>
                              <div className='flex items-center gap-3'>
                                <span className='text-lg font-bold text-blue-600'>
                                  #{index + 1}
                                </span>
                                <h3 className='text-xl font-semibold text-theme-primary'>
                                  {word.word}
                                </h3>
                              </div>
                              <a
                                href={`https://ko.dict.naver.com/#/search?query=${encodeURIComponent(
                                  word.word
                                )}`}
                                target='_blank'
                                rel='noopener noreferrer'
                                className='px-3 py-1 bg-green-500 text-white text-xs rounded-lg hover:bg-green-600 transition-colors'
                              >
                                📖 네이버 사전
                              </a>
                            </div>
                            <div className='flex justify-between items-center text-sm text-theme-secondary'>
                              <div className='flex items-center gap-2'>
                                {word.explainedCount > 0 && (
                                  <span className='flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 rounded-full text-xs'>
                                    <CheckCircle className='h-3 w-3' />
                                    {word.explainedCount}회 설명됨
                                  </span>
                                )}
                                {word.unexplainedCount > 0 && (
                                  <span className='flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 rounded-full text-xs'>
                                    <XCircle className='h-3 w-3' />
                                    {word.unexplainedCount}회 미설명
                                  </span>
                                )}
                              </div>
                              <div className='text-right'>
                                <p className='text-lg font-bold text-theme-primary'>
                                  {word.count}회 총 등장
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-3'>
                            <div>
                              <h4 className='font-medium text-theme-primary mb-2 flex items-center gap-2'>
                                <Clock className='h-4 w-4' />
                                등장 기간
                              </h4>
                              <div className='text-sm text-theme-secondary'>
                                <p>
                                  첫 등장: {formatDate(word.firstAppearance)}
                                </p>
                                <p>마지막: {formatDate(word.lastAppearance)}</p>
                              </div>
                            </div>

                            <div>
                              <h4 className='font-medium text-theme-primary mb-2'>
                                📚 맥락
                              </h4>
                              <div className='space-y-1'>
                                {word.contexts
                                  .slice(0, 3)
                                  .map(
                                    (context: string, contextIndex: number) => (
                                      <p
                                        key={contextIndex}
                                        className='text-sm text-theme-secondary bg-gray-50 dark:bg-gray-800 p-2 rounded'
                                      >
                                        {context}
                                      </p>
                                    )
                                  )}
                                {word.contexts.length > 3 && (
                                  <p className='text-xs text-theme-secondary text-center'>
                                    ... 외 {word.contexts.length - 3}개 더
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            ))}
        </div>

        {/* 검색 결과가 없을 때 */}
        {filteredWords.length === 0 && wordAnalysis.length > 0 && (
          <div className='bg-theme-secondary rounded-lg p-6 shadow-sm text-center'>
            <BookMarked className='h-12 w-12 text-gray-400 mx-auto mb-4' />
            <p className='text-theme-secondary'>
              검색 조건에 맞는 단어가 없습니다.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
