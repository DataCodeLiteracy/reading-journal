"use client"

import { useState, useEffect } from "react"
import { Lightbulb, ClipboardList } from "lucide-react"
import { UserChecklist } from "@/types/user"
import ChecklistModal from "@/components/ChecklistModal"
import { ChecklistService } from "@/services/checklistService"

interface LongTermChecklistSectionProps {
  userUid: string
  onChecklistComplete?: () => void
}

/**
 * 장기 체크리스트 섹션 컴포넌트
 * 
 * 현재 서비스에서는 사용하지 않지만, 나중에 사용할 수 있도록 코드는 유지합니다.
 * 이 컴포넌트를 사용하려면 부모 컴포넌트에서 렌더링하면 됩니다.
 */
export default function LongTermChecklistSection({
  userUid,
  onChecklistComplete,
}: LongTermChecklistSectionProps) {
  const [userChecklist, setUserChecklist] = useState<UserChecklist | null>(null)
  const [longTermChecklist, setLongTermChecklist] = useState<any[]>([])
  const [isLongTermModalOpen, setIsLongTermModalOpen] = useState(false)

  useEffect(() => {
    if (!userUid) return

    const loadChecklistData = async () => {
      try {
        const checklistData = await ChecklistService.getUserChecklist(userUid)
        setUserChecklist(checklistData)

        try {
          const systemLongTermChecklist =
            await ChecklistService.getSystemChecklist("long-term")
          if (systemLongTermChecklist) {
            setLongTermChecklist(systemLongTermChecklist.items)
          } else {
            setLongTermChecklist(ChecklistService.getDefaultLongTermChecklist())
          }
        } catch (error) {
          console.error(
            "Failed to load system checklist, using default:",
            error
          )
          setLongTermChecklist(ChecklistService.getDefaultLongTermChecklist())
        }
      } catch (error) {
        console.error("Error loading checklist data:", error)
      }
    }

    loadChecklistData()
  }, [userUid])

  const openLongTermModal = () => {
    setIsLongTermModalOpen(true)
  }

  const handleLongTermComplete = async () => {
    if (userUid) {
      // 장기 체크리스트는 단순히 확인용이므로 별도 처리 없음
      const updatedChecklist = await ChecklistService.getUserChecklist(userUid)
      setUserChecklist(updatedChecklist)
      onChecklistComplete?.()
    }
  }

  return (
    <>
      {/* 장기 체크리스트 섹션 */}
      <div className='mb-6 bg-theme-secondary rounded-lg p-6 shadow-sm'>
        <div className='flex items-center gap-4 mb-4'>
          <div className='p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg'>
            <Lightbulb className='h-6 w-6 text-orange-600 dark:text-orange-400' />
          </div>
          <div className='flex-1'>
            <h3 className='text-lg font-semibold text-theme-primary mb-1'>
              장기 체크리스트
            </h3>
            <p className='text-sm text-theme-secondary'>
              부모로서의 마음가짐과 지속성
            </p>
          </div>
        </div>
        <button
          onClick={openLongTermModal}
          className='w-full flex items-center justify-center gap-2 py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors'
        >
          <ClipboardList className='h-4 w-4' />
          <span>장기 체크리스트 확인</span>
        </button>
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
    </>
  )
}

