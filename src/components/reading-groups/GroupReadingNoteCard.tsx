"use client"

import { useState } from "react"
import Link from "next/link"
import { Lock } from "lucide-react"
import FormModalFrame from "@/components/FormModalFrame"
import GroupMemberName from "@/components/reading-groups/GroupMemberName"
import {
  GROUP_READING_NOTE_TYPE_BADGE,
  GROUP_READING_NOTE_TYPE_LABEL,
} from "@/lib/groupReadingNotesConstants"
import type { GroupReadingNoteItemDto } from "@/lib/groupReadingNotesAdmin"
import type { GroupMember } from "@/types/readingGroup"

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeZone: "Asia/Seoul",
  }).format(date)
}

type Props = {
  item: GroupReadingNoteItemDto
  member?: GroupMember
  viewerUserId?: string
  showBookTitle?: boolean
}

export default function GroupReadingNoteCard({
  item,
  member,
  viewerUserId,
  showBookTitle = true,
}: Props) {
  const [detailOpen, setDetailOpen] = useState(false)
  const isOwn = Boolean(viewerUserId && item.userId === viewerUserId)

  return (
    <li className="rounded-lg border border-theme-tertiary bg-theme-tertiary/40 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${GROUP_READING_NOTE_TYPE_BADGE[item.recordType]}`}
        >
          {GROUP_READING_NOTE_TYPE_LABEL[item.recordType]}
        </span>
        {!item.isPublic ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-theme-secondary px-2 py-0.5 text-[11px] text-theme-secondary">
            <Lock className="h-3 w-3" aria-hidden />
            나만 보기
          </span>
        ) : null}
        <span className="text-xs text-theme-secondary">
          {formatDate(item.createdAt)}
        </span>
      </div>
      <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        {member ? (
          <GroupMemberName
            name={item.displayName}
            isOwner={member.role === "owner"}
            className="font-medium text-theme-primary"
          />
        ) : (
          <span className="font-medium text-theme-primary">{item.displayName}</span>
        )}
        {showBookTitle ? (
          <>
            <span className="text-theme-tertiary">·</span>
            <span className="truncate text-theme-secondary">{item.bookTitle}</span>
          </>
        ) : null}
      </div>
      {isOwn ? (
        <Link
          href={item.detailHref}
          className="group block rounded-md transition-colors hover:bg-theme-secondary/60"
        >
          <p className="line-clamp-3 whitespace-pre-wrap text-sm leading-relaxed text-theme-primary">
            {item.excerpt}
          </p>
          <span className="mt-1 inline-block text-xs font-medium text-accent-theme group-hover:underline">
            자세히 보기
          </span>
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => setDetailOpen(true)}
          className="group block w-full rounded-md text-left transition-colors hover:bg-theme-secondary/60"
        >
          <p className="line-clamp-3 whitespace-pre-wrap text-sm leading-relaxed text-theme-primary">
            {item.excerpt}
          </p>
          <span className="mt-1 inline-block text-xs font-medium text-accent-theme group-hover:underline">
            자세히 보기
          </span>
        </button>
      )}

      <FormModalFrame
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={item.title || GROUP_READING_NOTE_TYPE_LABEL[item.recordType]}
        size="wide"
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${GROUP_READING_NOTE_TYPE_BADGE[item.recordType]}`}
            >
              {GROUP_READING_NOTE_TYPE_LABEL[item.recordType]}
            </span>
            {!item.isPublic ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-theme-secondary px-2 py-0.5 text-[11px] text-theme-secondary">
                <Lock className="h-3 w-3" aria-hidden />
                나만 보기
              </span>
            ) : null}
            <span className="text-xs text-theme-secondary">
              {formatDate(item.createdAt)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            {member ? (
              <GroupMemberName
                name={item.displayName}
                isOwner={member.role === "owner"}
                className="font-medium text-theme-primary"
              />
            ) : (
              <span className="font-medium text-theme-primary">
                {item.displayName}
              </span>
            )}
            <span className="text-theme-tertiary">·</span>
            <span className="text-theme-secondary">{item.bookTitle}</span>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-theme-primary">
            {item.excerpt}
          </p>
        </div>
      </FormModalFrame>
    </li>
  )
}
