import type { GroupMember, GroupMemberKind } from "@/types/readingGroup"

export const GROUP_MEMBER_KIND_LABELS: Record<GroupMemberKind, string> = {
  participant: "참여자",
  guardian: "보호자",
}

export function resolveMemberKind(
  member: Pick<GroupMember, "member_kind"> | null | undefined,
): GroupMemberKind {
  return member?.member_kind === "guardian" ? "guardian" : "participant"
}

export function memberKindLabel(
  member: Pick<GroupMember, "member_kind"> | null | undefined,
): string {
  return GROUP_MEMBER_KIND_LABELS[resolveMemberKind(member)]
}
