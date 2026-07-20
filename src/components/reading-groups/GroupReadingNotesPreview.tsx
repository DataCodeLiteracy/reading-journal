"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { NotebookPen } from "lucide-react"
import GroupReadingNoteCard from "@/components/reading-groups/GroupReadingNoteCard"
import {
  GROUP_READING_NOTE_TYPE_LABEL,
  GROUP_READING_NOTE_TYPES,
} from "@/lib/groupReadingNotesConstants"
import { queryKeys } from "@/lib/queryKeys"
import { GroupReadingNotesApiService } from "@/services/groupReadingNotesApiService"
import type { GroupMember, GroupReadingNoteType } from "@/types/readingGroup"
import { groupReadingNotesPath } from "@/utils/groupReadingNotesUrl"

type Props = {
  groupId: string
  members: GroupMember[]
  viewerUserId: string
  meetingId?: string
  groupBookId?: string
  memberUserId?: string
}

export default function GroupReadingNotesPreview({
  groupId,
  members,
  viewerUserId,
  meetingId,
  groupBookId,
  memberUserId,
}: Props) {
  const filters = {
    meetingId: meetingId || undefined,
    groupBookId: groupBookId || undefined,
    memberUserId: memberUserId || undefined,
  }
  const filterKey = [
    filters.meetingId ?? "",
    filters.groupBookId ?? "",
    filters.memberUserId ?? "",
  ].join(":")

  const previewQuery = useQuery({
    queryKey: queryKeys.readingGroups.readingNotesPreview(groupId, filterKey),
    queryFn: () => GroupReadingNotesApiService.fetchPreview(groupId, filters),
  })

  const activeMembers = members.filter(
    (member) => member.status === "active" && member.user_id,
  )

  const moreHref = (type: GroupReadingNoteType) =>
    groupReadingNotesPath(groupId, {
      type,
      meeting: meetingId,
      book: groupBookId,
      member: memberUserId,
    })

  return (
    <section
      className="rounded-xl bg-theme-tertiary p-4 sm:p-5"
      aria-labelledby="reading-notes-preview-heading"
    >
      <div className="mb-4 flex items-start gap-2">
        <NotebookPen
          className="mt-0.5 h-5 w-5 shrink-0 text-accent-theme"
          aria-hidden
        />
        <div>
          <h2
            id="reading-notes-preview-heading"
            className="font-semibold text-theme-primary"
          >
            독서 노트
          </h2>
          <p className="mt-1 text-xs text-theme-secondary">
            모임원이 같은 책에 남긴 구절·질문·리뷰·서평을 함께 볼 수 있어요.
          </p>
        </div>
      </div>

      {previewQuery.isLoading ? (
        <p className="rounded-lg border border-dashed border-theme-tertiary p-5 text-center text-sm text-theme-secondary">
          독서 노트를 불러오는 중…
        </p>
      ) : previewQuery.isError ? (
        <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          독서 노트를 불러오지 못했습니다.
        </p>
      ) : (
        <div className="space-y-5">
          {GROUP_READING_NOTE_TYPES.map((recordType) => {
            const items = previewQuery.data?.sections[recordType] ?? []
            const total = previewQuery.data?.totals[recordType] ?? 0
            const label = GROUP_READING_NOTE_TYPE_LABEL[recordType]
            return (
              <div key={recordType}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-theme-primary">
                    {label}
                    <span className="ml-1.5 text-xs font-normal text-theme-secondary">
                      {total}건
                    </span>
                  </h3>
                  {total > 0 ? (
                    <Link
                      href={moreHref(recordType)}
                      className="shrink-0 text-xs font-semibold text-accent-theme hover:underline"
                    >
                      더보기
                    </Link>
                  ) : null}
                </div>
                {items.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-theme-tertiary px-4 py-3 text-center text-xs text-theme-secondary">
                    아직 {label} 기록이 없습니다.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {items.map((item) => (
                      <GroupReadingNoteCard
                        key={item.id}
                        item={item}
                        viewerUserId={viewerUserId}
                        member={activeMembers.find(
                          (member) => member.user_id === item.userId,
                        )}
                      />
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
