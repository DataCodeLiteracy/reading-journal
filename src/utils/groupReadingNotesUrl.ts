import type { GroupReadingNoteType } from "@/types/readingGroup"

export function groupReadingNotesPath(
  groupId: string,
  params?: {
    book?: string
    meeting?: string
    member?: string
    type?: GroupReadingNoteType
  },
): string {
  const search = new URLSearchParams()
  if (params?.book) search.set("book", params.book)
  if (params?.meeting) search.set("meeting", params.meeting)
  if (params?.member) search.set("member", params.member)
  if (params?.type) search.set("type", params.type)
  const query = search.toString()
  return `/groups/${groupId}/reading-notes${query ? `?${query}` : ""}`
}
