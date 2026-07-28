/**
 * 앱 전역 보호자↔자녀 연결입니다.
 * 문서 ID: `{guardian_user_id}__{child_user_id}`
 */
export interface GuardianChildLink {
  id: string
  guardian_user_id: string
  child_user_id: string
  child_display_name: string
  created_at?: Date
  updated_at?: Date
}

/** 읽어주기 세션 중 자녀 구성이 바뀌는 구간 스냅샷 */
export interface ReadAloudSegment {
  child_user_ids: string[]
  startTime: string
  endTime: string
}

export const DAILY_READ_ALOUD_GOAL_SECONDS = 15 * 60
