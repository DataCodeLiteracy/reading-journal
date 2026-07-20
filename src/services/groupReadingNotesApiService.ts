import { getClientIdToken } from "@/lib/getClientIdToken"
import type { GroupReadingNoteItemDto } from "@/lib/groupReadingNotesAdmin"
import type { GroupReadingNotesSort } from "@/lib/groupReadingNotesAdmin"
import type { GroupReadingNoteType } from "@/types/readingGroup"

export type GroupReadingNotesPageResponse = {
  items: GroupReadingNoteItemDto[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type GroupReadingNotesPreviewResponse = {
  sections: Record<GroupReadingNoteType, GroupReadingNoteItemDto[]>
  totals: Record<GroupReadingNoteType, number>
}

export type GroupReadingNotesFilters = {
  meetingId?: string
  groupBookId?: string
  memberUserId?: string
}

async function authorizedFetch<T>(path: string): Promise<T> {
  const idToken = await getClientIdToken()
  const response = await fetch(path, {
    headers: { Authorization: `Bearer ${idToken}` },
    cache: "no-store",
  })
  const result = (await response.json()) as T & { error?: string }
  if (!response.ok) {
    throw new Error(result.error ?? "독서 노트를 불러오지 못했습니다.")
  }
  return result
}

function buildQuery(
  filters: GroupReadingNotesFilters | undefined,
  extra?: Record<string, string | number | undefined>,
) {
  const params = new URLSearchParams()
  if (filters?.meetingId) params.set("meeting", filters.meetingId)
  if (filters?.groupBookId) params.set("book", filters.groupBookId)
  if (filters?.memberUserId) params.set("member", filters.memberUserId)
  if (extra) {
    Object.entries(extra).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        params.set(key, String(value))
      }
    })
  }
  return params.toString()
}

export class GroupReadingNotesApiService {
  static fetchPreview(
    groupId: string,
    filters?: GroupReadingNotesFilters,
  ): Promise<GroupReadingNotesPreviewResponse> {
    const query = buildQuery(filters)
    return authorizedFetch(
      `/api/groups/${encodeURIComponent(groupId)}/reading-notes/preview${query ? `?${query}` : ""}`,
    )
  }

  static fetchPage(
    groupId: string,
    input: {
      recordType: GroupReadingNoteType
      page?: number
      pageSize?: number
      filters?: GroupReadingNotesFilters
      sort?: GroupReadingNotesSort
    },
  ): Promise<GroupReadingNotesPageResponse> {
    const query = buildQuery(input.filters, {
      type: input.recordType,
      page: input.page ?? 1,
      pageSize: input.pageSize,
      sort: input.sort ?? "newest",
    })
    return authorizedFetch(
      `/api/groups/${encodeURIComponent(groupId)}/reading-notes?${query}`,
    )
  }
}
