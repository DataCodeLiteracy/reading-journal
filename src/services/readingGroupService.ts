import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore"
import { ApiClient, ApiError } from "@/lib/apiClient"
import { db } from "@/lib/firebase"
import { getClientIdToken } from "@/lib/getClientIdToken"
import type {
  CreateGroupBookInput,
  CreateGroupMeetingInput,
  CreateGroupMemberInput,
  CreateGroupPostCommentInput,
  CreateGroupPostInput,
  CreateGroupReadingAttributionInput,
  CreateGroupRecordShareInput,
  CreateMeetingBookAssignmentInput,
  CreateMeetingBookRecommendationInput,
  CreateReadingGroupInput,
  BrowsableReadingGroup,
  BrowsableReadingGroupDetail,
  GroupBook,
  GroupCurrentMeetingSummary,
  GroupMeeting,
  GroupMember,
  GroupPost,
  GroupPostComment,
  GroupReadingAttribution,
  GroupRecordShare,
  MeetingBookAssignment,
  MeetingBookRecommendation,
  MeetingRecord,
  ReadingGroup,
  UpdateGroupBookInput,
  UpdateGroupBookStatusInput,
  UpdateGroupMeetingInput,
  UpdateGroupMemberInput,
  UpdateGroupPostCommentInput,
  UpdateGroupPostInput,
  UpdateGroupReadingAttributionInput,
  UpdateGroupRecordShareInput,
  UpdateMeetingBookAssignmentInput,
  UpdateMeetingBookRecommendationInput,
  UpdateReadingGroupInput,
  UpsertMeetingRecordInput,
} from "@/types/readingGroup"

const COLLECTIONS = {
  groups: "readingGroups",
  members: "readingGroupMembers",
  books: "readingGroupBooks",
  meetings: "readingGroupMeetings",
  assignments: "readingGroupMeetingBookAssignments",
  recommendations: "readingGroupMeetingBookRecommendations",
  meetingRecords: "readingGroupMeetingRecords",
  posts: "readingGroupPosts",
  comments: "readingGroupPostComments",
  recordShares: "readingGroupRecordShares",
  attributions: "readingGroupReadingAttributions",
} as const

const CASCADE_COLLECTIONS = [
  COLLECTIONS.members,
  COLLECTIONS.books,
  COLLECTIONS.meetings,
  COLLECTIONS.assignments,
  COLLECTIONS.recommendations,
  COLLECTIONS.meetingRecords,
  COLLECTIONS.posts,
  COLLECTIONS.comments,
  COLLECTIONS.recordShares,
  COLLECTIONS.attributions,
] as const

type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS]

/**
 * 독서모임 클라이언트 데이터 계층입니다.
 *
 * 이 클래스의 owner 확인은 UI 노출과 사전 검증을 위한 편의 기능일 뿐입니다.
 * 신뢰할 수 있는 최종 권한 경계는 반드시 Firestore Security Rules여야 합니다.
 */
export class ReadingGroupService {
  private static async requireDocument<T>(
    collectionName: CollectionName,
    id: string,
    label: string,
  ): Promise<T> {
    const value = await ApiClient.getDocument<T>(collectionName, id)
    if (!value) {
      throw new ApiError(`${label}을(를) 찾을 수 없습니다.`, "DOCUMENT_NOT_FOUND")
    }
    return value
  }

  private static createInviteCode(): string {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    const randomValues = new Uint32Array(8)
    crypto.getRandomValues(randomValues)
    return Array.from(
      randomValues,
      (value) => alphabet[value % alphabet.length],
    ).join("")
  }

  static async createGroup(
    input: CreateReadingGroupInput,
    ownerUserId: string,
    ownerDisplayName: string,
  ): Promise<string> {
    const inviteCode = this.createInviteCode()
    const groupRef = doc(collection(db, COLLECTIONS.groups))
    const memberRef = doc(
      db,
      COLLECTIONS.members,
      `${groupRef.id}__${ownerUserId}`,
    )
    const batch = writeBatch(db)
    const nowIso = new Date().toISOString()

    const cleanInput = Object.fromEntries(
      Object.entries(input).filter(([, value]) => value !== undefined),
    )
    batch.set(groupRef, {
      ...cleanInput,
      name: input.name.trim(),
      owner_user_id: ownerUserId,
      invite_code: inviteCode,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    })
    batch.set(memberRef, {
      group_id: groupRef.id,
      user_id: ownerUserId,
      display_name: ownerDisplayName.trim(),
      role: "owner",
      member_kind: "participant",
      member_roles: ["participant"],
      status: "active",
      joined_at: nowIso,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    })
    await batch.commit()
    return groupRef.id
  }

  static getGroup(groupId: string): Promise<ReadingGroup | null> {
    return ApiClient.getDocument<ReadingGroup>(COLLECTIONS.groups, groupId)
  }

  static async updateGroup(
    groupId: string,
    input: UpdateReadingGroupInput,
  ): Promise<void> {
    await this.requireDocument<ReadingGroup>(
      COLLECTIONS.groups,
      groupId,
      "독서모임",
    )
    await ApiClient.updateDocument(COLLECTIONS.groups, groupId, input)
  }

  static async getMyGroups(
    userId: string,
    includeInactive = false,
  ): Promise<ReadingGroup[]> {
    const memberships = await ApiClient.queryDocuments<GroupMember>(
      COLLECTIONS.members,
      [
        ["user_id", "==", userId],
        ["status", "==", "active"],
      ],
    )
    const groups = await Promise.all(
      memberships.map((membership) => this.getGroup(membership.group_id)),
    )
    return groups.filter(
      (group): group is ReadingGroup =>
        group !== null && (includeInactive || group.status === "active"),
    )
  }

  private static async browseRequest<T>(path: string): Promise<T> {
    const idToken = await getClientIdToken()
    const response = await fetch(path, {
      headers: { Authorization: `Bearer ${idToken}` },
      cache: "no-store",
    })
    const result = (await response.json()) as T & { error?: string }
    if (!response.ok) {
      throw new ApiError(
        result.error ?? "독서모임 정보를 불러오지 못했습니다.",
        "GROUP_BROWSE_ERROR",
        response.status,
      )
    }
    return result
  }

  static async browseGroups(): Promise<BrowsableReadingGroup[]> {
    const result = await this.browseRequest<{ groups: BrowsableReadingGroup[] }>(
      "/api/groups/browse",
    )
    return result.groups
  }

  static browseGroupDetail(groupId: string): Promise<BrowsableReadingGroupDetail> {
    return this.browseRequest<BrowsableReadingGroupDetail>(
      `/api/groups/browse?groupId=${encodeURIComponent(groupId)}`,
    )
  }

  static async joinGroupByInviteCode(
    inviteCode: string,
    userId: string,
    displayName: string,
    roleOption: "participant" | "guardian" | "both" = "participant",
    readsForUserId?: string,
  ): Promise<ReadingGroup> {
    if (!userId) throw new ApiError("로그인이 필요합니다.", "AUTH_REQUIRED")
    const idToken = await getClientIdToken()
    const response = await fetch("/api/groups/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idToken,
        inviteCode,
        displayName,
        roleOption,
        memberKind: roleOption === "both" ? "participant" : roleOption,
        ...(readsForUserId ? { readsForUserId } : {}),
      }),
    })
    const result = (await response.json()) as {
      groupId?: string
      error?: string
    }
    if (!response.ok || !result.groupId) {
      throw new ApiError(
        result.error ?? "모임 가입에 실패했습니다.",
        "GROUP_JOIN_ERROR",
        response.status,
      )
    }
    const group = await this.getGroup(result.groupId)
    if (!group) {
      throw new ApiError("가입한 모임을 불러오지 못했습니다.", "GROUP_FETCH_ERROR")
    }
    return group
  }

  /** 모임 책을 모든 멤버 서재에 동기화 (모임장) */
  static async syncGroupBookToMemberLibraries(
    groupId: string,
    canonicalBookId: string,
  ): Promise<void> {
    const idToken = await getClientIdToken()
    const response = await fetch("/api/groups/sync-member-books", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken, groupId, canonicalBookId }),
    })
    const result = (await response.json()) as { error?: string }
    if (!response.ok) {
      throw new ApiError(
        result.error ?? "모임 책 서재 동기화에 실패했습니다.",
        "GROUP_BOOK_LIBRARY_SYNC_ERROR",
        response.status,
      )
    }
  }

  static async transferOwnership(
    groupId: string,
    newOwnerUserId: string,
  ): Promise<void> {
    const idToken = await getClientIdToken()
    const response = await fetch("/api/groups/transfer-ownership", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken, groupId, newOwnerUserId }),
    })
    const result = (await response.json()) as { error?: string }
    if (!response.ok) {
      throw new ApiError(
        result.error ?? "모임장 역할을 넘기지 못했습니다.",
        "GROUP_TRANSFER_OWNERSHIP_ERROR",
        response.status,
      )
    }
  }

  /**
   * UI에서 구조 변경 액션을 표시할지 판단하는 용도입니다.
   * 이 반환값을 권한 부여로 신뢰하지 말고 Security Rules에서 다시 검증해야 합니다.
   */
  static async canManageGroupStructure(
    groupId: string,
    userId: string,
  ): Promise<boolean> {
    const [group, membership] = await Promise.all([
      this.getGroup(groupId),
      this.getMember(`${groupId}__${userId}`),
    ])
    return Boolean(
      group?.owner_user_id === userId &&
        membership?.role === "owner" &&
        membership.status === "active",
    )
  }

  static async deleteGroup(groupId: string): Promise<void> {
    await this.requireDocument<ReadingGroup>(
      COLLECTIONS.groups,
      groupId,
      "독서모임",
    )
    const snapshots = await Promise.all(
      CASCADE_COLLECTIONS.map((collectionName) =>
        getDocs(
          query(
            collection(db, collectionName),
            where("group_id", "==", groupId),
          ),
        ),
      ),
    )
    const relatedDocs = snapshots.flatMap((snapshot) => snapshot.docs)
    const writeCount = relatedDocs.length + 1
    if (writeCount >= 500) {
      throw new ApiError(
        "연관 문서가 너무 많아 단일 배치로 삭제할 수 없습니다.",
        "CASCADE_BATCH_LIMIT",
      )
    }

    const batch = writeBatch(db)
    relatedDocs.forEach((document) => batch.delete(document.ref))
    batch.delete(doc(db, COLLECTIONS.groups, groupId))
    await batch.commit()
  }

  static async addMember(
    groupId: string,
    input: CreateGroupMemberInput,
  ): Promise<string> {
    const data = {
      ...input,
      display_name: input.display_name.trim(),
      group_id: groupId,
      member_kind: input.member_kind ?? "participant",
      member_roles:
        input.member_roles ??
        (input.member_kind === "guardian"
          ? (["guardian"] as const)
          : (["participant"] as const)),
    }
    if (input.user_id) {
      const id = `${groupId}__${input.user_id}`
      const existing = await ApiClient.queryDocuments<GroupMember>(
        COLLECTIONS.members,
        [
          ["group_id", "==", groupId],
          ["user_id", "==", input.user_id],
        ],
      )
      if (existing.length > 0) {
        throw new ApiError("이미 등록된 멤버입니다.", "MEMBER_ALREADY_EXISTS")
      }
      await ApiClient.createDocument(COLLECTIONS.members, id, data)
      return id
    }
    return ApiClient.createDocumentWithAutoId(COLLECTIONS.members, data)
  }

  static getMember(memberId: string): Promise<GroupMember | null> {
    return ApiClient.getDocument<GroupMember>(COLLECTIONS.members, memberId)
  }

  static getGroupMembers(groupId: string): Promise<GroupMember[]> {
    return ApiClient.queryDocuments<GroupMember>(
      COLLECTIONS.members,
      [["group_id", "==", groupId]],
      "created_at",
      "asc",
    )
  }

  static async updateMember(
    memberId: string,
    input: UpdateGroupMemberInput,
  ): Promise<void> {
    await this.requireDocument<GroupMember>(COLLECTIONS.members, memberId, "멤버")
    await ApiClient.updateDocument(COLLECTIONS.members, memberId, input)
  }

  static async deleteMember(memberId: string): Promise<void> {
    await this.requireDocument<GroupMember>(COLLECTIONS.members, memberId, "멤버")
    await ApiClient.deleteDocument(COLLECTIONS.members, memberId)
  }

  static createGroupBook(
    groupId: string,
    input: CreateGroupBookInput,
  ): Promise<string> {
    return this.createUniqueGroupBook(groupId, input)
  }

  private static async createUniqueGroupBook(
    groupId: string,
    input: CreateGroupBookInput,
  ): Promise<string> {
    if (!input.canonical_book_id?.trim()) {
      throw new ApiError(
        "공유 판본 정보가 없는 책은 모임 책장에 추가할 수 없습니다.",
        "CANONICAL_BOOK_REQUIRED",
      )
    }
    const existing = await ApiClient.queryDocuments<GroupBook>(
      COLLECTIONS.books,
      [
        ["group_id", "==", groupId],
        ["canonical_book_id", "==", input.canonical_book_id],
      ],
      undefined,
      "asc",
      1,
    )
    if (existing.length > 0) {
      throw new ApiError(
        "이미 모임 책장에 등록된 판본입니다.",
        "GROUP_BOOK_ALREADY_EXISTS",
      )
    }

    return ApiClient.createDocumentWithAutoId(COLLECTIONS.books, {
      ...input,
      status: "planned",
      group_id: groupId,
    }).then(async (id) => {
      try {
        await this.syncGroupBookToMemberLibraries(
          groupId,
          input.canonical_book_id,
        )
      } catch (error) {
        console.warn(
          "ReadingGroupService: 모임 책 멤버 서재 동기화 실패",
          error,
        )
      }
      return id
    })
  }

  static getGroupBook(groupBookId: string): Promise<GroupBook | null> {
    return ApiClient.getDocument<GroupBook>(COLLECTIONS.books, groupBookId)
  }

  static getGroupBooks(groupId: string): Promise<GroupBook[]> {
    return ApiClient.queryDocuments<GroupBook>(
      COLLECTIONS.books,
      [["group_id", "==", groupId]],
      "created_at",
      "asc",
    )
  }

  static async updateGroupBook(
    groupBookId: string,
    input: UpdateGroupBookInput,
  ): Promise<void> {
    await this.requireDocument<GroupBook>(
      COLLECTIONS.books,
      groupBookId,
      "그룹 책",
    )
    await ApiClient.updateDocument(COLLECTIONS.books, groupBookId, input)
  }

  static async updateGroupBookStatus(
    groupBookId: string,
    input: UpdateGroupBookStatusInput,
  ): Promise<void> {
    const groupBook = await this.requireDocument<GroupBook>(
      COLLECTIONS.books,
      groupBookId,
      "그룹 책",
    )
    if (input.status === "completed") {
      throw new ApiError(
        "완료 상태는 회차 기록을 완료할 때만 확정할 수 있습니다.",
        "BOOK_COMPLETION_REQUIRES_MEETING",
      )
    }
    if (groupBook.status === "paused") {
      throw new ApiError("중단된 책의 상태는 다시 변경할 수 없습니다.", "STOPPED_BOOK_LOCKED")
    }
    const assignments = await this.getGroupMeetingBookAssignments(groupBook.group_id)
    const assignment = [...assignments]
      .filter((item) => item.group_book_id === groupBookId)
      .sort((left, right) => right.reading_start_at.localeCompare(left.reading_start_at))[0]
    if (!assignment) {
      if (!["planned", "on_hold"].includes(input.status)) {
        throw new ApiError(
          "미배정 책은 예정 또는 선정 보류로만 변경할 수 있습니다.",
          "INVALID_BOOK_STATUS_TRANSITION",
        )
      }
      await ApiClient.updateDocument(COLLECTIONS.books, groupBookId, input)
      return
    }

    const meeting = await this.requireDocument<GroupMeeting>(
      COLLECTIONS.meetings,
      assignment.meeting_id,
      "모임 회차",
    )
    if (meeting.status === "completed") {
      throw new ApiError("완료된 회차의 책 상태는 변경할 수 없습니다.", "COMPLETED_BOOK_LOCKED")
    }
    if (Date.now() < new Date(assignment.reading_start_at).getTime()) {
      throw new ApiError("읽기 시작일 전에는 진행 상태를 변경할 수 없습니다.", "READING_NOT_STARTED")
    }
    if (!["reading", "reading_paused", "paused"].includes(input.status)) {
      throw new ApiError(
        "진행 책은 읽는 중, 정지 또는 중단으로만 변경할 수 있습니다.",
        "INVALID_BOOK_STATUS_TRANSITION",
      )
    }
    const batch = writeBatch(db)
    batch.update(doc(db, COLLECTIONS.books, groupBookId), {
      status: input.status,
      updated_at: serverTimestamp(),
    })
    if (input.status === "paused" && !assignment.stopped_at) {
      batch.update(doc(db, COLLECTIONS.assignments, assignment.id), {
        stopped_at: new Date().toISOString(),
        updated_at: serverTimestamp(),
      })
    }
    await batch.commit()
  }

  /**
   * 모임 책 삭제. 회차에 배정된(공식 모임 책으로 정해진) 책은 삭제할 수 없습니다.
   */
  static async deleteGroupBook(groupBookId: string): Promise<void> {
    const groupBook = await this.requireDocument<GroupBook>(
      COLLECTIONS.books,
      groupBookId,
      "그룹 책",
    )
    const assignments = await getDocs(
      query(
        collection(db, COLLECTIONS.assignments),
        where("group_id", "==", groupBook.group_id),
        where("group_book_id", "==", groupBookId),
      ),
    )
    if (!assignments.empty) {
      throw new ApiError(
        "회차에 배정된 모임 책은 삭제할 수 없습니다. 함께 보면 좋은 책으로 바꾸거나, 먼저 회차 배정을 해제해 주세요.",
        "GROUP_BOOK_IN_USE",
      )
    }
    await ApiClient.deleteDocument(COLLECTIONS.books, groupBookId)
  }

  /**
   * 모임 책을 삭제한 뒤 선택한 회차의 «함께 보면 좋은 책»으로 등록합니다.
   * 회차 배정이 있으면 삭제와 같은 조건으로 함께 해제합니다.
   */
  static async convertGroupBookToRecommendation(
    groupBookId: string,
    input: {
      meeting_id: string
      recommended_by_user_id: string
      recommended_by_display_name: string
      note?: string
    },
  ): Promise<string> {
    const groupBook = await this.requireDocument<GroupBook>(
      COLLECTIONS.books,
      groupBookId,
      "그룹 책",
    )
    const meeting = await this.requireDocument<GroupMeeting>(
      COLLECTIONS.meetings,
      input.meeting_id,
      "모임 회차",
    )
    if (meeting.group_id !== groupBook.group_id) {
      throw new ApiError(
        "회차가 해당 독서모임에 속하지 않습니다.",
        "INVALID_GROUP_MEETING",
      )
    }
    if (meeting.status === "completed") {
      throw new ApiError(
        "완료된 회차에는 책을 추천할 수 없습니다.",
        "COMPLETED_MEETING_LOCKED",
      )
    }

    const assignmentDocs = await this.getRemovableAssignmentDocsForGroupBook(
      groupBook,
    )
    const existing = await this.getMeetingBookRecommendations(
      groupBook.group_id,
      input.meeting_id,
    )
    if (
      existing.some(
        (item) =>
          item.canonical_book_id === groupBook.canonical_book_id &&
          item.recommended_by_user_id === input.recommended_by_user_id,
      )
    ) {
      throw new ApiError(
        "이미 이 회차에 추천한 책입니다.",
        "RECOMMENDATION_ALREADY_EXISTS",
      )
    }

    const recommendationRef = doc(collection(db, COLLECTIONS.recommendations))
    const batch = writeBatch(db)
    assignmentDocs.forEach((assignmentDoc) => batch.delete(assignmentDoc.ref))
    batch.delete(doc(db, COLLECTIONS.books, groupBookId))
    const clean = (value: Record<string, unknown>) =>
      Object.fromEntries(
        Object.entries(value).filter(([, item]) => item !== undefined),
      )
    batch.set(
      recommendationRef,
      clean({
        meeting_id: input.meeting_id,
        canonical_book_id: groupBook.canonical_book_id,
        title: groupBook.title.trim(),
        author: groupBook.author?.trim() || undefined,
        cover_url: groupBook.cover_url?.trim() || undefined,
        recommended_by_user_id: input.recommended_by_user_id,
        recommended_by_display_name: input.recommended_by_display_name.trim(),
        note:
          input.note?.trim() ||
          groupBook.selected_reason?.trim() ||
          undefined,
        group_id: groupBook.group_id,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      }),
    )
    await batch.commit()
    return recommendationRef.id
  }

  /**
   * «함께 보면 좋은 책»을 모임 책장 공식 책으로 올립니다.
   * 같은 판본이 이미 책장에 있으면 추천만 제거하고, 같은 회차의 동일 판본 추천도 함께 정리합니다.
   */
  static async convertRecommendationToGroupBook(
    recommendationId: string,
    input?: { selected_reason?: string },
  ): Promise<string> {
    const recommendation = await this.requireDocument<MeetingBookRecommendation>(
      COLLECTIONS.recommendations,
      recommendationId,
      "추천 책",
    )
    const meeting = await this.requireDocument<GroupMeeting>(
      COLLECTIONS.meetings,
      recommendation.meeting_id,
      "모임 회차",
    )
    if (meeting.status === "completed") {
      throw new ApiError(
        "완료된 회차의 추천은 모임 책으로 바꿀 수 없습니다.",
        "COMPLETED_MEETING_LOCKED",
      )
    }

    const existingBooks = await ApiClient.queryDocuments<GroupBook>(
      COLLECTIONS.books,
      [
        ["group_id", "==", recommendation.group_id],
        ["canonical_book_id", "==", recommendation.canonical_book_id],
      ],
      undefined,
      "asc",
      1,
    )
    const sameMeetingRecommendations = await this.getMeetingBookRecommendations(
      recommendation.group_id,
      recommendation.meeting_id,
    )
    const recommendationsToRemove = sameMeetingRecommendations.filter(
      (item) => item.canonical_book_id === recommendation.canonical_book_id,
    )

    if (existingBooks.length > 0) {
      if (recommendationsToRemove.length === 0) {
        return existingBooks[0].id
      }
      const batch = writeBatch(db)
      recommendationsToRemove.forEach((item) =>
        batch.delete(doc(db, COLLECTIONS.recommendations, item.id)),
      )
      await batch.commit()
      return existingBooks[0].id
    }

    const bookRef = doc(collection(db, COLLECTIONS.books))
    const batch = writeBatch(db)
    const clean = (value: Record<string, unknown>) =>
      Object.fromEntries(
        Object.entries(value).filter(([, item]) => item !== undefined),
      )
    const selectedReason =
      input?.selected_reason?.trim() ||
      recommendation.note?.trim() ||
      undefined
    batch.set(
      bookRef,
      clean({
        canonical_book_id: recommendation.canonical_book_id,
        title: recommendation.title.trim(),
        author: recommendation.author?.trim() || undefined,
        cover_url: recommendation.cover_url?.trim() || undefined,
        selected_reason: selectedReason,
        status: "planned",
        group_id: recommendation.group_id,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      }),
    )
    recommendationsToRemove.forEach((item) =>
      batch.delete(doc(db, COLLECTIONS.recommendations, item.id)),
    )
    await batch.commit()

    try {
      await this.syncGroupBookToMemberLibraries(
        recommendation.group_id,
        recommendation.canonical_book_id,
      )
    } catch (error) {
      console.warn(
        "ReadingGroupService: 추천→모임 책 전환 후 멤버 서재 동기화 실패",
        error,
      )
    }
    return bookRef.id
  }

  private static async getRemovableAssignmentDocsForGroupBook(
    groupBook: GroupBook,
  ) {
    const assignments = await getDocs(
      query(
        collection(db, COLLECTIONS.assignments),
        where("group_id", "==", groupBook.group_id),
        where("group_book_id", "==", groupBook.id),
      ),
    )
    if (assignments.empty) return []

    for (const assignmentDoc of assignments.docs) {
      const assignment = assignmentDoc.data() as MeetingBookAssignment
      const meeting = await this.requireDocument<GroupMeeting>(
        COLLECTIONS.meetings,
        assignment.meeting_id,
        "모임 회차",
      )
      if (meeting.status === "completed") {
        throw new ApiError(
          "완료된 회차에 배정된 책은 삭제하거나 추천으로 바꿀 수 없습니다.",
          "COMPLETED_ASSIGNMENT_LOCKED",
        )
      }
      const attributions = await getDocs(
        query(
          collection(db, COLLECTIONS.attributions),
          where("group_id", "==", groupBook.group_id),
          where("meeting_book_assignment_id", "==", assignmentDoc.id),
        ),
      )
      if (!attributions.empty) {
        throw new ApiError(
          "누적된 독서 시간이 있는 책은 삭제하거나 추천으로 바꿀 수 없습니다.",
          "ASSIGNMENT_HAS_READING_TIME",
        )
      }
    }
    return assignments.docs
  }

  static createMeeting(
    groupId: string,
    input: CreateGroupMeetingInput,
  ): Promise<string> {
    return ApiClient.createDocumentWithAutoId(COLLECTIONS.meetings, {
      ...input,
      status: "scheduled",
      group_id: groupId,
    })
  }

  static getMeeting(meetingId: string): Promise<GroupMeeting | null> {
    return ApiClient.getDocument<GroupMeeting>(COLLECTIONS.meetings, meetingId)
  }

  static getGroupMeetings(groupId: string): Promise<GroupMeeting[]> {
    return ApiClient.queryDocuments<GroupMeeting>(
      COLLECTIONS.meetings,
      [["group_id", "==", groupId]],
      "scheduled_at",
      "asc",
    )
  }

  /** 완료·취소되지 않은 회차 중 가장 빠른 회차를 현재 진행 회차로 봅니다. */
  static pickCurrentMeeting(
    meetings: GroupMeeting[],
  ): GroupMeeting | null {
    return (
      [...meetings]
        .filter(
          (meeting) =>
            meeting.status !== "completed" &&
            meeting.status !== "cancelled" &&
            meeting.status !== "draft",
        )
        .sort((left, right) => left.sequence - right.sequence)[0] ?? null
    )
  }

  static toCurrentMeetingSummary(
    meeting: GroupMeeting,
  ): GroupCurrentMeetingSummary {
    return {
      sequence: meeting.sequence,
      title: meeting.title,
      ends_at: meeting.ended_at ?? meeting.scheduled_at,
    }
  }

  static async getGroupCurrentMeetingSummary(
    groupId: string,
  ): Promise<GroupCurrentMeetingSummary | null> {
    const meetings = await this.getGroupMeetings(groupId)
    const current = this.pickCurrentMeeting(meetings)
    return current ? this.toCurrentMeetingSummary(current) : null
  }

  static getGroupMeetingBookAssignments(
    groupId: string,
  ): Promise<MeetingBookAssignment[]> {
    return ApiClient.queryDocuments<MeetingBookAssignment>(
      COLLECTIONS.assignments,
      [["group_id", "==", groupId]],
      "created_at",
      "asc",
    )
  }

  static async createMeetingWithBookAssignments(
    groupId: string,
    meetingInput: CreateGroupMeetingInput,
    assignmentInputs: CreateMeetingBookAssignmentInput[],
  ): Promise<string> {
    if (assignmentInputs.length === 0) {
      throw new ApiError("회차에 배정할 책을 한 권 이상 선택해 주세요.", "NO_ASSIGNMENT")
    }
    const uniqueBookIds = new Set(assignmentInputs.map((input) => input.group_book_id))
    if (uniqueBookIds.size !== assignmentInputs.length) {
      throw new ApiError("같은 책을 중복으로 배정할 수 없습니다.", "DUPLICATE_ASSIGNMENT")
    }
    const [groupBooks, meetings] = await Promise.all([
      Promise.all(
        assignmentInputs.map((input) =>
          this.requireDocument<GroupBook>(
            COLLECTIONS.books,
            input.group_book_id,
            "그룹 책",
          ),
        ),
      ),
      this.getGroupMeetings(groupId),
    ])
    const readingEndAt = meetingInput.scheduled_at
    groupBooks.forEach((groupBook, index) => {
      const assignmentInput = assignmentInputs[index]
      if (
        groupBook.group_id !== groupId ||
        groupBook.canonical_book_id !== assignmentInput.canonical_book_id
      ) {
        throw new ApiError("회차 책 연결 정보가 올바르지 않습니다.", "INVALID_GROUP_BOOK")
      }
      if (!["planned", "on_hold"].includes(groupBook.status)) {
        throw new ApiError("예정 또는 선정 보류 책만 새 회차에 배정할 수 있습니다.", "BOOK_NOT_AVAILABLE")
      }
      if (assignmentInput.reading_start_at >= readingEndAt) {
        throw new ApiError(
          "독서 시작일은 모임 예정일보다 빨라야 합니다.",
          "INVALID_READING_PERIOD",
        )
      }
    })
    if (meetings.some((meeting) => meeting.status !== "completed")) {
      throw new ApiError("기존 회차를 모두 완료한 뒤 새 회차를 만들 수 있습니다.", "MEETING_IN_PROGRESS")
    }

    const meetingRef = doc(collection(db, COLLECTIONS.meetings))
    const batch = writeBatch(db)
    const clean = (value: Record<string, unknown>) =>
      Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined))
    batch.set(meetingRef, {
      ...clean(meetingInput as unknown as Record<string, unknown>),
      status: "scheduled",
      group_id: groupId,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    })
    groupBooks.forEach((groupBook, index) => {
      const assignmentInput = assignmentInputs[index]
      const assignmentRef = doc(collection(db, COLLECTIONS.assignments))
      batch.set(assignmentRef, {
        ...clean(assignmentInput as unknown as Record<string, unknown>),
        reading_end_at: readingEndAt,
        book_title_snapshot: groupBook.title,
        ...(groupBook.author ? { book_author_snapshot: groupBook.author } : {}),
        ...(groupBook.cover_url ? { book_cover_url_snapshot: groupBook.cover_url } : {}),
        group_id: groupId,
        meeting_id: meetingRef.id,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      })
      if (groupBook.status === "on_hold") {
        batch.update(doc(db, COLLECTIONS.books, groupBook.id), {
          status: "planned",
          updated_at: serverTimestamp(),
        })
      }
    })
    await batch.commit()
    return meetingRef.id
  }

  static async updateMeeting(
    meetingId: string,
    input: UpdateGroupMeetingInput,
  ): Promise<void> {
    const meeting = await this.requireDocument<GroupMeeting>(
      COLLECTIONS.meetings,
      meetingId,
      "모임 회차",
    )
    if (meeting.status === "completed") {
      throw new ApiError("완료된 회차는 수정할 수 없습니다.", "COMPLETED_MEETING_LOCKED")
    }
    if (input.status === "completed") {
      throw new ApiError(
        "회차 기록을 저장하여 완료 처리해 주세요.",
        "MEETING_COMPLETION_REQUIRES_RECORD",
      )
    }
    await ApiClient.updateDocument(COLLECTIONS.meetings, meetingId, input)
  }

  static async deleteMeeting(meetingId: string): Promise<void> {
    const meeting = await this.requireDocument<GroupMeeting>(
      COLLECTIONS.meetings,
      meetingId,
      "모임 회차",
    )
    if (meeting.status === "completed") {
      throw new ApiError("완료된 회차는 삭제할 수 없습니다.", "COMPLETED_MEETING_LOCKED")
    }
    const assignments = await getDocs(
      query(
        collection(db, COLLECTIONS.assignments),
        where("group_id", "==", meeting.group_id),
        where("meeting_id", "==", meetingId),
      ),
    )
    const recommendations = await getDocs(
      query(
        collection(db, COLLECTIONS.recommendations),
        where("group_id", "==", meeting.group_id),
        where("meeting_id", "==", meetingId),
      ),
    )
    const attributions = await getDocs(
      query(
        collection(db, COLLECTIONS.attributions),
        where("group_id", "==", meeting.group_id),
        where("meeting_id", "==", meetingId),
      ),
    )
    // meeting + meetingRecord + cascaded docs (Firestore batch 한도 500)
    const cascadeCount =
      assignments.size + recommendations.size + attributions.size + 2
    if (cascadeCount > 500) {
      throw new ApiError(
        "연결된 과제·추천·독서 귀속이 너무 많아 한 번에 삭제할 수 없습니다.",
        "CASCADE_BATCH_LIMIT",
      )
    }
    const batch = writeBatch(db)
    assignments.docs.forEach((assignment) => batch.delete(assignment.ref))
    recommendations.docs.forEach((item) => batch.delete(item.ref))
    attributions.docs.forEach((item) => batch.delete(item.ref))
    // MeetingRecord의 문서 ID는 meetingId이므로 조회 없이 함께 지워도 안전합니다.
    batch.delete(doc(db, COLLECTIONS.meetingRecords, meetingId))
    batch.delete(doc(db, COLLECTIONS.meetings, meeting.id))
    await batch.commit()
  }

  static async createMeetingBookAssignment(
    groupId: string,
    meetingId: string,
    input: CreateMeetingBookAssignmentInput,
  ): Promise<string> {
    const [meeting, groupBook, existingAssignments] = await Promise.all([
      this.requireDocument<GroupMeeting>(COLLECTIONS.meetings, meetingId, "모임 회차"),
      this.requireDocument<GroupBook>(COLLECTIONS.books, input.group_book_id, "그룹 책"),
      this.getMeetingBookAssignments(groupId, meetingId),
    ])
    if (
      meeting.group_id !== groupId ||
      groupBook.group_id !== groupId ||
      groupBook.canonical_book_id !== input.canonical_book_id
    ) {
      throw new ApiError("회차 책 연결 정보가 올바르지 않습니다.", "INVALID_GROUP_BOOK")
    }
    if (
      existingAssignments.some(
        (assignment) => assignment.group_book_id === groupBook.id,
      )
    ) {
      throw new ApiError("이미 회차에 배정된 책입니다.", "ASSIGNMENT_ALREADY_EXISTS")
    }
    if (!["planned", "on_hold"].includes(groupBook.status)) {
      throw new ApiError("예정 또는 선정 보류 책만 배정할 수 있습니다.", "BOOK_NOT_AVAILABLE")
    }
    const readingEndAt = meeting.scheduled_at
    if (input.reading_start_at >= readingEndAt) {
      throw new ApiError("읽기 시작은 마감보다 빨라야 합니다.", "INVALID_READING_PERIOD")
    }
    const assignmentRef = doc(collection(db, COLLECTIONS.assignments))
    const batch = writeBatch(db)
    batch.set(assignmentRef, {
      ...input,
      reading_end_at: readingEndAt,
      group_id: groupId,
      meeting_id: meetingId,
      book_title_snapshot: groupBook.title,
      ...(groupBook.author ? { book_author_snapshot: groupBook.author } : {}),
      ...(groupBook.cover_url ? { book_cover_url_snapshot: groupBook.cover_url } : {}),
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    })
    if (groupBook.status === "on_hold") {
      batch.update(doc(db, COLLECTIONS.books, groupBook.id), {
        status: "planned",
        updated_at: serverTimestamp(),
      })
    }
    await batch.commit()
    return assignmentRef.id
  }

  static getMeetingBookAssignment(
    assignmentId: string,
  ): Promise<MeetingBookAssignment | null> {
    return ApiClient.getDocument<MeetingBookAssignment>(
      COLLECTIONS.assignments,
      assignmentId,
    )
  }

  static getMeetingBookAssignments(
    groupId: string,
    meetingId: string,
  ): Promise<MeetingBookAssignment[]> {
    return ApiClient.queryDocuments<MeetingBookAssignment>(
      COLLECTIONS.assignments,
      [
        ["group_id", "==", groupId],
        ["meeting_id", "==", meetingId],
      ],
      "created_at",
      "asc",
    )
  }

  static getAssignmentsByCanonicalBook(
    groupId: string,
    canonicalBookId: string,
  ): Promise<MeetingBookAssignment[]> {
    return ApiClient.queryDocuments<MeetingBookAssignment>(
      COLLECTIONS.assignments,
      [
        ["group_id", "==", groupId],
        ["canonical_book_id", "==", canonicalBookId],
      ],
    )
  }

  static async updateMeetingBookAssignment(
    assignmentId: string,
    input: UpdateMeetingBookAssignmentInput,
  ): Promise<void> {
    const assignment = await this.requireDocument<MeetingBookAssignment>(
      COLLECTIONS.assignments,
      assignmentId,
      "회차 책 과제",
    )
    const meeting = await this.requireDocument<GroupMeeting>(
      COLLECTIONS.meetings,
      assignment.meeting_id,
      "모임 회차",
    )
    if (meeting.status === "completed") {
      throw new ApiError("완료된 회차의 배정은 수정할 수 없습니다.", "COMPLETED_ASSIGNMENT_LOCKED")
    }
    const readingEndAt = meeting.scheduled_at
    const readingStartAt =
      input.reading_start_at ?? assignment.reading_start_at
    if (readingStartAt >= readingEndAt) {
      throw new ApiError(
        "독서 시작일은 모임 예정일보다 빨라야 합니다.",
        "INVALID_READING_PERIOD",
      )
    }
    const identityChanges =
      (input.group_book_id !== undefined &&
        input.group_book_id !== assignment.group_book_id) ||
      (input.canonical_book_id !== undefined &&
        input.canonical_book_id !== assignment.canonical_book_id)
    if (identityChanges) {
      const attributions = await getDocs(
        query(
          collection(db, COLLECTIONS.attributions),
          where("group_id", "==", assignment.group_id),
          where("meeting_book_assignment_id", "==", assignmentId),
        ),
      )
      if (!attributions.empty) {
        throw new ApiError(
          "누적된 독서 시간이 있는 회차의 책은 변경할 수 없습니다.",
          "ASSIGNMENT_HAS_READING_TIME",
        )
      }
    }
    await ApiClient.updateDocument(COLLECTIONS.assignments, assignmentId, {
      ...input,
      reading_end_at: readingEndAt,
    })
  }

  static async deleteMeetingBookAssignment(
    assignmentId: string,
  ): Promise<void> {
    const assignment = await this.requireDocument<MeetingBookAssignment>(
      COLLECTIONS.assignments,
      assignmentId,
      "회차 책 과제",
    )
    const meeting = await this.requireDocument<GroupMeeting>(
      COLLECTIONS.meetings,
      assignment.meeting_id,
      "모임 회차",
    )
    if (meeting.status === "completed") {
      throw new ApiError("완료된 회차의 배정은 삭제할 수 없습니다.", "COMPLETED_ASSIGNMENT_LOCKED")
    }
    await ApiClient.deleteDocument(COLLECTIONS.assignments, assignmentId)
  }

  static getGroupMeetingBookRecommendations(
    groupId: string,
  ): Promise<MeetingBookRecommendation[]> {
    return ApiClient.queryDocuments<MeetingBookRecommendation>(
      COLLECTIONS.recommendations,
      [["group_id", "==", groupId]],
    ).then((items) =>
      [...items].sort(
        (left, right) =>
          new Date(left.created_at ?? 0).getTime() -
          new Date(right.created_at ?? 0).getTime(),
      ),
    )
  }

  static getMeetingBookRecommendations(
    groupId: string,
    meetingId: string,
  ): Promise<MeetingBookRecommendation[]> {
    return ApiClient.queryDocuments<MeetingBookRecommendation>(
      COLLECTIONS.recommendations,
      [
        ["group_id", "==", groupId],
        ["meeting_id", "==", meetingId],
      ],
    ).then((items) =>
      [...items].sort(
        (left, right) =>
          new Date(left.created_at ?? 0).getTime() -
          new Date(right.created_at ?? 0).getTime(),
      ),
    )
  }

  static async createMeetingBookRecommendation(
    groupId: string,
    input: CreateMeetingBookRecommendationInput,
  ): Promise<string> {
    const meeting = await this.requireDocument<GroupMeeting>(
      COLLECTIONS.meetings,
      input.meeting_id,
      "모임 회차",
    )
    if (meeting.group_id !== groupId) {
      throw new ApiError(
        "회차가 해당 독서모임에 속하지 않습니다.",
        "INVALID_GROUP_MEETING",
      )
    }
    if (meeting.status === "completed") {
      throw new ApiError(
        "완료된 회차에는 책을 추천할 수 없습니다.",
        "COMPLETED_MEETING_LOCKED",
      )
    }
    if (!input.canonical_book_id?.trim() || !input.title?.trim()) {
      throw new ApiError("추천할 책 정보가 올바르지 않습니다.", "INVALID_RECOMMENDATION")
    }
    const [assignments, existing] = await Promise.all([
      this.getMeetingBookAssignments(groupId, input.meeting_id),
      this.getMeetingBookRecommendations(groupId, input.meeting_id),
    ])
    if (
      assignments.some(
        (assignment) => assignment.canonical_book_id === input.canonical_book_id,
      )
    ) {
      throw new ApiError(
        "이미 이 회차의 공식 배정 책입니다.",
        "RECOMMENDATION_IS_ASSIGNMENT",
      )
    }
    if (
      existing.some(
        (item) =>
          item.canonical_book_id === input.canonical_book_id &&
          item.recommended_by_user_id === input.recommended_by_user_id,
      )
    ) {
      throw new ApiError(
        "이미 이 회차에 추천한 책입니다.",
        "RECOMMENDATION_ALREADY_EXISTS",
      )
    }

    return ApiClient.createDocumentWithAutoId(COLLECTIONS.recommendations, {
      meeting_id: input.meeting_id,
      canonical_book_id: input.canonical_book_id,
      title: input.title.trim(),
      ...(input.author?.trim() ? { author: input.author.trim() } : {}),
      ...(input.cover_url?.trim() ? { cover_url: input.cover_url.trim() } : {}),
      recommended_by_user_id: input.recommended_by_user_id,
      recommended_by_display_name: input.recommended_by_display_name.trim(),
      ...(input.note?.trim() ? { note: input.note.trim() } : {}),
      group_id: groupId,
    })
  }

  static async updateMeetingBookRecommendation(
    recommendationId: string,
    requesterUserId: string,
    input: UpdateMeetingBookRecommendationInput,
  ): Promise<void> {
    const recommendation = await this.requireDocument<MeetingBookRecommendation>(
      COLLECTIONS.recommendations,
      recommendationId,
      "추천 책",
    )
    if (recommendation.recommended_by_user_id !== requesterUserId) {
      throw new ApiError(
        "본인이 추천한 책만 수정할 수 있습니다.",
        "RECOMMENDATION_UPDATE_FORBIDDEN",
      )
    }
    const meeting = await this.requireDocument<GroupMeeting>(
      COLLECTIONS.meetings,
      recommendation.meeting_id,
      "모임 회차",
    )
    if (meeting.status === "completed") {
      throw new ApiError(
        "완료된 회차의 추천은 수정할 수 없습니다.",
        "COMPLETED_MEETING_LOCKED",
      )
    }
    await ApiClient.updateDocument(COLLECTIONS.recommendations, recommendationId, {
      note: input.note?.trim() || undefined,
    })
  }

  static async deleteMeetingBookRecommendation(
    recommendationId: string,
    requesterUserId: string,
  ): Promise<void> {
    const recommendation = await this.requireDocument<MeetingBookRecommendation>(
      COLLECTIONS.recommendations,
      recommendationId,
      "추천 책",
    )
    if (recommendation.recommended_by_user_id !== requesterUserId) {
      throw new ApiError(
        "본인이 추천한 책만 삭제할 수 있습니다.",
        "RECOMMENDATION_DELETE_FORBIDDEN",
      )
    }
    await ApiClient.deleteDocument(COLLECTIONS.recommendations, recommendationId)
  }

  private static async getMeetingCompletionData(
    meetingId: string,
    expectedGroupId?: string,
  ): Promise<{
    meeting: GroupMeeting
    entries: { assignment: MeetingBookAssignment; groupBook: GroupBook }[]
  }> {
    const meeting = await this.requireDocument<GroupMeeting>(
      COLLECTIONS.meetings,
      meetingId,
      "모임 회차",
    )
    if (expectedGroupId && meeting.group_id !== expectedGroupId) {
      throw new ApiError(
        "회차가 해당 독서모임에 속하지 않습니다.",
        "INVALID_GROUP_MEETING",
      )
    }
    const assignments = await this.getMeetingBookAssignments(
      meeting.group_id,
      meetingId,
    )
    if (assignments.length === 0) {
      throw new ApiError(
        "회차에는 한 권 이상의 책이 배정되어야 합니다.",
        "INVALID_ASSIGNMENT_COUNT",
      )
    }
    const entries = await Promise.all(
      assignments.map(async (assignment) => {
        const groupBook = await this.requireDocument<GroupBook>(
          COLLECTIONS.books,
          assignment.group_book_id,
          "그룹 책",
        )
        if (
          assignment.group_id !== meeting.group_id ||
          groupBook.group_id !== meeting.group_id ||
          groupBook.canonical_book_id !== assignment.canonical_book_id
        ) {
          throw new ApiError(
            "회차 책 연결 정보가 올바르지 않습니다.",
            "INVALID_GROUP_BOOK",
          )
        }
        return { assignment, groupBook }
      }),
    )
    return { meeting, entries }
  }

  static async completeMeeting(
    meetingId: string,
    completedAt?: string,
  ): Promise<void> {
    const { meeting, entries } =
      await this.getMeetingCompletionData(meetingId)
    if (meeting.status === "completed") return
    if (meeting.status === "cancelled") {
      throw new ApiError("취소된 회차는 완료할 수 없습니다.", "CANCELLED_MEETING")
    }
    const completedAtIso = completedAt
      ? new Date(completedAt).toISOString()
      : new Date().toISOString()
    const batch = writeBatch(db)
    batch.update(doc(db, COLLECTIONS.meetings, meetingId), {
      status: "completed",
      updated_at: serverTimestamp(),
    })
    entries.forEach(({ assignment, groupBook }) => {
      batch.update(doc(db, COLLECTIONS.assignments, assignment.id), {
        completed_at: completedAtIso,
        book_title_snapshot: assignment.book_title_snapshot ?? groupBook.title,
        ...(assignment.book_author_snapshot || !groupBook.author
          ? {}
          : { book_author_snapshot: groupBook.author }),
        ...(assignment.book_cover_url_snapshot || !groupBook.cover_url
          ? {}
          : { book_cover_url_snapshot: groupBook.cover_url }),
        updated_at: serverTimestamp(),
      })
      if (groupBook.status !== "paused") {
        batch.update(doc(db, COLLECTIONS.books, groupBook.id), {
          status: "completed",
          updated_at: serverTimestamp(),
        })
      }
    })
    await batch.commit()
  }

  static async upsertMeetingRecord(
    groupId: string,
    meetingId: string,
    input: UpsertMeetingRecordInput,
  ): Promise<void> {
    const [existing, meeting] = await Promise.all([
      this.getMeetingRecord(meetingId),
      this.requireDocument<GroupMeeting>(COLLECTIONS.meetings, meetingId, "모임 회차"),
    ])
    if (meeting.group_id !== groupId) {
      throw new ApiError("회차가 해당 독서모임에 속하지 않습니다.", "INVALID_GROUP_MEETING")
    }

    const cleanInput = Object.fromEntries(
      Object.entries(input).filter(([, value]) => value !== undefined),
    )
    const batch = writeBatch(db)
    batch.set(
      doc(db, COLLECTIONS.meetingRecords, meetingId),
      {
        ...cleanInput,
        group_id: groupId,
        meeting_id: meetingId,
        ...(existing ? {} : { created_at: serverTimestamp() }),
        updated_at: serverTimestamp(),
      },
      { merge: true },
    )
    if (meeting.status !== "completed") {
      if (meeting.status === "cancelled") {
        throw new ApiError("취소된 회차는 완료할 수 없습니다.", "CANCELLED_MEETING")
      }
      const { entries } =
        await this.getMeetingCompletionData(meetingId, groupId)
      const completedAt = input.completed_at ?? new Date().toISOString()
      batch.update(doc(db, COLLECTIONS.meetings, meetingId), {
        status: "completed",
        updated_at: serverTimestamp(),
      })
      entries.forEach(({ assignment, groupBook }) => {
        batch.update(doc(db, COLLECTIONS.assignments, assignment.id), {
          completed_at: completedAt,
          book_title_snapshot: assignment.book_title_snapshot ?? groupBook.title,
          ...(assignment.book_author_snapshot || !groupBook.author
            ? {}
            : { book_author_snapshot: groupBook.author }),
          ...(assignment.book_cover_url_snapshot || !groupBook.cover_url
            ? {}
            : { book_cover_url_snapshot: groupBook.cover_url }),
          updated_at: serverTimestamp(),
        })
        if (groupBook.status !== "paused") {
          batch.update(doc(db, COLLECTIONS.books, groupBook.id), {
            status: "completed",
            updated_at: serverTimestamp(),
          })
        }
      })
    }
    await batch.commit()
  }

  static getMeetingRecord(meetingId: string): Promise<MeetingRecord | null> {
    return ApiClient.getDocument<MeetingRecord>(
      COLLECTIONS.meetingRecords,
      meetingId,
    )
  }

  static getGroupMeetingRecords(groupId: string): Promise<MeetingRecord[]> {
    return ApiClient.queryDocuments<MeetingRecord>(
      COLLECTIONS.meetingRecords,
      [["group_id", "==", groupId]],
      "completed_at",
      "desc",
    )
  }

  static createPost(
    groupId: string,
    input: CreateGroupPostInput,
  ): Promise<string> {
    return ApiClient.createDocumentWithAutoId(COLLECTIONS.posts, {
      ...input,
      group_id: groupId,
    })
  }

  static getPost(postId: string): Promise<GroupPost | null> {
    return ApiClient.getDocument<GroupPost>(COLLECTIONS.posts, postId)
  }

  static getGroupPosts(groupId: string): Promise<GroupPost[]> {
    return ApiClient.queryDocuments<GroupPost>(
      COLLECTIONS.posts,
      [["group_id", "==", groupId]],
      "created_at",
      "desc",
    )
  }

  static async updatePost(
    postId: string,
    input: UpdateGroupPostInput,
  ): Promise<void> {
    await this.requireDocument<GroupPost>(COLLECTIONS.posts, postId, "게시물")
    await ApiClient.updateDocument(COLLECTIONS.posts, postId, input)
  }

  static async deletePost(postId: string): Promise<void> {
    const post = await this.requireDocument<GroupPost>(
      COLLECTIONS.posts,
      postId,
      "게시물",
    )
    const comments = await getDocs(
      query(
        collection(db, COLLECTIONS.comments),
        where("group_id", "==", post.group_id),
        where("post_id", "==", postId),
      ),
    )
    if (comments.size >= 499) {
      throw new ApiError(
        "댓글이 너무 많아 게시물을 단일 배치로 삭제할 수 없습니다.",
        "CASCADE_BATCH_LIMIT",
      )
    }
    const batch = writeBatch(db)
    comments.docs.forEach((comment) => batch.delete(comment.ref))
    batch.delete(doc(db, COLLECTIONS.posts, postId))
    await batch.commit()
  }

  static createPostComment(
    groupId: string,
    postId: string,
    input: CreateGroupPostCommentInput,
  ): Promise<string> {
    return ApiClient.createDocumentWithAutoId(COLLECTIONS.comments, {
      ...input,
      group_id: groupId,
      post_id: postId,
    })
  }

  static getPostComment(commentId: string): Promise<GroupPostComment | null> {
    return ApiClient.getDocument<GroupPostComment>(
      COLLECTIONS.comments,
      commentId,
    )
  }

  static getPostComments(
    groupId: string,
    postId: string,
  ): Promise<GroupPostComment[]> {
    return ApiClient.queryDocuments<GroupPostComment>(
      COLLECTIONS.comments,
      [
        ["group_id", "==", groupId],
        ["post_id", "==", postId],
      ],
      "created_at",
      "asc",
    )
  }

  static async updatePostComment(
    commentId: string,
    input: UpdateGroupPostCommentInput,
  ): Promise<void> {
    await this.requireDocument<GroupPostComment>(
      COLLECTIONS.comments,
      commentId,
      "댓글",
    )
    await ApiClient.updateDocument(COLLECTIONS.comments, commentId, input)
  }

  static async deletePostComment(commentId: string): Promise<void> {
    await this.requireDocument<GroupPostComment>(
      COLLECTIONS.comments,
      commentId,
      "댓글",
    )
    await ApiClient.deleteDocument(COLLECTIONS.comments, commentId)
  }

  static async createRecordShare(
    groupId: string,
    input: CreateGroupRecordShareInput,
  ): Promise<string> {
    const id = `${groupId}__${input.record_type}__${input.record_id}__${input.shared_by_user_id}`
    const groupShares = await this.getGroupRecordShares(groupId)
    const duplicate = groupShares.find(
      (share) =>
        share.record_type === input.record_type &&
        share.record_id === input.record_id &&
        share.shared_by_user_id === input.shared_by_user_id,
    )
    if (duplicate) {
      throw new ApiError("이미 이 모임에 공유한 기록입니다.", "RECORD_ALREADY_SHARED")
    }
    await ApiClient.createDocument(COLLECTIONS.recordShares, id, {
      ...input,
      group_id: groupId,
    })
    return id
  }

  static getRecordShare(shareId: string): Promise<GroupRecordShare | null> {
    return ApiClient.getDocument<GroupRecordShare>(
      COLLECTIONS.recordShares,
      shareId,
    )
  }

  static getGroupRecordShares(groupId: string): Promise<GroupRecordShare[]> {
    return ApiClient.queryDocuments<GroupRecordShare>(
      COLLECTIONS.recordShares,
      [["group_id", "==", groupId]],
      "shared_at",
      "desc",
    )
  }

  static async updateRecordShare(
    shareId: string,
    input: UpdateGroupRecordShareInput,
  ): Promise<void> {
    await this.requireDocument<GroupRecordShare>(
      COLLECTIONS.recordShares,
      shareId,
      "공유 기록",
    )
    await ApiClient.updateDocument(COLLECTIONS.recordShares, shareId, input)
  }

  static async deleteRecordShare(shareId: string): Promise<void> {
    await this.requireDocument<GroupRecordShare>(
      COLLECTIONS.recordShares,
      shareId,
      "공유 기록",
    )
    await ApiClient.deleteDocument(COLLECTIONS.recordShares, shareId)
  }

  static createReadingAttribution(
    groupId: string,
    input: CreateGroupReadingAttributionInput,
  ): Promise<string> {
    const id = `${input.reading_session_id}__${input.meeting_book_assignment_id}__${input.user_id}`
    return ApiClient.createDocument(
      COLLECTIONS.attributions,
      id,
      { ...input, group_id: groupId },
    ).then(() => id)
  }

  static getGroupReadingAttributions(
    groupId: string,
  ): Promise<GroupReadingAttribution[]> {
    return ApiClient.queryDocuments<GroupReadingAttribution>(
      COLLECTIONS.attributions,
      [["group_id", "==", groupId]],
      "attributed_at",
      "desc",
    )
  }

  static getReadingAttributionsBySession(
    readingSessionId: string,
    userId: string,
  ): Promise<GroupReadingAttribution[]> {
    return ApiClient.queryDocuments<GroupReadingAttribution>(
      COLLECTIONS.attributions,
      [
        ["reading_session_id", "==", readingSessionId],
        ["user_id", "==", userId],
      ],
    )
  }

  static async updateReadingAttribution(
    attributionId: string,
    input: UpdateGroupReadingAttributionInput,
  ): Promise<void> {
    await this.requireDocument<GroupReadingAttribution>(
      COLLECTIONS.attributions,
      attributionId,
      "독서 귀속",
    )
    await ApiClient.updateDocument(COLLECTIONS.attributions, attributionId, input)
  }

  static async deleteReadingAttributionsBySession(
    readingSessionId: string,
    _userId?: string,
  ): Promise<number> {
    const snapshot = await getDocs(
      query(
        collection(db, COLLECTIONS.attributions),
        where("reading_session_id", "==", readingSessionId),
      ),
    )
    if (snapshot.size >= 500) {
      throw new ApiError(
        "귀속 기록이 너무 많아 단일 배치로 삭제할 수 없습니다.",
        "CASCADE_BATCH_LIMIT",
      )
    }
    if (snapshot.empty) return 0

    const batch = writeBatch(db)
    snapshot.docs.forEach((document) => batch.delete(document.ref))
    await batch.commit()
    return snapshot.size
  }
}
