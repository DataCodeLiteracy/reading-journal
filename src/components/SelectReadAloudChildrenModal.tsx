"use client"

import FormModalFrame from "@/components/FormModalFrame"
import type { GuardianChildLink } from "@/types/guardian"

type Props = {
  isOpen: boolean
  onClose: () => void
  childrenLinks: GuardianChildLink[]
  selectedChildIds: string[]
  onSelectedChildIdsChange: (ids: string[]) => void
  onConfirm: () => void
  /** mid-session: 적용 / start: 읽어주기 시작 */
  confirmLabel?: string
  isBusy?: boolean
}

export default function SelectReadAloudChildrenModal({
  isOpen,
  onClose,
  childrenLinks,
  selectedChildIds,
  onSelectedChildIdsChange,
  onConfirm,
  confirmLabel = "읽어주기 시작",
  isBusy = false,
}: Props) {
  const toggleChild = (childId: string) => {
    if (selectedChildIds.includes(childId)) {
      onSelectedChildIdsChange(selectedChildIds.filter((id) => id !== childId))
    } else {
      onSelectedChildIdsChange([...selectedChildIds, childId])
    }
  }

  return (
    <FormModalFrame
      isOpen={isOpen}
      onClose={onClose}
      title="읽어줄 자녀 선택"
      interactionLocked={isBusy}
    >
      <div className="space-y-4">
        <p className="text-xs text-theme-secondary">
          여러 명을 고를 수 있습니다. 선택한 자녀와 나에게 같은 시간이 기록됩니다.
        </p>
        <ul className="space-y-2">
          {childrenLinks.map((child) => {
            const checked = selectedChildIds.includes(child.child_user_id)
            return (
              <li key={child.id}>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-theme-primary">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleChild(child.child_user_id)}
                    className="h-4 w-4 accent-[var(--accent-theme)]"
                    disabled={isBusy}
                  />
                  {child.child_display_name}
                </label>
              </li>
            )
          })}
        </ul>
        <button
          type="button"
          onClick={onConfirm}
          disabled={selectedChildIds.length === 0 || isBusy}
          className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          {isBusy ? "확인 중..." : confirmLabel}
        </button>
      </div>
    </FormModalFrame>
  )
}
