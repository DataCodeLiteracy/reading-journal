"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  ClipboardList,
  Lightbulb,
  BookOpen,
  CheckCircle,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { UserChecklist } from "@/types/user"
import ChecklistModal from "@/components/ChecklistModal"
import { ChecklistService } from "@/services/checklistService"
import { GenericRouteSkeleton } from "@/components/skeletons"

export default function ChecklistsPage() {
  const router = useRouter()
  const { user, loading, isLoggedIn, userUid } = useAuth()

  // 체크리스트 관련 상태
  const [userChecklist, setUserChecklist] = useState<UserChecklist | null>(null)
  const [longTermChecklist, setLongTermChecklist] = useState<any[]>([])
  const [preReadingChecklist, setPreReadingChecklist] = useState<any[]>([])
  const [isLongTermModalOpen, setIsLongTermModalOpen] = useState(false)
  const [isPreReadingModalOpen, setIsPreReadingModalOpen] = useState(false)

  // 체크리스트 데이터 로드
  useEffect(() => {
    if (!isLoggedIn || !userUid) return

    const loadChecklistData = async () => {
      try {
        // 사용자 체크리스트 데이터 로드
        const checklistData = await ChecklistService.getUserChecklist(userUid)
        setUserChecklist(checklistData)

        // 장기 체크리스트 로드
        const systemLongTermChecklist =
          await ChecklistService.getSystemChecklist("long-term")
        if (systemLongTermChecklist) {
          setLongTermChecklist(systemLongTermChecklist.items)
        } else {
          setLongTermChecklist(ChecklistService.getDefaultLongTermChecklist())
        }

        // 독서 전 체크리스트 로드
        const systemPreReadingChecklist =
          await ChecklistService.getSystemChecklist("pre-reading")
        if (systemPreReadingChecklist) {
          setPreReadingChecklist(systemPreReadingChecklist.items)
        } else {
          setPreReadingChecklist(
            ChecklistService.getDefaultPreReadingChecklist()
          )
        }
      } catch (error) {
        console.error("Failed to load checklist data:", error)
        setLongTermChecklist(ChecklistService.getDefaultLongTermChecklist())
        setPreReadingChecklist(ChecklistService.getDefaultPreReadingChecklist())
      }
    }

    loadChecklistData()
  }, [isLoggedIn, userUid])

  const openLongTermModal = () => {
    setIsLongTermModalOpen(true)
  }

  const openPreReadingModal = () => {
    setIsPreReadingModalOpen(true)
  }

  const handleLongTermComplete = async () => {
    if (userUid) {
      // 장기 체크리스트는 단순히 확인용이므로 별도 처리 없음
      const updatedChecklist = await ChecklistService.getUserChecklist(userUid)
      setUserChecklist(updatedChecklist)
    }
  }

  const handlePreReadingComplete = async () => {
    if (userUid) {
      await ChecklistService.markPreReadingCompleted(userUid)
      const updatedChecklist = await ChecklistService.getUserChecklist(userUid)
      setUserChecklist(updatedChecklist)
    }
  }

  if (loading) {
    return <GenericRouteSkeleton rows={5} />
  }

  if (!isLoggedIn) {
    return null
  }

  return (
    <div className='min-h-screen bg-theme-gradient'>
      <div className='container mx-auto px-4 py-6'>
        <header className='mb-6'>
          <button
            onClick={() => router.push("/mypage")}
            className='flex items-center gap-2 text-theme-secondary hover:text-theme-primary mb-4 transition-colors'
          >
            <ArrowLeft className='h-5 w-5' />
            마이페이지로 돌아가기
          </button>
          <h1 className='text-3xl font-bold text-theme-primary mb-2'>
            📋 체크리스트
          </h1>
          <p className='text-theme-secondary text-sm'>
            독서와 관련된 체크리스트를 확인해보세요
          </p>
        </header>

        {/* 체크리스트 카드들 */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-6'>
          {/* 장기 체크리스트 */}
          <button
            onClick={openLongTermModal}
            className='bg-theme-secondary rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow text-left'
          >
            <div className='flex items-center gap-4 mb-3'>
              <div className='p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg'>
                <Lightbulb className='h-6 w-6 text-orange-600 dark:text-orange-400' />
              </div>
              <div>
                <h3 className='text-lg font-semibold text-theme-primary mb-1'>
                  장기 체크리스트
                </h3>
                <p className='text-sm text-theme-secondary'>
                  부모로서의 마음가짐과 지속성
                </p>
              </div>
            </div>
            <p className='text-xs text-theme-tertiary'>
              독서 습관을 기르기 위한 장기적인 관점의 체크리스트입니다.
            </p>
          </button>

          {/* 독서 전 체크리스트 */}
          <button
            onClick={openPreReadingModal}
            className='bg-theme-secondary rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow text-left'
          >
            <div className='flex items-center gap-4 mb-3'>
              <div className='p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg'>
                <BookOpen className='h-6 w-6 text-blue-600 dark:text-blue-400' />
              </div>
              <div>
                <h3 className='text-lg font-semibold text-theme-primary mb-1'>
                  독서 전 체크리스트
                </h3>
                <p className='text-sm text-theme-secondary'>
                  독서 시작 전 확인사항
                </p>
              </div>
            </div>
            <div className='flex items-center gap-2'>
              <CheckCircle className='h-4 w-4 text-green-500' />
              <p className='text-xs text-theme-tertiary'>
                {ChecklistService.isPreReadingCheckValid(userChecklist)
                  ? "오늘 체크리스트 완료됨"
                  : "오늘 체크리스트 미완료"}
              </p>
            </div>
          </button>
        </div>

        {/* 체크리스트 상태 요약 */}
        <div className='bg-theme-secondary rounded-lg p-4 shadow-sm'>
          <h3 className='text-lg font-semibold text-theme-primary mb-3'>
            체크리스트 상태
          </h3>
          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <span className='text-sm text-theme-secondary'>
                독서 전 체크리스트
              </span>
              <span
                className={`text-sm font-medium ${
                  ChecklistService.isPreReadingCheckValid(userChecklist)
                    ? "text-green-600 dark:text-green-400"
                    : "text-orange-600 dark:text-orange-400"
                }`}
              >
                {ChecklistService.isPreReadingCheckValid(userChecklist)
                  ? "완료"
                  : "미완료"}
              </span>
            </div>
            {userChecklist?.lastPreReadingCheck && (
              <div className='text-xs text-theme-tertiary'>
                마지막 확인:{" "}
                {(() => {
                  const lastCheckDate = ChecklistService.convertTimestampToDate(
                    userChecklist.lastPreReadingCheck
                  )
                  if (lastCheckDate) {
                    return lastCheckDate.toLocaleDateString("ko-KR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  }
                  return "시간 정보 없음"
                })()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 장기 체크리스트 모달 */}
      <ChecklistModal
        isOpen={isLongTermModalOpen}
        onClose={() => setIsLongTermModalOpen(false)}
        onComplete={handleLongTermComplete}
        checklist={longTermChecklist}
        title='장기 체크리스트'
        description='부모로서의 마음가짐과 지속성을 위한 체크리스트입니다.'
        isLongTerm={true}
      />

      {/* 독서 전 체크리스트 모달 */}
      <ChecklistModal
        isOpen={isPreReadingModalOpen}
        onClose={() => setIsPreReadingModalOpen(false)}
        onComplete={handlePreReadingComplete}
        checklist={preReadingChecklist}
        title='독서 전 체크리스트'
        description='독서를 시작하기 전에 다음 항목들을 확인해주세요.'
        isLongTerm={false}
      />
    </div>
  )
}
