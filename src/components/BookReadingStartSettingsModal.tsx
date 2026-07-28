"use client"

import FormModalFrame from "@/components/FormModalFrame"

type Props = {
  isOpen: boolean
  onClose: () => void
  showReadAloudToggle: boolean
  preReadPromptEnabled: boolean
  readAloudEnabled: boolean
  dismissedToday: boolean
  onPreReadPromptEnabledChange: (enabled: boolean) => void
  onReadAloudEnabledChange: (enabled: boolean) => void
  onDismissedTodayChange: (dismissed: boolean) => void
  busy?: boolean
}

function ToggleRow({
  id,
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  id: string
  label: string
  description: string
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-theme-tertiary bg-theme-tertiary/30 px-3 py-3">
      <div className="min-w-0">
        <label htmlFor={id} className="block text-sm font-semibold text-theme-primary">
          {label}
        </label>
        <p className="mt-0.5 text-xs text-theme-secondary">{description}</p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
          checked ? "bg-accent-theme" : "bg-theme-tertiary"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  )
}

export default function BookReadingStartSettingsModal({
  isOpen,
  onClose,
  showReadAloudToggle,
  preReadPromptEnabled,
  readAloudEnabled,
  dismissedToday,
  onPreReadPromptEnabledChange,
  onReadAloudEnabledChange,
  onDismissedTodayChange,
  busy = false,
}: Props) {
  return (
    <FormModalFrame
      isOpen={isOpen}
      onClose={onClose}
      title="읽기 시작 설정"
      interactionLocked={busy}
    >
      <div className="space-y-3">
        <ToggleRow
          id="timer-preread-toggle"
          label="읽기 준비 메모"
          description="켜면 메모가 비어 있을 때 시작 전 안내가 나옵니다."
          checked={preReadPromptEnabled}
          onChange={onPreReadPromptEnabledChange}
          disabled={busy}
        />
        {showReadAloudToggle ? (
          <ToggleRow
            id="timer-readaloud-toggle"
            label="자녀 읽어주기"
            description="끄면 이 책은 읽어주기 선택 없이 타이머만 시작합니다."
            checked={readAloudEnabled}
            onChange={onReadAloudEnabledChange}
            disabled={busy}
          />
        ) : null}
        <ToggleRow
          id="timer-dismiss-today-toggle"
          label="오늘은 그만보기"
          description="켜져 있으면 오늘 이 책의 읽기 시작 안내를 숨깁니다. 끄면 다시 뜹니다."
          checked={dismissedToday}
          onChange={onDismissedTodayChange}
          disabled={busy}
        />
      </div>
    </FormModalFrame>
  )
}
