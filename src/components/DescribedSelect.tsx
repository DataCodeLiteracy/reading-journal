"use client"

import Select, { type SelectOption } from "@/components/Select"

export type DescribedSelectOption<T extends string> = {
  value: T
  label: string
  hint: string
  description: string
}

function compactLine(label: string, hint: string): string {
  return `${label} — ${hint}`
}

type DescribedSelectProps<T extends string> = {
  value: T
  onChangeAction: (value: T) => void
  options: ReadonlyArray<DescribedSelectOption<T>>
  placeholder?: string
  disabled?: boolean
  id?: string
  "aria-label"?: string
}

export default function DescribedSelect<T extends string>({
  value,
  onChangeAction,
  options,
  placeholder = "선택 안 함",
  disabled = false,
  id,
  "aria-label": ariaLabel,
}: DescribedSelectProps<T>) {
  const selectOptions: SelectOption<T>[] = options.map((opt) => ({
    value: opt.value,
    label: opt.value === "none" ? opt.label : compactLine(opt.label, opt.hint),
  }))

  const selected = options.find((o) => o.value === value)
  const showHint = selected && selected.value !== "none"

  return (
    <div className='space-y-1.5'>
      <Select<T>
        id={id}
        value={value}
        onChangeAction={onChangeAction}
        options={selectOptions}
        placeholder={placeholder}
        disabled={disabled}
        variant='form-modal'
        truncate={false}
        aria-label={ariaLabel}
      />
      {showHint ? (
        <p className='text-xs leading-relaxed text-theme-secondary'>{selected.description}</p>
      ) : null}
    </div>
  )
}
