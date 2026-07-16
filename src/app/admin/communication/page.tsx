"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Users,
  BookOpen,
  Hash,
  TrendingUp,
} from "lucide-react"
import { adminService } from "@/services/adminService"
import { useAuth } from "@/contexts/AuthContext"
import { GenericRouteSkeleton } from "@/components/skeletons"
import Select, { type SelectOption } from "@/components/Select"

interface CommunicationMoment {
  moment: string
  response: string
  keywords: string[]
  date: string
  childName: string
  bookTitle: string
}

export default function CommunicationPage() {
  const router = useRouter()
  const { user, userData, loading, isLoggedIn } = useAuth()
  const [communications, setCommunications] = useState<CommunicationMoment[]>(
    []
  )
  const [isLoading, setIsLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [filteredCommunications, setFilteredCommunications] = useState<
    CommunicationMoment[]
  >([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedKeyword, setSelectedKeyword] = useState<string>("")

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
      loadCommunicationData()
    }
  }, [selectedYear, selectedMonth, isLoggedIn, loading, user, router])

  useEffect(() => {
    filterCommunications()
  }, [communications, searchTerm, selectedKeyword])

  const loadCommunicationData = async () => {
    try {
      setIsLoading(true)
      const data = await adminService.getCommunicationAnalysis(
        selectedYear,
        selectedMonth
      )
      setCommunications(data)
    } catch (error) {
      console.error("Error loading communication data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const filterCommunications = () => {
    let filtered = communications

    if (searchTerm) {
      filtered = filtered.filter(
        (comm) =>
          comm.moment.toLowerCase().includes(searchTerm.toLowerCase()) ||
          comm.response.toLowerCase().includes(searchTerm.toLowerCase()) ||
          comm.childName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          comm.bookTitle.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (selectedKeyword) {
      filtered = filtered.filter((comm) =>
        comm.keywords.some((keyword) => keyword === selectedKeyword)
      )
    }

    setFilteredCommunications(filtered)
  }

  const changeMonth = (direction: "prev" | "next") => {
    if (direction === "prev") {
      if (selectedMonth === 1) {
        setSelectedYear(selectedYear - 1)
        setSelectedMonth(12)
      } else {
        setSelectedMonth(selectedMonth - 1)
      }
    } else {
      if (selectedMonth === 12) {
        setSelectedYear(selectedYear + 1)
        setSelectedMonth(1)
      } else {
        setSelectedMonth(selectedMonth + 1)
      }
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return `${date.getMonth() + 1}월 ${date.getDate()}일`
  }

  // 모든 키워드 추출
  const getAllKeywords = () => {
    const keywordSet = new Set<string>()
    communications.forEach((comm) => {
      comm.keywords.forEach((keyword) => keywordSet.add(keyword))
    })
    return Array.from(keywordSet).sort()
  }

  // 키워드별 통계
  const getKeywordStats = () => {
    const keywordCount = new Map<string, number>()
    communications.forEach((comm) => {
      comm.keywords.forEach((keyword) => {
        keywordCount.set(keyword, (keywordCount.get(keyword) || 0) + 1)
      })
    })

    return Array.from(keywordCount.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([keyword, count]) => ({ keyword, count }))
  }

  // 아이별 소통 통계
  const getChildStats = () => {
    const childCount = new Map<string, number>()
    communications.forEach((comm) => {
      childCount.set(comm.childName, (childCount.get(comm.childName) || 0) + 1)
    })

    return Array.from(childCount.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([child, count]) => ({ child, count }))
  }

  const allKeywords = useMemo(() => getAllKeywords(), [communications])
  const keywordSelectOptions = useMemo((): SelectOption<string>[] => {
    return [
      { value: "", label: "모든 키워드" },
      ...allKeywords.map((k) => ({ value: k, label: k })),
    ]
  }, [allKeywords])
  const keywordStats = getKeywordStats()
  const childStats = getChildStats()

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
        <span className="sr-only">소통 데이터를 불러오는 중</span>
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
            💬 소통 순간
          </h1>
          <p className='text-theme-secondary text-sm'>
            한달 단위 소통 순간 분석 결과
          </p>
        </header>

        {/* 월 선택기 */}
        <div className='bg-theme-secondary rounded-lg p-6 shadow-sm mb-6'>
          <div className='flex items-center justify-center gap-4'>
            <button
              onClick={() => changeMonth("prev")}
              className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors'
            >
              <ChevronLeft className='h-5 w-5' />
            </button>

            <div className='text-center'>
              <h2 className='text-2xl font-bold text-theme-primary'>
                {selectedYear}년 {selectedMonth}월
              </h2>
              <p className='text-sm text-theme-secondary'>
                {communications.length}개의 소통 순간
              </p>
            </div>

            <button
              onClick={() => changeMonth("next")}
              className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors'
            >
              <ChevronRight className='h-5 w-5' />
            </button>
          </div>
        </div>

        {/* 검색 및 필터 */}
        <div className='bg-theme-secondary rounded-lg p-6 shadow-sm mb-6'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-theme-primary mb-2'>
                🔍 검색
              </label>
              <input
                type='text'
                placeholder='소통 내용, 아이 이름, 책 제목으로 검색...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className='w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-theme-primary focus:border-transparent'
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-theme-primary mb-2'>
                🏷️ 키워드 필터
              </label>
              <Select
                value={selectedKeyword}
                onChangeAction={setSelectedKeyword}
                options={keywordSelectOptions}
                variant='toolbar'
                triggerClassName='py-3 min-h-[3rem]'
                aria-label='키워드 필터'
              />
            </div>
          </div>
        </div>

        {/* 통계 요약 */}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6'>
          <div className='bg-theme-secondary rounded-lg p-4 shadow-sm'>
            <div className='flex items-center gap-3 mb-2'>
              <div className='p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg'>
                <MessageSquare className='h-5 w-5 text-blue-600 dark:text-blue-400' />
              </div>
              <div>
                <p className='text-sm text-theme-secondary'>총 소통 순간</p>
                <p className='text-2xl font-bold text-theme-primary'>
                  {communications.length}개
                </p>
              </div>
            </div>
          </div>

          <div className='bg-theme-secondary rounded-lg p-4 shadow-sm'>
            <div className='flex items-center gap-3 mb-2'>
              <div className='p-2 bg-green-100 dark:bg-green-900/20 rounded-lg'>
                <Users className='h-5 w-5 text-green-600 dark:text-green-400' />
              </div>
              <div>
                <p className='text-sm text-theme-secondary'>참여 아이</p>
                <p className='text-2xl font-bold text-theme-primary'>
                  {childStats.length}명
                </p>
              </div>
            </div>
          </div>

          <div className='bg-theme-secondary rounded-lg p-4 shadow-sm'>
            <div className='flex items-center gap-3 mb-2'>
              <div className='p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg'>
                <Hash className='h-5 w-5 text-purple-600 dark:text-purple-400' />
              </div>
              <div>
                <p className='text-sm text-theme-secondary'>고유 키워드</p>
                <p className='text-2xl font-bold text-theme-primary'>
                  {allKeywords.length}개
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-6'>
          {/* 키워드 통계 */}
          <div className='bg-theme-secondary rounded-lg p-6 shadow-sm'>
            <h3 className='text-lg font-semibold text-theme-primary mb-4 flex items-center gap-2'>
              <TrendingUp className='h-5 w-5' />
              자주 나오는 키워드 TOP 10
            </h3>
            <div className='space-y-2'>
              {keywordStats.slice(0, 10).map((item, index) => (
                <div
                  key={item.keyword}
                  className='flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded-lg'
                >
                  <div className='flex items-center gap-2'>
                    <span className='text-sm font-medium text-gray-500'>
                      #{index + 1}
                    </span>
                    <span className='font-medium text-theme-primary'>
                      {item.keyword}
                    </span>
                  </div>
                  <span className='text-sm text-theme-secondary'>
                    {item.count}회
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 아이별 소통 통계 */}
          <div className='bg-theme-secondary rounded-lg p-6 shadow-sm'>
            <h3 className='text-lg font-semibold text-theme-primary mb-4 flex items-center gap-2'>
              <Users className='h-5 w-5' />
              아이별 소통 빈도
            </h3>
            <div className='space-y-2'>
              {childStats.map((item, index) => (
                <div
                  key={item.child}
                  className='flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded-lg'
                >
                  <div className='flex items-center gap-2'>
                    <span className='text-sm font-medium text-gray-500'>
                      #{index + 1}
                    </span>
                    <span className='font-medium text-theme-primary'>
                      {item.child}
                    </span>
                  </div>
                  <span className='text-sm text-theme-secondary'>
                    {item.count}회
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 소통 순간 목록 */}
        <div className='bg-theme-secondary rounded-lg p-6 shadow-sm'>
          <h3 className='text-lg font-semibold text-theme-primary mb-4'>
            💭 소통 순간 상세 목록 ({filteredCommunications.length}개)
          </h3>

          {filteredCommunications.length === 0 ? (
            <div className='text-center py-8'>
              <MessageSquare className='h-12 w-12 text-gray-400 mx-auto mb-4' />
              <p className='text-theme-secondary'>
                {communications.length === 0
                  ? "이번 달에는 소통 순간이 없습니다."
                  : "검색 결과가 없습니다."}
              </p>
            </div>
          ) : (
            <div className='space-y-4'>
              {filteredCommunications.map((comm, index) => (
                <div
                  key={index}
                  className='border border-gray-200 dark:border-gray-700 rounded-lg p-4'
                >
                  <div className='mb-3'>
                    <div className='flex justify-between items-center mb-2'>
                      <span className='font-medium text-theme-primary'>
                        {comm.childName}
                      </span>
                      <span className='text-sm text-theme-secondary'>
                        {formatDate(comm.date)}
                      </span>
                    </div>
                    <div className='text-sm text-theme-secondary pb-2 border-b border-gray-200 dark:border-gray-700'>
                      📖 {comm.bookTitle}
                    </div>
                  </div>

                  <div className='space-y-3'>
                    <div>
                      <h4 className='font-medium text-theme-primary mb-2'>
                        💬 소통 순간
                      </h4>
                      <p className='text-sm bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg'>
                        {comm.moment}
                      </p>
                    </div>

                    <div>
                      <h4 className='font-medium text-theme-primary mb-2'>
                        💭 반응/응답
                      </h4>
                      <p className='text-sm bg-green-50 dark:bg-green-900/20 p-3 rounded-lg'>
                        {comm.response}
                      </p>
                    </div>

                    <div>
                      <h4 className='font-medium text-theme-primary mb-2'>
                        🏷️ 키워드
                      </h4>
                      <div className='flex flex-wrap gap-2'>
                        {comm.keywords.map((keyword, keywordIndex) => (
                          <span
                            key={keywordIndex}
                            className='px-3 py-1 text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400 rounded-full'
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
