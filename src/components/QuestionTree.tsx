"use client"

import { useState } from "react"
import { ChevronRight, ChevronDown, BookOpen } from "lucide-react"
import { QuestionGroup, BookQuestion } from "@/types/question"
import QuestionCard from "./QuestionCard"

interface QuestionTreeProps {
  groups: QuestionGroup[]
  onQuestionClick?: (question: BookQuestion) => void
  onQuestionEdit?: (question: BookQuestion) => void
  onQuestionDelete?: (questionId: string) => void
  showActions?: boolean
  defaultExpanded?: boolean
}

export default function QuestionTree({
  groups,
  onQuestionClick,
  onQuestionEdit,
  onQuestionDelete,
  showActions = false,
  defaultExpanded = false,
}: QuestionTreeProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(defaultExpanded ? groups.map((g) => g.chapterPath.join("/")) : [])
  )

  const toggleGroup = (pathKey: string): void => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(pathKey)) {
      newExpanded.delete(pathKey)
    } else {
      newExpanded.add(pathKey)
    }
    setExpandedGroups(newExpanded)
  }

  const renderGroup = (
    group: QuestionGroup,
    depth: number = 0
  ): React.ReactElement => {
    const pathKey = group.chapterPath.join("/")
    const isExpanded = expandedGroups.has(pathKey)
    const hasSubGroups = group.subGroups && group.subGroups.length > 0
    const hasQuestions = group.questions.length > 0
    const displayPath =
      group.chapterPath.length > 0
        ? group.chapterPath[group.chapterPath.length - 1]
        : "전체"

    return (
      <div key={pathKey} className='mb-2'>
        {/* 그룹 헤더 */}
        {(hasSubGroups || hasQuestions) && (
          <div
            className={`flex items-center gap-2 p-2 rounded-lg hover:bg-theme-tertiary transition-colors cursor-pointer ${
              depth === 0 ? "bg-theme-secondary" : ""
            }`}
            style={{ paddingLeft: `${depth * 1.5 + 0.5}rem` }}
            onClick={() => toggleGroup(pathKey)}
          >
            {hasSubGroups ? (
              isExpanded ? (
                <ChevronDown className='h-4 w-4 text-theme-secondary flex-shrink-0' />
              ) : (
                <ChevronRight className='h-4 w-4 text-theme-secondary flex-shrink-0' />
              )
            ) : (
              <div className='w-4 h-4 flex-shrink-0' />
            )}
            <BookOpen className='h-4 w-4 text-theme-secondary flex-shrink-0' />
            <span className='font-medium text-theme-primary flex-1'>
              {displayPath}
            </span>
            <span className='text-xs text-theme-secondary bg-theme-tertiary px-2 py-1 rounded-full'>
              {group.questions.length}개
            </span>
          </div>
        )}

        {/* 질문 목록 */}
        {isExpanded && hasQuestions && (
          <div
            className='ml-4 mt-2 space-y-2'
            style={{ marginLeft: `${depth * 1.5 + 1}rem` }}
          >
            {group.questions.map((question) => (
              <div
                key={question.id}
                onClick={() => onQuestionClick?.(question)}
                className='cursor-pointer'
              >
                <QuestionCard
                  question={question}
                  onEdit={onQuestionEdit}
                  onDelete={onQuestionDelete}
                  showChapterPath={false}
                  showActions={showActions}
                />
              </div>
            ))}
          </div>
        )}

        {/* 하위 그룹 */}
        {isExpanded && hasSubGroups && (
          <div className='ml-2 mt-2'>
            {group.subGroups!.map((subGroup) =>
              renderGroup(subGroup, depth + 1)
            )}
          </div>
        )}
      </div>
    )
  }

  if (groups.length === 0) {
    return (
      <div className='text-center py-8 text-theme-secondary'>
        <BookOpen className='h-12 w-12 mx-auto mb-4 text-theme-tertiary' />
        <p>질문이 없습니다.</p>
      </div>
    )
  }

  return (
    <div className='space-y-2'>
      {groups.map((group) => renderGroup(group, 0))}
    </div>
  )
}
