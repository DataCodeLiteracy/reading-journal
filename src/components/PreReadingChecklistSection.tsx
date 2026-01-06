"use client"

import { useState, useEffect } from "react"
import { ClipboardList } from "lucide-react"
import { UserChecklist } from "@/types/user"
import ChecklistModal from "@/components/ChecklistModal"
import { ChecklistService } from "@/services/checklistService"

interface PreReadingChecklistSectionProps {
  userUid: string
  onChecklistComplete?: () => void
}

/**
 * 독서 전 체크리스트 섹션 컴포넌트
 * 
 * 현재 서비스에서는 사용하지 않지만, 나중에 사용할 수 있도록 코드는 유지합니다.
 * 이 컴포넌트를 사용하려면 부모 컴포넌트에서 렌더링하면 됩니다.
 */
export default function PreReadingChecklistSection({
  userUid,
  onChecklistComplete,
}: PreReadingChecklistSectionProps) {
  const [userChecklist, setUserChecklist] = useState<UserChecklist | null>(null)
  const [preReadingChecklist, setPreReadingChecklist] = useState<any[]>([])
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false)
  const [showChecklistReminder, setShowChecklistReminder] = useState(false)

  useEffect(() => {
    if (!userUid) return

    const loadChecklistData = async () => {
      try {
        const checklistData = await ChecklistService.getUserChecklist(userUid)
        setUserChecklist(checklistData)

        try {
          const systemChecklist = await ChecklistService.getSystemChecklist(
            "pre-reading"
          )
          if (systemChecklist) {
            setPreReadingChecklist(systemChecklist.items)
          } else {
            setPreReadingChecklist(
              ChecklistService.getDefaultPreReadingChecklist()
            )
          }
        } catch (error) {
          console.error(
            "Failed to load system checklist, using default:",
            error
          )
          setPreReadingChecklist(
            ChecklistService.getDefaultPreReadingChecklist()
          )
        }
      } catch (error) {
        console.error("Error loading checklist data:", error)
      }
    }

    loadChecklistData()
  }, [userUid])

  const openChecklistModal = () => {
    setIsChecklistModalOpen(true)
  }

  const handleChecklistComplete = async () => {
    if (userUid) {
      await ChecklistService.markPreReadingCompleted(userUid)
      const updatedChecklist = await ChecklistService.getUserChecklist(userUid)
      setUserChecklist(updatedChecklist)
      onChecklistComplete?.()
    }
  }

  const isChecklistValid = ChecklistService.isPreReadingCheckValid(
    userChecklist
  )

  return (
    <>
      {/* 체크리스트 섹션 */}
      <div className='mb-4'>
        <button
          onClick={openChecklistModal}
          className={`w-full flex items-center justify-between py-3 px-4 rounded-lg transition-colors ${
            isChecklistValid
              ? "bg-emerald-500 hover:bg-emerald-600 text-white"
              : "bg-purple-500 hover:bg-purple-600 text-white"
          }`}
        >
          <div className='flex items-center gap-2'>
            <ClipboardList className='h-4 w-4' />
            <span className='text-sm font-medium'>
              {isChecklistValid ? "체크리스트 완료" : "체크리스트 확인"}
            </span>
          </div>
          {userChecklist?.lastPreReadingCheck && (
            <span className='text-xs text-white/80 font-medium'>
              {(() => {
                const lastCheckDate = ChecklistService.convertTimestampToDate(
                  userChecklist.lastPreReadingCheck
                )
                if (lastCheckDate) {
                  return lastCheckDate.toLocaleDateString("ko-KR", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                }
                return "시간 정보 없음"
              })()}
            </span>
          )}
        </button>
      </div>

      {/* 체크리스트 모달 */}
      <ChecklistModal
        isOpen={isChecklistModalOpen}
        onClose={() => setIsChecklistModalOpen(false)}
        onComplete={handleChecklistComplete}
        checklist={preReadingChecklist}
        title='독서 전 체크리스트'
        description='독서를 시작하기 전에 다음 항목들을 확인해주세요.'
      />

      {/* 체크리스트 리마인더 모달 */}
      {showChecklistReminder && (
        <ChecklistModal
          isOpen={showChecklistReminder}
          onClose={() => setShowChecklistReminder(false)}
          onComplete={() => {
            setShowChecklistReminder(false)
            setIsChecklistModalOpen(true)
          }}
          checklist={preReadingChecklist}
          title='독서 전 체크리스트'
          description='독서를 시작하기 전에 체크리스트를 확인해주세요.'
        />
      )}
    </>
  )
}

/**
 * 타이머 시작 전 체크리스트 검증 함수
 * 
 * 현재 서비스에서는 사용하지 않지만, 나중에 사용할 수 있도록 함수는 유지합니다.
 */
export function validatePreReadingChecklistBeforeTimer(
  userChecklist: UserChecklist | null
): { isValid: boolean; shouldShowReminder: boolean } {
  const isValid = ChecklistService.isPreReadingCheckValid(userChecklist)
  return {
    isValid,
    shouldShowReminder: !isValid,
  }
}

