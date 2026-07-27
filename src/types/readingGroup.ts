import type { BookLevel } from "@/types/book"

export type GroupMemberRole = "owner" | "member"
/** 권한(role)과 별개로, 직접 읽는 참여자인지 보호자인지 구분합니다. */
export type GroupMemberKind = "participant" | "guardian"
export type GroupMemberStatus = "active" | "invited"
export type ReadingGroupStatus = "active" | "paused" | "archived"
export type GroupBookStatus =
  | "planned"
  | "on_hold"
  | "reading"
  | "reading_paused"
  | "completed"
  | "paused"
export type GroupMeetingStatus =
  | "draft"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled"
/** 저장 상태와 별개로 현재 시각과 독서 기간에서 계산한 화면 표시 단계입니다. */
export type GroupMeetingPhase =
  | "scheduled"
  | "in_progress"
  | "awaiting_completion"
  | "completed"
  | "cancelled"
export type GroupPostType =
  | "announcement"
  | "group_rule"
  | "reading_method"
  | "discussion_rule"
  | "member_post"
export type GroupRecordShareType = "quote" | "critique" | "review"

interface ReadingGroupDocument {
  id: string
  created_at?: Date
  updated_at?: Date
}

export interface ReadingGroup extends ReadingGroupDocument {
  name: string
  description?: string
  owner_user_id: string
  invite_code: string
  status: ReadingGroupStatus
  audience_levels: BookLevel[]
  visibility: "private" | "public"
  join_mode: "invite_code"
  time_zone: string
  default_weekday?: number
  default_time?: string
  default_location?: string
}

export interface GroupMember extends ReadingGroupDocument {
  group_id: string
  /** null이면 계정에 연결되지 않은 오프라인 멤버입니다. */
  user_id: string | null
  display_name: string
  role: GroupMemberRole
  /**
   * 참여자: 직접 읽는 모임원.
   * 보호자: 학부모 등 함께 보지만 직접 읽지 않는 역할.
   * 없으면 참여자로 취급합니다.
   */
  member_kind?: GroupMemberKind
  /**
   * 보호자가 읽어주는 대상(자녀) 계정 user_id.
   * 타이머 귀속·서재 동기화 시 보호자와 함께 반영됩니다.
   */
  reads_for_user_id?: string | null
  status: GroupMemberStatus
  joined_at?: string
  invited_at?: string
}

export interface GroupBook extends ReadingGroupDocument {
  group_id: string
  canonical_book_id: string
  book_id?: string
  title: string
  author?: string
  cover_url?: string
  start_date?: string
  end_date?: string
  status: GroupBookStatus
  order?: number
  selected_reason?: string
}

export interface GroupMeeting extends ReadingGroupDocument {
  group_id: string
  sequence: number
  title: string
  scheduled_at: string
  ended_at?: string
  location?: string
  status: GroupMeetingStatus
  agenda?: string
  facilitator_member_id?: string
  notes?: string
}

export interface MeetingBookAssignment extends ReadingGroupDocument {
  group_id: string
  meeting_id: string
  group_book_id: string
  canonical_book_id: string
  reading_start_at: string
  reading_end_at: string
  reading_range: string
  /** 중단 시점 스냅샷입니다. 기존 귀속의 [start, end) 경계는 변경하지 않습니다. */
  stopped_at?: string
  completed_at?: string
  book_title_snapshot?: string
  book_author_snapshot?: string
  book_cover_url_snapshot?: string
  start_page?: number
  end_page?: number
  chapters?: string[]
  notes?: string
}

/**
 * 회차 공식 배정과 별개로, 멤버가 추천한 «함께 보면 좋은 책»입니다.
 * 같은 회차에 같은 판본을 여러 명이 추천할 수 있습니다.
 */
export interface MeetingBookRecommendation extends ReadingGroupDocument {
  group_id: string
  meeting_id: string
  canonical_book_id: string
  title: string
  author?: string
  cover_url?: string
  recommended_by_user_id: string
  recommended_by_display_name: string
  note?: string
}

export interface MeetingRecord extends ReadingGroupDocument {
  group_id: string
  meeting_id: string
  recorded_by_user_id: string
  attendee_member_ids: string[]
  summary: string
  discussion_notes?: string
  decisions?: string[]
  next_actions?: string[]
  completed_at?: string
}

export interface GroupPost extends ReadingGroupDocument {
  group_id: string
  author_user_id: string
  author_display_name: string
  type: GroupPostType
  title: string
  content: string
  is_pinned: boolean
  version?: number
  published_at?: string
}

export interface GroupPostComment extends ReadingGroupDocument {
  group_id: string
  post_id: string
  author_user_id: string
  author_display_name: string
  content: string
}

export interface GroupRecordShare extends ReadingGroupDocument {
  group_id: string
  shared_by_user_id: string
  record_type: GroupRecordShareType
  record_id: string
  /** 그룹 안에서 원본 공개 여부와 무관하게 표시하는 공유 시점 스냅샷입니다. */
  shared_by_display_name: string
  book_title: string
  record_title?: string
  record_excerpt: string
  canonical_book_id?: string
  group_book_id?: string
  meeting_id?: string
  shared_at: string
  note?: string
}

export interface GroupReadingAttribution extends ReadingGroupDocument {
  group_id: string
  reading_session_id: string
  user_id: string
  user_display_name: string
  group_book_id: string
  meeting_id: string
  meeting_book_assignment_id: string
  canonical_book_id: string
  session_start_at: string
  session_end_at: string
  counted_seconds: number
  attributed_at: string
}

/** 인증된 비회원에게도 노출할 수 있도록 서버에서 허용 필드만 구성한 타입입니다. */
export interface BrowsableReadingGroup {
  id: string
  name: string
  description?: string
  /** 목록은 active/paused만 반환하며, 기존 회원의 archived 상세 판별에만 archived가 올 수 있습니다. */
  status: ReadingGroupStatus
  audience_levels: BookLevel[]
  time_zone: string
  default_weekday?: number
  default_time?: string
  default_location?: string
  active_member_count: number
  is_member: boolean
  /** 완료·취소되지 않은 진행(또는 예정) 회차 요약입니다. */
  current_meeting?: GroupCurrentMeetingSummary
}

/** 목록 카드용 현재 회차 요약 */
export interface GroupCurrentMeetingSummary {
  sequence: number
  title: string
  /** 회차 종료 시각(`ended_at`, 없으면 `scheduled_at`) */
  ends_at: string
}

export interface BrowsableGroupBook {
  id: string
  canonical_book_id: string
  title: string
  author?: string
  cover_url?: string
  start_date?: string
  end_date?: string
  status: GroupBookStatus
  order?: number
  selected_reason?: string
  notes?: string
}

export interface BrowsableGroupMeeting {
  id: string
  sequence: number
  title: string
  scheduled_at?: string
  ended_at?: string
  location?: string
  status: GroupMeetingStatus
  agenda?: string
}

/** 모임 책에 연결된 개인 독서 기록 (구절·질문·리뷰·서평) */
export type GroupReadingNoteType = "quote" | "question" | "review" | "critique"

export interface GroupReadingNoteItem {
  id: string
  recordType: GroupReadingNoteType
  /** 카드 배지 문구 — 구절/질문은 세부 유형, 없으면 기록 유형명 */
  badgeLabel: string
  userId: string
  displayName: string
  groupBookId: string
  canonicalBookId: string
  bookTitle: string
  personalBookId: string
  meetingId?: string
  title: string
  excerpt: string
  isPublic: boolean
  createdAt: Date
  detailHref: string
}

export interface BrowsableMeetingBookAssignment {
  id: string
  meeting_id: string
  group_book_id: string
  canonical_book_id: string
  reading_start_at?: string
  reading_end_at?: string
  reading_range: string
  stopped_at?: string
  completed_at?: string
  book_title_snapshot?: string
  book_author_snapshot?: string
  book_cover_url_snapshot?: string
  start_page?: number
  end_page?: number
  chapters?: string[]
}

export interface BrowsableGroupPost {
  id: string
  type: Exclude<GroupPostType, "member_post">
  title: string
  content: string
  is_pinned: boolean
  version?: number
  published_at?: string
}

export interface BrowsableReadingGroupDetail {
  group: BrowsableReadingGroup
  books: BrowsableGroupBook[]
  meetings: BrowsableGroupMeeting[]
  assignments: BrowsableMeetingBookAssignment[]
  posts: BrowsableGroupPost[]
}

export type CreateReadingGroupInput = Pick<
  ReadingGroup,
  | "name"
  | "description"
  | "status"
  | "audience_levels"
  | "visibility"
  | "join_mode"
  | "time_zone"
  | "default_weekday"
  | "default_time"
  | "default_location"
>
export type UpdateReadingGroupInput = Partial<
  Pick<
    ReadingGroup,
    | "name"
    | "description"
    | "status"
    | "audience_levels"
    | "visibility"
    | "time_zone"
    | "default_weekday"
    | "default_time"
    | "default_location"
  >
>

export type CreateGroupMemberInput = Omit<
  GroupMember,
  "id" | "group_id" | "created_at" | "updated_at"
>
export type UpdateGroupMemberInput = Partial<
  Pick<
    GroupMember,
    | "display_name"
    | "role"
    | "member_kind"
    | "reads_for_user_id"
    | "status"
    | "joined_at"
    | "invited_at"
  >
>

export type CreateGroupBookInput = Omit<
  GroupBook,
  | "id"
  | "group_id"
  | "status"
  | "start_date"
  | "end_date"
  | "created_at"
  | "updated_at"
>
export type UpdateGroupBookInput = Partial<
  Pick<GroupBook, "order" | "selected_reason">
>
export type UpdateGroupBookStatusInput = Pick<GroupBook, "status">

export type CreateGroupMeetingInput = Omit<
  GroupMeeting,
  "id" | "group_id" | "created_at" | "updated_at"
>
export type UpdateGroupMeetingInput = Partial<
  Omit<GroupMeeting, "id" | "group_id" | "created_at" | "updated_at">
>

export type CreateMeetingBookAssignmentInput = Omit<
  MeetingBookAssignment,
  "id" | "group_id" | "meeting_id" | "created_at" | "updated_at"
>
export type UpdateMeetingBookAssignmentInput = Partial<
  Omit<
    MeetingBookAssignment,
    "id" | "group_id" | "meeting_id" | "created_at" | "updated_at"
  >
>

export type CreateMeetingBookRecommendationInput = Omit<
  MeetingBookRecommendation,
  | "id"
  | "group_id"
  | "created_at"
  | "updated_at"
  | "recommended_by_user_id"
  | "recommended_by_display_name"
> & {
  recommended_by_user_id: string
  recommended_by_display_name: string
}
export type UpdateMeetingBookRecommendationInput = Partial<
  Pick<MeetingBookRecommendation, "note">
>

export type CreateMeetingRecordInput = Omit<
  MeetingRecord,
  "id" | "group_id" | "meeting_id" | "created_at" | "updated_at"
>
export type UpdateMeetingRecordInput = Partial<CreateMeetingRecordInput>
export type UpsertMeetingRecordInput = CreateMeetingRecordInput

export type CreateGroupPostInput = Omit<
  GroupPost,
  "id" | "group_id" | "created_at" | "updated_at"
>
export type UpdateGroupPostInput = Partial<
  Omit<
    GroupPost,
    | "id"
    | "group_id"
    | "author_user_id"
    | "author_display_name"
    | "created_at"
    | "updated_at"
  >
>

export type CreateGroupPostCommentInput = Omit<
  GroupPostComment,
  "id" | "group_id" | "post_id" | "created_at" | "updated_at"
>
export type UpdateGroupPostCommentInput = Pick<GroupPostComment, "content">

export type CreateGroupRecordShareInput = Omit<
  GroupRecordShare,
  "id" | "group_id" | "created_at" | "updated_at"
>
export type UpdateGroupRecordShareInput = Partial<
  Pick<GroupRecordShare, "meeting_id" | "note">
>

export type CreateGroupReadingAttributionInput = Omit<
  GroupReadingAttribution,
  "id" | "group_id" | "created_at" | "updated_at"
>
export type UpdateGroupReadingAttributionInput = Partial<
  Pick<
    GroupReadingAttribution,
    | "group_book_id"
    | "meeting_id"
    | "meeting_book_assignment_id"
    | "session_start_at"
    | "session_end_at"
    | "counted_seconds"
    | "attributed_at"
  >
>
