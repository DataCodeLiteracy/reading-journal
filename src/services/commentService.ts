import { ApiClient } from "@/lib/apiClient"
import { Comment, ContentType } from "@/types/content"

export class CommentService {
  /**
   * 댓글 생성
   */
  static async createComment(
    user_id: string,
    contentType: ContentType,
    contentId: string,
    content: string,
    isPublic: boolean = true
  ): Promise<string> {
    try {
      // 댓글 생성
      const commentId = await ApiClient.createDocumentWithAutoId("comments", {
        user_id,
        contentType,
        contentId,
        content: content.trim(),
        isPublic,
        likesCount: 0,
        created_at: ApiClient.getServerTimestamp(),
        updated_at: ApiClient.getServerTimestamp(),
      })

      // 콘텐츠의 commentsCount 증가
      await this.incrementCommentsCount(contentType, contentId)

      // 댓글 작성자의 totalCommentsWritten 증가
      await this.incrementUserCommentsWritten(user_id)

      return commentId
    } catch (error) {
      console.error("CommentService.createComment error:", error)
      throw error
    }
  }

  /**
   * 댓글 조회
   */
  static async getComment(commentId: string): Promise<Comment | null> {
    try {
      return await ApiClient.getDocument<Comment>("comments", commentId)
    } catch (error) {
      console.error("CommentService.getComment error:", error)
      return null
    }
  }

  /**
   * 콘텐츠의 모든 댓글 조회
   */
  static async getContentComments(
    contentType: ContentType,
    contentId: string
  ): Promise<Comment[]> {
    try {
      return await ApiClient.queryDocuments<Comment>(
        "comments",
        [
          ["contentType", "==", contentType],
          ["contentId", "==", contentId],
        ],
        "created_at",
        "asc"
      )
    } catch (error) {
      console.error("CommentService.getContentComments error:", error)
      return []
    }
  }

  /**
   * 댓글 업데이트
   */
  static async updateComment(
    commentId: string,
    content: string
  ): Promise<void> {
    try {
      await ApiClient.updateDocument("comments", commentId, {
        content: content.trim(),
        updated_at: ApiClient.getServerTimestamp(),
      })
    } catch (error) {
      console.error("CommentService.updateComment error:", error)
      throw error
    }
  }

  /**
   * 댓글 삭제
   */
  static async deleteComment(
    commentId: string,
    contentType: ContentType,
    contentId: string
  ): Promise<void> {
    try {
      // 댓글 작성자 확인
      const comment = await this.getComment(commentId)
      if (!comment) {
        throw new Error("댓글을 찾을 수 없습니다.")
      }

      // 댓글 삭제
      await ApiClient.deleteDocument("comments", commentId)

      // 콘텐츠의 commentsCount 감소
      await this.decrementCommentsCount(contentType, contentId)

      // 댓글 작성자의 totalCommentsWritten 감소
      await this.decrementUserCommentsWritten(comment.user_id)
    } catch (error) {
      console.error("CommentService.deleteComment error:", error)
      throw error
    }
  }

  /**
   * 콘텐츠의 댓글 수 조회
   */
  static async getCommentsCount(
    contentType: ContentType,
    contentId: string
  ): Promise<number> {
    try {
      const comments = await ApiClient.queryDocuments<Comment>("comments", [
        ["contentType", "==", contentType],
        ["contentId", "==", contentId],
      ])

      return comments.length
    } catch (error) {
      console.error("CommentService.getCommentsCount error:", error)
      return 0
    }
  }

  /**
   * 콘텐츠의 commentsCount 증가
   */
  private static async incrementCommentsCount(
    contentType: ContentType,
    contentId: string
  ): Promise<void> {
    try {
      const collectionName = this.getCollectionName(contentType)
      const doc = await ApiClient.getDocument<any>(collectionName, contentId)

      if (doc) {
        const currentCount = doc.commentsCount || 0
        await ApiClient.updateDocument(collectionName, contentId, {
          commentsCount: currentCount + 1,
        })
      }
    } catch (error) {
      console.error("CommentService.incrementCommentsCount error:", error)
      // 에러가 발생해도 계속 진행 (캐시된 값이므로)
    }
  }

  /**
   * 콘텐츠의 commentsCount 감소
   */
  private static async decrementCommentsCount(
    contentType: ContentType,
    contentId: string
  ): Promise<void> {
    try {
      const collectionName = this.getCollectionName(contentType)
      const doc = await ApiClient.getDocument<any>(collectionName, contentId)

      if (doc) {
        const currentCount = doc.commentsCount || 0
        await ApiClient.updateDocument(collectionName, contentId, {
          commentsCount: Math.max(0, currentCount - 1),
        })
      }
    } catch (error) {
      console.error("CommentService.decrementCommentsCount error:", error)
      // 에러가 발생해도 계속 진행 (캐시된 값이므로)
    }
  }

  /**
   * 댓글 작성자의 totalCommentsWritten 증가
   */
  private static async incrementUserCommentsWritten(
    user_id: string
  ): Promise<void> {
    try {
      const { UserStatisticsService } = await import("./userStatisticsService")
      const stats = await UserStatisticsService.getUserStatistics(user_id)

      if (stats) {
        const currentComments = stats.totalCommentsWritten || 0
        await UserStatisticsService.createOrUpdateUserStatistics(user_id, {
          totalCommentsWritten: currentComments + 1,
        })

        // 레벨 및 경험치 재계산
        if (stats.totalReadingTime !== undefined) {
          await UserStatisticsService.updateLevelAndExperience(
            user_id,
            stats.totalReadingTime,
            stats.totalLikesReceived,
            currentComments + 1
          )
        }
      }
    } catch (error) {
      console.error("CommentService.incrementUserCommentsWritten error:", error)
      // 에러가 발생해도 계속 진행
    }
  }

  /**
   * 댓글 작성자의 totalCommentsWritten 감소
   */
  private static async decrementUserCommentsWritten(
    user_id: string
  ): Promise<void> {
    try {
      const { UserStatisticsService } = await import("./userStatisticsService")
      const stats = await UserStatisticsService.getUserStatistics(user_id)

      if (stats) {
        const currentComments = stats.totalCommentsWritten || 0
        await UserStatisticsService.createOrUpdateUserStatistics(user_id, {
          totalCommentsWritten: Math.max(0, currentComments - 1),
        })

        // 레벨 및 경험치 재계산
        if (stats.totalReadingTime !== undefined) {
          await UserStatisticsService.updateLevelAndExperience(
            user_id,
            stats.totalReadingTime,
            stats.totalLikesReceived,
            Math.max(0, currentComments - 1)
          )
        }
      }
    } catch (error) {
      console.error("CommentService.decrementUserCommentsWritten error:", error)
      // 에러가 발생해도 계속 진행
    }
  }

  /**
   * 콘텐츠 타입에 따른 컬렉션 이름 반환
   */
  private static getCollectionName(contentType: ContentType): string {
    switch (contentType) {
      case "quote":
        return "quotes"
      case "critique":
        return "critiques"
      case "review":
        return "books"
      case "question":
        return "bookQuestions"
      case "answer":
        return "questionAnswers"
      default:
        throw new Error(`Unknown contentType: ${contentType}`)
    }
  }
}

