export const FOCUS_LEVEL_LINK_COLLECTION = "focusLevelLink"

export type FocusLevelLink = {
  focusUserId: string
  focusEmail?: string
  activityId: string
  activityName: string
  linkedAt: string
  updatedAt?: string
}

export const FOCUS_LEVEL_SOURCE_APP = "reading-journal"
export const FOCUS_LEVEL_MIN_SYNC_SECONDS = 30
