"use client"

import { useState, useEffect } from "react"
import { Comment, ContentType } from "@/types/content"
import {
  MessageSquare,
  Send,
  Trash2,
  Edit,
  User as UserIcon,
  Heart,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { CommentService } from "@/services/commentService"
import { LikeService } from "@/services/likeService"
import { UserService } from "@/services/userService"
import { User } from "@/types/user"
import ConfirmModal from "@/components/ConfirmModal"

interface CommentSectionProps {
  contentType: ContentType
  contentId: string
  isPublic: boolean
  initialCommentsCount?: number
}

export default function CommentSection({
  contentType,
  contentId,
  isPublic,
  initialCommentsCount = 0,
}: CommentSectionProps) {
  const { userUid } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [commentAuthors, setCommentAuthors] = useState<Record<string, User>>({})
  const [newComment, setNewComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [commentLikeState, setCommentLikeState] = useState<Record<string, { isLiked: boolean; count: number }>>({})
  const [togglingLikeCommentId, setTogglingLikeCommentId] = useState<string | null>(null)
  const [commentToDeleteId, setCommentToDeleteId] = useState<string | null>(null)

  // 댓글 목록 로드
  useEffect(() => {
    if (!isPublic) {
      setIsLoading(false)
      return
    }

    const loadComments = async () => {
      try {
        setIsLoading(true)
        const loadedComments = await CommentService.getContentComments(
          contentType,
          contentId
        )
        setComments(loadedComments)

        // 작성자 정보 로드
        const authorIds = [...new Set(loadedComments.map((c) => c.user_id))]
        const authors: Record<string, User> = {}
        for (const authorId of authorIds) {
          const author = await UserService.getUser(authorId)
          if (author) {
            authors[authorId] = author
          }
        }
        setCommentAuthors(authors)

        // 댓글별 좋아요 상태 초기화 및 현재 유저 좋아요 여부 로드
        const nextLikeState: Record<string, { isLiked: boolean; count: number }> = {}
        for (const c of loadedComments) {
          nextLikeState[c.id] = { isLiked: false, count: c.likesCount || 0 }
        }
        if (userUid) {
          await Promise.all(
            loadedComments.map(async (c) => {
              const like = await LikeService.getUserLike(userUid, "comment", c.id)
              nextLikeState[c.id] = {
                isLiked: !!like,
                count: c.likesCount || 0,
              }
            })
          )
        }
        setCommentLikeState(nextLikeState)
      } catch (error) {
        console.error("Error loading comments:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadComments()
  }, [contentType, contentId, isPublic, userUid])

  const handleSubmitComment = async () => {
    if (!userUid || !newComment.trim() || isSubmitting) return

    try {
      setIsSubmitting(true)
      const commentId = await CommentService.createComment(
        userUid,
        contentType,
        contentId,
        newComment,
        true
      )

      // 댓글 목록 새로고침
      const updatedComments = await CommentService.getContentComments(
        contentType,
        contentId
      )
      setComments(updatedComments)
      setCommentLikeState((prev) => ({
        ...prev,
        [commentId]: { isLiked: false, count: 0 },
      }))

      // 새 댓글 작성자 정보 추가
      const currentUser = await UserService.getUser(userUid)
      if (currentUser) {
        setCommentAuthors((prev) => ({
          ...prev,
          [userUid]: currentUser,
        }))
      }

      setNewComment("")
    } catch (error) {
      console.error("Error submitting comment:", error)
      const msg =
        contentType === "question"
          ? "생각을 남기는 중 오류가 발생했습니다."
          : contentType === "quote"
            ? "생각을 남기는 중 오류가 발생했습니다."
            : contentType === "review" || contentType === "critique"
              ? "의견을 남기는 중 오류가 발생했습니다."
              : "댓글 작성 중 오류가 발생했습니다."
      alert(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditComment = async (commentId: string) => {
    if (!editingContent.trim() || isSubmitting) return

    try {
      setIsSubmitting(true)
      await CommentService.updateComment(commentId, editingContent)

      // 댓글 목록 새로고침
      const updatedComments = await CommentService.getContentComments(
        contentType,
        contentId
      )
      setComments(updatedComments)

      setEditingCommentId(null)
      setEditingContent("")
    } catch (error) {
      console.error("Error editing comment:", error)
      const msg =
        contentType === "question"
          ? "생각 수정 중 오류가 발생했습니다."
          : contentType === "quote"
            ? "생각 수정 중 오류가 발생했습니다."
            : contentType === "review" || contentType === "critique"
              ? "의견 수정 중 오류가 발생했습니다."
              : "댓글 수정 중 오류가 발생했습니다."
      alert(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const shortLabel =
    contentType === "question"
      ? "생각"
      : contentType === "quote"
        ? "생각"
        : contentType === "review" || contentType === "critique"
          ? "의견"
          : "댓글"

  const confirmDeleteComment = async () => {
    if (!commentToDeleteId) return

    try {
      setIsSubmitting(true)
      await CommentService.deleteComment(commentToDeleteId, contentType, contentId)

      const updatedComments = await CommentService.getContentComments(
        contentType,
        contentId
      )
      setComments(updatedComments)
      setCommentToDeleteId(null)
    } catch (error) {
      console.error("Error deleting comment:", error)
      alert(`${shortLabel} 삭제 중 오류가 발생했습니다.`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleCommentLike = async (commentId: string) => {
    if (!userUid || togglingLikeCommentId) return
    const current = commentLikeState[commentId]
    if (!current) return

    setTogglingLikeCommentId(commentId)
    try {
      if (current.isLiked) {
        await LikeService.removeLike(userUid, "comment", commentId)
        setCommentLikeState((prev) => ({
          ...prev,
          [commentId]: { isLiked: false, count: Math.max(0, (prev[commentId]?.count ?? 0) - 1) },
        }))
      } else {
        await LikeService.addLike(userUid, "comment", commentId)
        setCommentLikeState((prev) => ({
          ...prev,
          [commentId]: { isLiked: true, count: (prev[commentId]?.count ?? 0) + 1 },
        }))
      }
    } catch (error) {
      console.error("Error toggling comment like:", error)
    } finally {
      setTogglingLikeCommentId(null)
    }
  }

  if (!isPublic) {
    return null
  }

  const label =
    contentType === "question"
      ? "생각"
      : contentType === "quote"
        ? "생각"
        : contentType === "review"
          ? "의견"
          : contentType === "critique"
            ? "서평에 대한 의견"
            : "댓글"

  const writeGuide =
    contentType === "question"
      ? "질문을 읽고 떠오른 생각, 책 내용과 연결한 이해, 또는 자신만의 해석을 자유롭게 적어보세요. 여러 번 나눠 써도 좋습니다."
      : contentType === "quote"
        ? "이 구절이 왜 인상 깊었는지, 어떤 생각이나 감정이 들었는지, 다른 책·경험과 연결된다면 함께 적어보세요."
        : null

  return (
    <div className='mt-4 pt-4 border-t border-theme-tertiary'>
      <div className='flex items-center gap-2 mb-3'>
        <MessageSquare className='h-4 w-4 text-theme-secondary' />
        <h4 className='text-sm font-semibold text-theme-primary'>
          {label} {comments.length}개
        </h4>
      </div>

      {/* 댓글/답변 작성 폼 */}
      {userUid && (
        <div className='mb-4'>
          {writeGuide && (
            <p className='text-xs text-theme-secondary mb-2 px-1'>
              {writeGuide}
            </p>
          )}
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={
              contentType === "question"
                ? "생각을 남겨보세요..."
                : contentType === "quote"
                  ? "이 구절에 대한 생각을 남겨보세요..."
                  : contentType === "review"
                    ? "이 리뷰에 대한 의견을 남겨보세요..."
                    : contentType === "critique"
                      ? "이 서평에 대한 의견을 남겨보세요..."
                      : "댓글을 입력하세요..."
            }
            className='w-full px-3 py-2 border border-theme-tertiary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-theme bg-theme-primary text-theme-primary placeholder:text-theme-tertiary resize-none'
            rows={3}
          />
          <div className='flex justify-end mt-2'>
            <button
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || isSubmitting}
              className='flex items-center gap-2 px-4 py-2 bg-accent-theme hover:bg-accent-theme-secondary disabled:bg-theme-tertiary disabled:cursor-not-allowed text-white rounded-lg transition-colors'
            >
              <Send className='h-4 w-4' />
              <span>{contentType === "question" ? "생각 남기기" : contentType === "quote" ? "생각 남기기" : contentType === "review" ? "의견 남기기" : contentType === "critique" ? "서평에 대한 의견 남기기" : `${label} 작성`}</span>
            </button>
          </div>
        </div>
      )}

      {/* 댓글/답변 목록 */}
      {isLoading ? (
        <div className='text-center py-4'>
          <p className='text-sm text-theme-secondary'>
            {label}을 불러오는 중...
          </p>
        </div>
      ) : comments.length === 0 ? (
        <div className='text-center py-4'>
          <p className='text-sm text-theme-secondary'>
            {userUid
              ? (contentType === "question"
                  ? "첫 생각을 남겨보세요!"
                  : contentType === "quote"
                    ? "첫 생각을 남겨보세요!"
                    : contentType === "review" || contentType === "critique"
                      ? "첫 의견을 남겨보세요!"
                      : "첫 댓글을 작성해보세요!")
              : (contentType === "question"
                  ? "로그인 후 생각을 남길 수 있습니다."
                  : contentType === "quote"
                    ? "로그인 후 생각을 남길 수 있습니다."
                    : contentType === "review" || contentType === "critique"
                      ? "로그인 후 의견을 남길 수 있습니다."
                      : "로그인 후 댓글을 작성할 수 있습니다.")}
          </p>
        </div>
      ) : (
        <div className='space-y-3'>
          {comments.map((comment) => {
            const author = commentAuthors[comment.user_id]
            const isOwner = userUid === comment.user_id
            const isEditing = editingCommentId === comment.id

            return (
              <div
                key={comment.id}
                className='bg-theme-tertiary rounded-lg p-3'
              >
                {isEditing ? (
                  <div>
                    <textarea
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      className='w-full px-3 py-2 border border-theme-tertiary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-theme bg-theme-primary text-theme-primary resize-none mb-2'
                      rows={3}
                    />
                    <div className='flex justify-end gap-2'>
                      <button
                        onClick={() => {
                          setEditingCommentId(null)
                          setEditingContent("")
                        }}
                        className='px-3 py-1 text-theme-secondary hover:bg-theme-secondary rounded transition-colors'
                      >
                        취소
                      </button>
                      <button
                        onClick={() => handleEditComment(comment.id)}
                        disabled={!editingContent.trim() || isSubmitting}
                        className='px-3 py-1 bg-accent-theme hover:bg-accent-theme-secondary disabled:bg-theme-tertiary text-white rounded transition-colors'
                      >
                        저장
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className='flex items-start justify-between mb-2'>
                      <div className='flex items-center gap-2'>
                        {author?.photoURL ? (
                          <img
                            src={author.photoURL}
                            alt={author.displayName || "사용자"}
                            className='w-6 h-6 rounded-full'
                          />
                        ) : (
                          <div className='w-6 h-6 rounded-full bg-theme-secondary flex items-center justify-center'>
                            <UserIcon className='h-3 w-3 text-theme-tertiary' />
                          </div>
                        )}
                        <span className='text-sm font-medium text-theme-primary'>
                          {author?.displayName || author?.email || "익명"}
                        </span>
                        {comment.created_at && (
                          <span className='text-xs text-theme-tertiary'>
                            {new Date(comment.created_at).toLocaleDateString(
                              "ko-KR"
                            )}
                          </span>
                        )}
                      </div>
                      {isOwner && (
                        <div className='flex items-center gap-1'>
                          <button
                            onClick={() => {
                              setEditingCommentId(comment.id)
                              setEditingContent(comment.content)
                            }}
                            className='p-1 text-theme-secondary hover:text-blue-500 transition-colors'
                            title='수정'
                          >
                            <Edit className='h-3 w-3' />
                          </button>
                          <button
                            onClick={() => {
                              setCommentToDeleteId(comment.id)
                            }}
                            className='p-1 text-theme-secondary hover:text-red-500 transition-colors'
                            title='삭제'
                          >
                            <Trash2 className='h-3 w-3' />
                          </button>
                        </div>
                      )}
                      {/* 좋아요: 비소유자는 버튼, 소유자는 개수만 표시 */}
                      {!isOwner && userUid ? (
                        <button
                          onClick={() => handleToggleCommentLike(comment.id)}
                          disabled={togglingLikeCommentId === comment.id}
                          className='flex items-center gap-1 px-2 py-1 rounded text-theme-secondary hover:bg-theme-secondary transition-colors disabled:opacity-50'
                          title={commentLikeState[comment.id]?.isLiked ? "좋아요 취소" : "좋아요"}
                        >
                          <Heart
                            className={`h-3.5 w-3.5 ${commentLikeState[comment.id]?.isLiked ? "text-red-500 fill-red-500" : "text-red-500"}`}
                          />
                          <span className='text-xs'>{commentLikeState[comment.id]?.count ?? 0}</span>
                        </button>
                      ) : (
                        <span className='flex items-center gap-1 px-2 py-1 text-theme-secondary'>
                          <Heart className='h-3.5 w-3.5 text-red-500 fill-red-500' />
                          <span className='text-xs'>{commentLikeState[comment.id]?.count ?? 0}</span>
                        </span>
                      )}
                    </div>
                    <p className='text-sm text-theme-primary whitespace-pre-wrap'>
                      {comment.content}
                    </p>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      <ConfirmModal
        isOpen={!!commentToDeleteId}
        onClose={() => setCommentToDeleteId(null)}
        onConfirm={confirmDeleteComment}
        title={`${shortLabel} 삭제`}
        message={`이 ${shortLabel}을 삭제하시겠습니까?`}
        confirmText='삭제'
        cancelText='취소'
        icon={Trash2}
      />
    </div>
  )
}
