type Props = {
  name: string
  isOwner?: boolean
  className?: string
  nameClassName?: string
}

/** 멤버 이름 + 모임장 왕관 표식 */
export default function GroupMemberName({
  name,
  isOwner = false,
  className = "",
  nameClassName = "truncate font-medium text-theme-primary",
}: Props) {
  if (!isOwner) {
    return <span className={`${nameClassName} ${className}`.trim()}>{name}</span>
  }

  return (
    <span className={`relative inline-flex min-w-0 max-w-full items-center ${className}`}>
      <span className={nameClassName}>{name}</span>
      <span
        className="pointer-events-none absolute -right-1.5 -top-1 text-accent-theme"
        aria-hidden
        title="모임장"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
        </svg>
      </span>
      <span className="sr-only">모임장</span>
    </span>
  )
}
