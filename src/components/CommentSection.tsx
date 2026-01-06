"use client"

import { useState, useEffect } from "react"
import { Comment, ContentType } from "@/types/content"
import {
  MessageSquare,
  Send,
  Trash2,
  Edit,
  X,
  User as UserIcon,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { CommentService } from "@/services/commentService"
import { UserService } from "@/services/userService"
import { User } from "@/types/user"

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
      } catch (error) {
        console.error("Error loading comments:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadComments()
  }, [contentType, contentId, isPublic])

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
      alert("댓글 작성 중 오류가 발생했습니다.")
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
      alert("댓글 수정 중 오류가 발생했습니다.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("댓글을 삭제하시겠습니까?") || isSubmitting) return

    try {
      setIsSubmitting(true)
      await CommentService.deleteComment(commentId, contentType, contentId)

      // 댓글 목록 새로고침
      const updatedComments = await CommentService.getContentComments(
        contentType,
        contentId
      )
      setComments(updatedComments)
    } catch (error) {
      console.error("Error deleting comment:", error)
      alert("댓글 삭제 중 오류가 발생했습니다.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isPublic) {
    return null
  }

  return (
    <div className='mt-4 pt-4 border-t border-theme-tertiary'>
      <div className='flex items-center gap-2 mb-3'>
        <MessageSquare className='h-4 w-4 text-theme-secondary' />
        <h4 className='text-sm font-semibold text-theme-primary'>
          댓글 {comments.length}개
        </h4>
      </div>

      {/* 댓글 작성 폼 */}
      {userUid && (
        <div className='mb-4'>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder='댓글을 입력하세요...'
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
              <span>댓글 작성</span>
            </button>
          </div>
        </div>
      )}

      {/* 댓글 목록 */}
      {isLoading ? (
        <div className='text-center py-4'>
          <p className='text-sm text-theme-secondary'>댓글을 불러오는 중...</p>
        </div>
      ) : comments.length === 0 ? (
        <div className='text-center py-4'>
          <p className='text-sm text-theme-secondary'>
            {userUid
              ? "첫 댓글을 작성해보세요!"
              : "로그인 후 댓글을 작성할 수 있습니다."}
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
                            onClick={() => handleDeleteComment(comment.id)}
                            className='p-1 text-theme-secondary hover:text-red-500 transition-colors'
                            title='삭제'
                          >
                            <Trash2 className='h-3 w-3' />
                          </button>
                        </div>
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
    </div>
  )
}
