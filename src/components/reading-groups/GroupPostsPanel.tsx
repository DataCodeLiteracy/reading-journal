"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Pencil,
  Pin,
  Plus,
  Trash2,
} from "lucide-react"
import ConfirmModal from "@/components/ConfirmModal"
import FormModalFrame from "@/components/FormModalFrame"
import { FormNativePickerInput } from "@/components/FormNativePickerInput"
import Select, { type SelectOption } from "@/components/Select"
import { queryKeys } from "@/lib/queryKeys"
import { ReadingGroupService } from "@/services/readingGroupService"
import type {
  GroupPost,
  GroupPostComment,
  GroupPostType,
} from "@/types/readingGroup"

type Props = {
  groupId: string
  initialPosts: GroupPost[]
  isOwner: boolean
  userUid: string
  displayName: string
  onChangedAction: () => void | Promise<unknown>
}

type PostDraft = {
  type: GroupPostType
  title: string
  content: string
  isPinned: boolean
  version: string
  publishedAt: string
}

const POST_TYPES: SelectOption<GroupPostType>[] = [
  { value: "announcement", label: "공지" },
  { value: "group_rule", label: "모임 규칙" },
  { value: "reading_method", label: "독서법" },
  { value: "discussion_rule", label: "토론 규칙" },
  { value: "member_post", label: "모임원 글" },
]

const OPERATIONAL_TYPES = new Set<GroupPostType>([
  "announcement",
  "group_rule",
  "reading_method",
  "discussion_rule",
])

function typeLabel(type: GroupPostType) {
  return POST_TYPES.find((item) => item.value === type)?.label ?? type
}

function toDateTimeLocal(value?: string) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function formatDate(value?: Date | string) {
  if (!value) return ""
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(date)
}

function newDraft(isOwner: boolean): PostDraft {
  return {
    type: isOwner ? "announcement" : "member_post",
    title: "",
    content: "",
    isPinned: false,
    version: "1",
    publishedAt: toDateTimeLocal(new Date().toISOString()),
  }
}

function editDraft(post: GroupPost): PostDraft {
  return {
    type: post.type,
    title: post.title,
    content: post.content,
    isPinned: post.is_pinned,
    version: String(post.version ?? 1),
    publishedAt: toDateTimeLocal(post.published_at),
  }
}

function CommentsSection({
  groupId,
  postId,
  userUid,
  displayName,
  isOwner,
}: {
  groupId: string
  postId: string
  userUid: string
  displayName: string
  isOwner: boolean
}) {
  const queryClient = useQueryClient()
  const [content, setContent] = useState("")
  const [editing, setEditing] = useState<GroupPostComment | null>(null)
  const [editingContent, setEditingContent] = useState("")
  const [error, setError] = useState("")
  const [pendingDelete, setPendingDelete] = useState<GroupPostComment | null>(
    null,
  )
  const commentsQuery = useQuery({
    queryKey: queryKeys.readingGroups.comments(postId),
    queryFn: () => ReadingGroupService.getPostComments(groupId, postId),
  })

  const refresh = async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.readingGroups.comments(postId),
    })
  }

  const createMutation = useMutation({
    mutationFn: (value: string) =>
      ReadingGroupService.createPostComment(groupId, postId, {
        author_user_id: userUid,
        author_display_name: displayName,
        content: value,
      }),
    onSuccess: async () => {
      setContent("")
      await refresh()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, value }: { id: string; value: string }) =>
      ReadingGroupService.updatePostComment(id, { content: value }),
    onSuccess: async () => {
      setEditing(null)
      setEditingContent("")
      await refresh()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => ReadingGroupService.deletePostComment(id),
    onSuccess: refresh,
  })

  const submitComment = async (event: React.FormEvent) => {
    event.preventDefault()
    const value = content.trim()
    if (!value) return setError("댓글 내용을 입력해 주세요.")
    setError("")
    try {
      await createMutation.mutateAsync(value)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "댓글을 저장하지 못했습니다.")
    }
  }

  const saveEdit = async (event: React.FormEvent) => {
    event.preventDefault()
    const value = editingContent.trim()
    if (!editing || !value) return setError("댓글 내용을 입력해 주세요.")
    setError("")
    try {
      await updateMutation.mutateAsync({ id: editing.id, value })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "댓글을 수정하지 못했습니다.")
    }
  }

  const removeComment = (comment: GroupPostComment) => {
    setPendingDelete(comment)
  }

  const executeRemoveComment = async (comment: GroupPostComment) => {
    setError("")
    try {
      await deleteMutation.mutateAsync(comment.id)
      setPendingDelete(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "댓글을 삭제하지 못했습니다.")
      setPendingDelete(null)
    }
  }

  const busy =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending

  return (
    <section className="mt-4 border-t border-theme-tertiary pt-4" aria-label="댓글">
      <h4 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-theme-primary">
        <MessageCircle className="h-4 w-4" aria-hidden />
        댓글 {commentsQuery.data ? `(${commentsQuery.data.length})` : ""}
      </h4>
      {commentsQuery.isLoading && (
        <p className="text-sm text-theme-secondary" role="status">
          댓글을 불러오는 중…
        </p>
      )}
      {commentsQuery.isError && (
        <p className="text-sm text-red-600" role="alert">
          댓글을 불러오지 못했습니다.
        </p>
      )}
      {commentsQuery.data && (
        <ul className="mb-4 space-y-2">
          {commentsQuery.data.map((comment) => {
            const isAuthor = comment.author_user_id === userUid
            return (
              <li key={comment.id} className="rounded-lg bg-theme-secondary p-3">
                {editing?.id === comment.id ? (
                  <form onSubmit={saveEdit} className="space-y-2">
                    <label className="sr-only" htmlFor={`comment-edit-${comment.id}`}>
                      댓글 수정
                    </label>
                    <textarea
                      id={`comment-edit-${comment.id}`}
                      required
                      rows={2}
                      value={editingContent}
                      onChange={(event) => setEditingContent(event.target.value)}
                      className="form-control form-control-textarea"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditing(null)}
                        className="rounded-md px-2.5 py-1.5 text-xs text-theme-secondary"
                      >
                        취소
                      </button>
                      <button
                        type="submit"
                        disabled={busy}
                        className="rounded-md bg-accent-theme px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        저장
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-medium text-theme-primary">
                          {comment.author_display_name}
                        </p>
                        <p className="text-[11px] text-theme-secondary">
                          {formatDate(comment.created_at)}
                        </p>
                      </div>
                      {(isAuthor || isOwner) && (
                        <div className="flex shrink-0 gap-1">
                          {isAuthor && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditing(comment)
                                setEditingContent(comment.content)
                              }}
                              className="rounded p-1.5 text-theme-secondary hover:bg-theme-tertiary"
                              aria-label={`${comment.author_display_name} 댓글 수정`}
                            >
                              <Pencil className="h-3.5 w-3.5" aria-hidden />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => void removeComment(comment)}
                            disabled={busy}
                            className="rounded p-1.5 text-red-600 hover:bg-theme-tertiary disabled:opacity-50"
                            aria-label={`${comment.author_display_name} 댓글 삭제`}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm text-theme-primary">
                      {comment.content}
                    </p>
                  </>
                )}
              </li>
            )
          })}
          {!commentsQuery.data.length && (
            <li className="text-sm text-theme-secondary">첫 댓글을 남겨 보세요.</li>
          )}
        </ul>
      )}
      <form onSubmit={submitComment} className="flex items-end gap-2">
        <label className="min-w-0 flex-1 text-xs font-medium text-theme-primary">
          댓글 작성
          <textarea
            required
            rows={2}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            className="form-control form-control-textarea mt-1"
            placeholder="댓글을 입력하세요"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="shrink-0 rounded-lg bg-accent-theme px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          등록
        </button>
      </form>
      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <ConfirmModal
        isOpen={Boolean(pendingDelete)}
        onClose={() => {
          if (deleteMutation.isPending) return
          setPendingDelete(null)
        }}
        onConfirm={() => {
          if (!pendingDelete || deleteMutation.isPending) return
          void executeRemoveComment(pendingDelete)
        }}
        title="댓글 삭제"
        message="댓글을 삭제할까요?"
        confirmText={deleteMutation.isPending ? "삭제 중…" : "삭제"}
        cancelText="취소"
        icon={Trash2}
      />
    </section>
  )
}

export default function GroupPostsPanel({
  groupId,
  initialPosts,
  isOwner,
  userUid,
  displayName,
  onChangedAction,
}: Props) {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<GroupPostType | "all">("all")
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<GroupPost | null>(null)
  const [draft, setDraft] = useState<PostDraft>(() => newDraft(isOwner))
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [pendingDeletePost, setPendingDeletePost] = useState<GroupPost | null>(
    null,
  )

  const postsQuery = useQuery({
    queryKey: queryKeys.readingGroups.posts(groupId),
    queryFn: () => ReadingGroupService.getGroupPosts(groupId),
    initialData: initialPosts,
  })

  const posts = useMemo(
    () =>
      [...(postsQuery.data ?? [])]
        .filter((post) => filter === "all" || post.type === filter)
        .sort((a, b) => {
          if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
          return (b.created_at?.getTime() ?? 0) - (a.created_at?.getTime() ?? 0)
        }),
    [filter, postsQuery.data],
  )

  const refreshPosts = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.readingGroups.posts(groupId),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.readingGroups.detail(groupId),
      }),
      onChangedAction(),
    ])
  }

  const openCreate = () => {
    setEditing(null)
    setDraft(newDraft(isOwner))
    setError("")
    setModalOpen(true)
  }

  const openEdit = (post: GroupPost) => {
    setEditing(post)
    setDraft(editDraft(post))
    setError("")
    setModalOpen(true)
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const title = draft.title.trim()
    const content = draft.content.trim()
    if (!title || !content) return setError("제목과 본문을 모두 입력해 주세요.")
    const operational = OPERATIONAL_TYPES.has(draft.type)
    if (!isOwner && draft.type !== "member_post") {
      return setError("모임원은 모임원 글만 작성할 수 있습니다.")
    }
    const version = Number(draft.version)
    if (operational && (!Number.isInteger(version) || version < 1)) {
      return setError("버전은 1 이상의 정수여야 합니다.")
    }

    setBusy(true)
    setError("")
    try {
      if (editing) {
        await ReadingGroupService.updatePost(editing.id, {
          title,
          content,
          ...(operational && isOwner
            ? {
                is_pinned: draft.isPinned,
                version,
                published_at: draft.publishedAt
                  ? new Date(draft.publishedAt).toISOString()
                  : new Date().toISOString(),
              }
            : {}),
        })
      } else {
        await ReadingGroupService.createPost(groupId, {
          author_user_id: userUid,
          author_display_name: displayName,
          type: isOwner ? draft.type : "member_post",
          title,
          content,
          is_pinned: operational && isOwner ? draft.isPinned : false,
          version: operational && isOwner ? version : undefined,
          published_at:
            operational && isOwner
              ? draft.publishedAt
                ? new Date(draft.publishedAt).toISOString()
                : new Date().toISOString()
              : undefined,
        })
      }
      await refreshPosts()
      setModalOpen(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "게시물을 저장하지 못했습니다.")
    } finally {
      setBusy(false)
    }
  }

  const removePost = (post: GroupPost) => {
    setPendingDeletePost(post)
  }

  const executeRemovePost = async (post: GroupPost) => {
    setBusy(true)
    setError("")
    try {
      await ReadingGroupService.deletePost(post.id)
      setExpandedIds((current) => {
        const next = new Set(current)
        next.delete(post.id)
        return next
      })
      await refreshPosts()
      setPendingDeletePost(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "게시물을 삭제하지 못했습니다.")
      setPendingDeletePost(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-theme-primary">공지·규칙·모임원 글</h2>
          <p className="mt-1 text-xs text-theme-secondary">
            고정 글을 먼저, 같은 조건에서는 최신 글부터 표시합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent-theme px-3 py-2 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" aria-hidden />
          글쓰기
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="게시물 유형 필터">
        {[{ value: "all" as const, label: "전체" }, ...POST_TYPES].map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            aria-pressed={filter === item.value}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
              filter === item.value
                ? "bg-accent-theme text-white"
                : "bg-theme-tertiary text-theme-secondary"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300" role="alert">
          {error}
        </p>
      )}

      {!posts.length ? (
        <p className="rounded-lg border border-dashed border-theme-tertiary p-8 text-center text-sm text-theme-secondary">
          이 유형의 게시물이 없습니다.
        </p>
      ) : (
        <ul className="space-y-3">
          {posts.map((post) => {
            const expanded = expandedIds.has(post.id)
            const isAuthor = post.author_user_id === userUid
            const operational = OPERATIONAL_TYPES.has(post.type)
            const canEdit =
              (operational && isOwner) || (!operational && !isOwner && isAuthor)
            const canDelete = isAuthor || isOwner
            return (
              <li key={post.id} className="rounded-xl bg-theme-tertiary p-4">
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedIds((current) => {
                        const next = new Set(current)
                        if (next.has(post.id)) next.delete(post.id)
                        else next.add(post.id)
                        return next
                      })
                    }
                    className="min-w-0 flex-1 text-left"
                    aria-expanded={expanded}
                    aria-controls={`post-detail-${post.id}`}
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      {post.is_pinned && (
                        <Pin className="h-3.5 w-3.5 text-accent-theme" aria-label="고정 글" />
                      )}
                      <span className="rounded-full bg-theme-secondary px-2 py-0.5 text-[11px] font-medium text-theme-secondary">
                        {typeLabel(post.type)}
                      </span>
                      {operational && post.version && (
                        <span className="text-[11px] text-theme-secondary">v{post.version}</span>
                      )}
                    </div>
                    <h3 className="mt-2 break-words font-semibold text-theme-primary">{post.title}</h3>
                    <p className="mt-1 text-xs text-theme-secondary">
                      {post.author_display_name} · {formatDate(post.published_at ?? post.created_at)}
                    </p>
                  </button>
                  <div className="flex shrink-0 items-center gap-1">
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => openEdit(post)}
                        className="rounded-md bg-theme-secondary p-2 text-theme-primary"
                        aria-label={`${post.title} 수정`}
                      >
                        <Pencil className="h-4 w-4" aria-hidden />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => void removePost(post)}
                        disabled={busy}
                        className="rounded-md bg-theme-secondary p-2 text-red-600 disabled:opacity-50"
                        aria-label={`${post.title} 삭제`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedIds((current) => {
                          const next = new Set(current)
                          if (next.has(post.id)) next.delete(post.id)
                          else next.add(post.id)
                          return next
                        })
                      }
                      className="rounded-md bg-theme-secondary p-2 text-theme-secondary"
                      aria-label={expanded ? `${post.title} 접기` : `${post.title} 펼치기`}
                    >
                      {expanded ? (
                        <ChevronUp className="h-4 w-4" aria-hidden />
                      ) : (
                        <ChevronDown className="h-4 w-4" aria-hidden />
                      )}
                    </button>
                  </div>
                </div>
                {expanded && (
                  <div id={`post-detail-${post.id}`}>
                    <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-theme-primary">
                      {post.content}
                    </p>
                    <CommentsSection
                      groupId={groupId}
                      postId={post.id}
                      userUid={userUid}
                      displayName={displayName}
                      isOwner={isOwner}
                    />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <FormModalFrame
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "게시물 수정" : "새 게시물"}
        size="wide"
        interactionLocked={busy}
      >
        <form onSubmit={submit} className="space-y-4">
          {isOwner && !editing && (
            <label className="block text-sm font-medium text-theme-primary">
              유형
              <Select
                id="group-post-type"
                value={draft.type}
                onChangeAction={(type) => {
                  setDraft({
                    ...draft,
                    type,
                    isPinned: OPERATIONAL_TYPES.has(type) ? draft.isPinned : false,
                  })
                }}
                options={POST_TYPES}
                className="mt-1"
                aria-label="게시물 유형"
              />
            </label>
          )}
          {!isOwner && (
            <p className="rounded-lg bg-theme-tertiary p-3 text-sm text-theme-secondary">
              모임원 글로 등록됩니다.
            </p>
          )}
          <label className="block text-sm font-medium text-theme-primary">
            제목
            <input
              required
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              className="form-control mt-1"
            />
          </label>
          <label className="block text-sm font-medium text-theme-primary">
            본문
            <textarea
              required
              rows={8}
              value={draft.content}
              onChange={(event) => setDraft({ ...draft, content: event.target.value })}
              className="form-control form-control-textarea mt-1"
            />
          </label>
          {isOwner && OPERATIONAL_TYPES.has(draft.type) && (
            <fieldset className="space-y-3 rounded-lg border border-theme-tertiary p-3">
              <legend className="px-1 text-sm font-semibold text-theme-primary">운영 문서 설정</legend>
              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-theme-primary">
                <input
                  type="checkbox"
                  checked={draft.isPinned}
                  onChange={(event) => setDraft({ ...draft, isPinned: event.target.checked })}
                  className="peer sr-only"
                />
                <span
                  className="h-4 w-4 shrink-0 rounded border border-theme-secondary bg-theme-primary ring-offset-2 peer-checked:border-accent-theme peer-checked:bg-accent-theme peer-focus-visible:ring-2 peer-focus-visible:ring-accent-theme"
                  aria-hidden
                />
                목록 상단에 고정
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium text-theme-primary">
                  버전
                  <input
                    type="number"
                    min={1}
                    step={1}
                    required
                    value={draft.version}
                    onChange={(event) => setDraft({ ...draft, version: event.target.value })}
                    className="form-control mt-1"
                  />
                </label>
                <label className="text-sm font-medium text-theme-primary">
                  게시 일시
                  <FormNativePickerInput
                    picker="datetime-local"
                    required
                    value={draft.publishedAt}
                    onChange={(event) => setDraft({ ...draft, publishedAt: event.target.value })}
                    wrapperClassName="mt-1"
                  />
                </label>
              </div>
            </fieldset>
          )}
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-lg bg-theme-tertiary px-4 py-2 text-sm font-medium text-theme-primary"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-accent-theme px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? "저장 중…" : "저장"}
            </button>
          </div>
        </form>
      </FormModalFrame>

      <ConfirmModal
        isOpen={Boolean(pendingDeletePost)}
        onClose={() => {
          if (busy) return
          setPendingDeletePost(null)
        }}
        onConfirm={() => {
          if (!pendingDeletePost || busy) return
          void executeRemovePost(pendingDeletePost)
        }}
        title="게시물 삭제"
        message={
          pendingDeletePost
            ? `‘${pendingDeletePost.title}’ 게시물을 삭제할까요?`
            : ""
        }
        confirmText={busy ? "삭제 중…" : "삭제"}
        cancelText="취소"
        icon={Trash2}
      />
    </div>
  )
}
