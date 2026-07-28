import type { GroupMember, GroupMemberParticipationRole } from "@/types/readingGroup"

export const GROUP_MEMBER_KIND_LABELS = {
  participant: "참여자",
  guardian: "보호자",
} as const

export const GROUP_MEMBER_ROLE_OPTION_LABELS = {
  participant: "참여자",
  guardian: "보호자",
  both: "참여자 + 보호자",
} as const

export type GroupMemberRoleOption = keyof typeof GROUP_MEMBER_ROLE_OPTION_LABELS

export function rolesFromOption(
  option: GroupMemberRoleOption,
): GroupMemberParticipationRole[] {
  if (option === "both") return ["participant", "guardian"]
  if (option === "guardian") return ["guardian"]
  return ["participant"]
}

export function optionFromRoles(
  roles: GroupMemberParticipationRole[],
): GroupMemberRoleOption {
  const hasParticipant = roles.includes("participant")
  const hasGuardian = roles.includes("guardian")
  if (hasParticipant && hasGuardian) return "both"
  if (hasGuardian) return "guardian"
  return "participant"
}

/** member_roles 우선, 없으면 legacy member_kind로 추론합니다. */
export function resolveMemberRoles(
  member: Pick<GroupMember, "member_kind" | "member_roles"> | null | undefined,
): GroupMemberParticipationRole[] {
  if (member?.member_roles?.length) {
    return [...new Set(member.member_roles)]
  }
  if (member?.member_kind === "guardian") return ["guardian"]
  return ["participant"]
}

export function memberHasRole(
  member: Pick<GroupMember, "member_kind" | "member_roles"> | null | undefined,
  role: GroupMemberParticipationRole,
): boolean {
  return resolveMemberRoles(member).includes(role)
}

/** @deprecated resolveMemberRoles / memberHasRole 사용 */
export function resolveMemberKind(
  member: Pick<GroupMember, "member_kind" | "member_roles"> | null | undefined,
): "participant" | "guardian" {
  return memberHasRole(member, "guardian") && !memberHasRole(member, "participant")
    ? "guardian"
    : memberHasRole(member, "guardian")
      ? "guardian"
      : "participant"
}

export function memberKindLabel(
  member: Pick<GroupMember, "member_kind" | "member_roles"> | null | undefined,
): string {
  const roles = resolveMemberRoles(member)
  if (roles.includes("participant") && roles.includes("guardian")) {
    return GROUP_MEMBER_ROLE_OPTION_LABELS.both
  }
  if (roles.includes("guardian")) return GROUP_MEMBER_KIND_LABELS.guardian
  return GROUP_MEMBER_KIND_LABELS.participant
}
