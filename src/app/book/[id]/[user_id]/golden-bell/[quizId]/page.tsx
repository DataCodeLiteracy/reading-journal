"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Trophy,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Check,
  X,
  HelpCircle,
} from "lucide-react"
import { GoldenBellService } from "@/services/goldenBellService"
import {
  GoldenBellQuiz,
  GoldenBellUserAnswer,
} from "@/types/goldenBell"
import { useAuth } from "@/contexts/AuthContext"
import { gradeShortAnswer } from "@/utils/textSimilarity"

type QuizState = "playing" | "reviewing" | "completed"

const normalizeQuestionType = (type: string): "객관식" | "단답형" | "서술형" => {
  const typeMap: Record<string, "객관식" | "단답형" | "서술형"> = {
    "multiple_choice": "객관식",
    "short_answer": "단답형",
    "essay": "서술형",
    "객관식": "객관식",
    "단답형": "단답형",
    "서술형": "서술형",
  }
  return typeMap[type] || "객관식"
}

export default function GoldenBellQuizPage({
  params,
}: {
  params: Promise<{ id: string; user_id: string; quizId: string }>
}) {
  const router = useRouter()
  const { userUid } = useAuth()

  const [resolvedParams, setResolvedParams] = useState<{
    id: string
    user_id: string
    quizId: string
  } | null>(null)
  const [quiz, setQuiz] = useState<GoldenBellQuiz | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [quizState, setQuizState] = useState<QuizState>("playing")
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({})
  const [results, setResults] = useState<GoldenBellUserAnswer[]>([])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    params.then((resolved) => {
      setResolvedParams(resolved)
    })
  }, [params])

  useEffect(() => {
    if (!resolvedParams) return

    const loadQuiz = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const quizData = await GoldenBellService.getQuizById(resolvedParams.quizId)

        if (!quizData) {
          setError("퀴즈를 찾을 수 없습니다.")
          return
        }

        setQuiz(quizData)
      } catch (err) {
        console.error("Error loading quiz:", err)
        setError("퀴즈를 불러오는 중 오류가 발생했습니다.")
      } finally {
        setIsLoading(false)
      }
    }

    loadQuiz()
  }, [resolvedParams])

  const currentQuestion = quiz?.questions[currentQuestionIndex]
  const totalQuestions = quiz?.questions.length || 0

  const handleAnswerSelect = (answer: string) => {
    if (quizState !== "playing" || !currentQuestion) return
    setUserAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: answer,
    }))
  }

  const handleTextAnswer = (answer: string) => {
    if (quizState !== "playing" || !currentQuestion) return
    setUserAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: answer,
    }))
  }

  const goToNextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex((prev) => prev + 1)
    }
  }

  const goToPrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1)
    }
  }

  // 문제 제출 및 자동 채점
  const handleSubmit = () => {
    if (!quiz) return

    const answersMap = new Map(quiz.answers.map((a) => [a.id, a]))

    const userResults: GoldenBellUserAnswer[] = quiz.questions.map((q) => {
      const userAnswer = userAnswers[q.id] || ""
      const correctAnswerObj = answersMap.get(q.id)
      const correctAnswer = correctAnswerObj?.answer || ""
      const questionType = normalizeQuestionType(q.type)

      if (questionType === "객관식") {
        // 객관식: 정확한 일치만 정답
        const isCorrect = userAnswer.trim() === correctAnswer.trim()
        return {
          questionId: q.id,
          questionType,
          userAnswer,
          correctAnswer,
          autoGraded: true,
          isCorrect,
        }
      } else if (questionType === "단답형") {
        // 단답형: 유사도 알고리즘으로 채점
        const gradingResult = gradeShortAnswer(correctAnswer, userAnswer)
        return {
          questionId: q.id,
          questionType,
          userAnswer,
          correctAnswer,
          autoGraded: true,
          similarity: gradingResult.similarity,
          isCorrect: gradingResult.isCorrect,
          manuallyGraded: false,
        }
      } else {
        // 서술형: 사용자가 직접 채점해야 함
        return {
          questionId: q.id,
          questionType,
          userAnswer,
          correctAnswer,
          autoGraded: false,
          isCorrect: false, // 초기값, 사용자가 확정
          manuallyGraded: false,
        }
      }
    })

    setResults(userResults)
    setQuizState("reviewing")
    setCurrentQuestionIndex(0)
  }

  // 사용자가 단답형/서술형 정답 여부 수정
  const handleManualGrade = (questionId: number, isCorrect: boolean) => {
    setResults((prev) =>
      prev.map((r) =>
        r.questionId === questionId
          ? { ...r, isCorrect, manuallyGraded: true }
          : r
      )
    )
  }

  // 최종 확정 및 저장
  const handleFinalSubmit = async () => {
    if (!quiz || !userUid) return

    // 서술형 중 확인 안 된 것 체크
    const unconfirmedEssays = results.filter(
      (r) => r.questionType === "서술형" && !r.manuallyGraded
    )

    if (unconfirmedEssays.length > 0) {
      alert(`서술형 ${unconfirmedEssays.length}문제의 정답 여부를 확인해주세요.`)
      // 첫 번째 미확인 문제로 이동
      const firstUnconfirmed = unconfirmedEssays[0]
      const idx = quiz.questions.findIndex((q) => q.id === firstUnconfirmed.questionId)
      if (idx >= 0) setCurrentQuestionIndex(idx)
      return
    }

    setIsSaving(true)

    try {
      await GoldenBellService.saveResult(
        quiz.id,
        quiz.bookTitle,
        quiz.difficulty,
        userUid,
        results,
        totalQuestions
      )
      setQuizState("completed")
    } catch (err) {
      console.error("Error saving result:", err)
      alert("결과 저장 중 오류가 발생했습니다.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleRetry = () => {
    setQuizState("playing")
    setCurrentQuestionIndex(0)
    setUserAnswers({})
    setResults([])
  }

  const getResultForQuestion = (questionId: number) => {
    return results.find((r) => r.questionId === questionId)
  }

  const answeredCount = Object.keys(userAnswers).length

  // 점수 계산
  const score = useMemo(() => {
    if (results.length === 0) return 0
    const correctCount = results.filter((r) => r.isCorrect).length
    return Math.round((correctCount / results.length) * 100)
  }, [results])

  const correctCount = results.filter((r) => r.isCorrect).length

  // 리뷰 진행 상황 (서술형 확인 필요한 것들)
  const reviewProgress = useMemo(() => {
    const needsManualReview = results.filter(
      (r) => r.questionType === "서술형" || (r.questionType === "단답형" && !r.autoGraded)
    )
    const reviewed = needsManualReview.filter((r) => r.manuallyGraded)
    return { total: needsManualReview.length, done: reviewed.length }
  }, [results])

  // 서술형 확인 완료 여부
  const allEssaysReviewed = useMemo(() => {
    return results
      .filter((r) => r.questionType === "서술형")
      .every((r) => r.manuallyGraded)
  }, [results])

  if (isLoading) {
    return (
      <div className='min-h-screen bg-theme-gradient flex items-center justify-center'>
        <div className='text-center'>
          <div className='text-4xl mb-4'>🔔</div>
          <p className='text-theme-secondary'>퀴즈를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error || !quiz) {
    return (
      <div className='min-h-screen bg-theme-gradient flex items-center justify-center'>
        <div className='text-center'>
          <div className='text-4xl mb-4'>😢</div>
          <p className='text-theme-secondary mb-4'>{error || "퀴즈를 찾을 수 없습니다."}</p>
          <button
            onClick={() => router.back()}
            className='px-4 py-2 bg-accent-theme text-white rounded-lg'
          >
            돌아가기
          </button>
        </div>
      </div>
    )
  }

  // 완료 화면
  if (quizState === "completed") {
    return (
      <div className='min-h-screen bg-theme-gradient pb-20'>
        <div className='container mx-auto px-4 py-4'>
          <div className='bg-theme-secondary rounded-lg shadow-sm p-6'>
            <div className='text-center mb-8'>
              <Trophy className={`h-20 w-20 mx-auto mb-4 ${score >= 80 ? "text-yellow-500" : score >= 60 ? "text-blue-500" : "text-gray-400"}`} />
              <h2 className='text-3xl font-bold text-theme-primary mb-2'>
                {score}점
              </h2>
              <p className='text-theme-secondary'>
                {totalQuestions}문제 중 {correctCount}문제 정답
              </p>
            </div>

            {/* 문제별 결과 요약 */}
            <div className='mb-6'>
              <h3 className='text-lg font-semibold text-theme-primary mb-3'>문제별 결과</h3>
              <div className='space-y-2'>
                {results.map((r, idx) => {
                  const question = quiz.questions.find((q) => q.id === r.questionId)
                  return (
                    <div
                      key={r.questionId}
                      className={`p-3 rounded-lg ${
                        r.isCorrect
                          ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                          : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                      }`}
                    >
                      <div className='flex items-start gap-3'>
                        {r.isCorrect ? (
                          <CheckCircle className='h-5 w-5 text-green-500 shrink-0 mt-0.5' />
                        ) : (
                          <XCircle className='h-5 w-5 text-red-500 shrink-0 mt-0.5' />
                        )}
                        <div className='flex-1 min-w-0'>
                          <p className='text-sm font-medium text-theme-primary'>
                            {idx + 1}. {question?.question.slice(0, 50)}...
                          </p>
                          <div className='mt-1 text-xs'>
                            <span className={`px-1.5 py-0.5 rounded ${
                              r.questionType === "객관식"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                : r.questionType === "단답형"
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                                  : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                            }`}>
                              {r.questionType}
                            </span>
                            {r.manuallyGraded && (
                              <span className='ml-2 text-theme-tertiary'>직접 채점</span>
                            )}
                          </div>
                          {!r.isCorrect && (
                            <div className='mt-2 text-xs'>
                              <p className='text-red-600 dark:text-red-400'>내 답: {r.userAnswer || "(미입력)"}</p>
                              <p className='text-green-600 dark:text-green-400'>정답: {r.correctAnswer}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className='flex gap-3 justify-center'>
              <button
                onClick={handleRetry}
                className='flex items-center gap-2 px-4 py-2 border border-theme-tertiary text-theme-primary rounded-lg hover:bg-theme-tertiary transition-colors'
              >
                <RotateCcw className='h-4 w-4' />
                다시 풀기
              </button>
              <button
                onClick={() => router.push("/mypage/golden-bell")}
                className='px-4 py-2 bg-accent-theme text-white rounded-lg hover:bg-accent-theme-secondary transition-colors'
              >
                전체 기록 보기
              </button>
              <button
                onClick={() => router.back()}
                className='px-4 py-2 border border-theme-tertiary text-theme-primary rounded-lg hover:bg-theme-tertiary transition-colors'
              >
                돌아가기
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-theme-gradient pb-20'>
      <div className='container mx-auto px-4 py-4'>
        {/* 헤더 */}
        <div className='flex items-center gap-4 mb-6'>
          <button
            onClick={() => router.back()}
            className='p-2 rounded-full bg-theme-secondary shadow-sm hover:shadow-md transition-shadow'
          >
            <ArrowLeft className='h-5 w-5 text-theme-secondary' />
          </button>
          <div className='flex-1'>
            <h1 className='text-lg font-semibold text-theme-primary'>
              🔔 독서 골든벨
            </h1>
            <p className='text-sm text-theme-secondary'>
              {quiz.bookTitle} · {quiz.version}
            </p>
          </div>
        </div>

        {/* 리뷰 모드 안내 */}
        {quizState === "reviewing" && (
          <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4'>
            <div className='flex items-start gap-3'>
              <AlertCircle className='h-5 w-5 text-blue-500 shrink-0 mt-0.5' />
              <div>
                <p className='text-blue-700 dark:text-blue-300 font-medium'>채점 확인 중</p>
                <p className='text-blue-600 dark:text-blue-400 text-sm mt-1'>
                  객관식은 자동 채점되었습니다. 단답형과 서술형은 정답을 확인하고 맞음/틀림을 선택해주세요.
                </p>
                {!allEssaysReviewed && (
                  <p className='text-blue-500 dark:text-blue-400 text-xs mt-2'>
                    서술형 문제 확인 후 최종 제출할 수 있습니다.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 진행 상황 */}
        <div className='bg-theme-secondary rounded-lg shadow-sm p-4 mb-4'>
          <div className='flex items-center justify-between mb-2'>
            <span className='text-sm text-theme-secondary'>
              {quizState === "playing" ? "진행률" : "문제 확인"}
            </span>
            <span className='text-sm font-medium text-theme-primary'>
              {currentQuestionIndex + 1} / {totalQuestions}
            </span>
          </div>
          <div className='h-2 w-full overflow-hidden rounded-full bg-theme-tertiary'>
            <div
              className='h-full rounded-full bg-accent-theme transition-all duration-300'
              style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
            />
          </div>
          {quizState === "playing" && (
            <p className='text-xs text-theme-tertiary mt-2'>
              {answeredCount}개 답변 완료
            </p>
          )}
          {quizState === "reviewing" && (
            <div className='flex items-center justify-between mt-2 text-xs'>
              <span className='text-theme-tertiary'>
                현재 점수: <span className='font-medium text-theme-primary'>{score}점</span> ({correctCount}/{totalQuestions})
              </span>
            </div>
          )}
        </div>

        {/* 문제 카드 */}
        {currentQuestion && (
          <div className='bg-theme-secondary rounded-lg shadow-sm p-6 mb-4'>
            <div className='flex items-start gap-3 mb-4'>
              <span className={`px-2 py-1 text-xs font-medium rounded ${
                normalizeQuestionType(currentQuestion.type) === "객관식"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                  : normalizeQuestionType(currentQuestion.type) === "단답형"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                    : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
              }`}>
                {normalizeQuestionType(currentQuestion.type)}
              </span>
              {quizState === "reviewing" && (
                <>
                  {getResultForQuestion(currentQuestion.id)?.isCorrect ? (
                    <span className='px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'>
                      정답
                    </span>
                  ) : (
                    <span className='px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'>
                      오답
                    </span>
                  )}
                  {getResultForQuestion(currentQuestion.id)?.manuallyGraded && (
                    <span className='px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300'>
                      직접 채점
                    </span>
                  )}
                </>
              )}
            </div>

            <h3 className='text-lg font-medium text-theme-primary mb-6'>
              {currentQuestion.id}. {currentQuestion.question}
            </h3>

            {/* 객관식 선택지 */}
            {normalizeQuestionType(currentQuestion.type) === "객관식" && currentQuestion.options && currentQuestion.options.length > 0 && (
              <div className='space-y-3'>
                {currentQuestion.options.map((option, idx) => {
                  const isSelected = userAnswers[currentQuestion.id] === option
                  const result = getResultForQuestion(currentQuestion.id)
                  const isCorrectOption = result?.correctAnswer === option

                  let optionClass = "border-theme-tertiary hover:border-accent-theme"
                  if (quizState === "reviewing") {
                    if (isCorrectOption) {
                      optionClass = "border-green-500 bg-green-50 dark:bg-green-900/20"
                    } else if (isSelected && !result?.isCorrect) {
                      optionClass = "border-red-500 bg-red-50 dark:bg-red-900/20"
                    }
                  } else if (isSelected) {
                    optionClass = "border-accent-theme bg-accent-theme/10"
                  }

                  return (
                    <button
                      key={idx}
                      type='button'
                      onClick={() => handleAnswerSelect(option)}
                      disabled={quizState === "reviewing"}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${optionClass} ${quizState === "reviewing" ? "cursor-default" : ""}`}
                    >
                      <div className='flex items-center gap-3'>
                        <span className='w-6 h-6 flex items-center justify-center rounded-full bg-theme-tertiary text-theme-secondary text-sm font-medium'>
                          {idx + 1}
                        </span>
                        <span className='text-theme-primary flex-1'>{option}</span>
                        {quizState === "reviewing" && isCorrectOption && (
                          <CheckCircle className='h-5 w-5 text-green-500' />
                        )}
                        {quizState === "reviewing" && isSelected && !result?.isCorrect && (
                          <XCircle className='h-5 w-5 text-red-500' />
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {/* 단답형/서술형 입력 */}
            {(normalizeQuestionType(currentQuestion.type) === "단답형" || normalizeQuestionType(currentQuestion.type) === "서술형") && (
              <div>
                {normalizeQuestionType(currentQuestion.type) === "단답형" ? (
                  <input
                    type='text'
                    value={userAnswers[currentQuestion.id] || ""}
                    onChange={(e) => handleTextAnswer(e.target.value)}
                    disabled={quizState === "reviewing"}
                    placeholder='답을 입력하세요'
                    className='w-full px-4 py-3 border border-theme-tertiary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-theme bg-theme-primary text-theme-primary'
                  />
                ) : (
                  <textarea
                    value={userAnswers[currentQuestion.id] || ""}
                    onChange={(e) => handleTextAnswer(e.target.value)}
                    disabled={quizState === "reviewing"}
                    placeholder='답을 입력하세요'
                    rows={4}
                    className='w-full px-4 py-3 border border-theme-tertiary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-theme bg-theme-primary text-theme-primary resize-none'
                  />
                )}

                {/* 리뷰 모드: 정답 표시 및 채점 UI */}
                {quizState === "reviewing" && (
                  <div className='mt-4 space-y-3'>
                    {/* 내 답안 */}
                    <div className='p-3 rounded-lg bg-theme-tertiary/50'>
                      <p className='text-xs font-medium text-theme-tertiary mb-1'>내 답안</p>
                      <p className='text-theme-primary text-sm'>
                        {getResultForQuestion(currentQuestion.id)?.userAnswer || "(미입력)"}
                      </p>
                    </div>

                    {/* 정답 */}
                    <div className='p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'>
                      <p className='text-xs font-medium text-green-700 dark:text-green-300 mb-1'>정답</p>
                      <p className='text-green-800 dark:text-green-200 text-sm'>
                        {getResultForQuestion(currentQuestion.id)?.correctAnswer}
                      </p>
                    </div>

                    {/* 단답형: 유사도 표시 */}
                    {normalizeQuestionType(currentQuestion.type) === "단답형" && (
                      <div className='p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'>
                        <div className='flex items-center gap-2 mb-2'>
                          <HelpCircle className='h-4 w-4 text-blue-500' />
                          <p className='text-xs font-medium text-blue-700 dark:text-blue-300'>
                            자동 채점 유사도: {Math.round((getResultForQuestion(currentQuestion.id)?.similarity || 0) * 100)}%
                          </p>
                        </div>
                        <p className='text-blue-600 dark:text-blue-400 text-xs'>
                          {(getResultForQuestion(currentQuestion.id)?.similarity || 0) >= 0.75
                            ? "자동으로 정답 처리되었습니다. 틀렸다면 아래에서 수정하세요."
                            : "자동으로 오답 처리되었습니다. 맞았다면 아래에서 수정하세요."}
                        </p>
                      </div>
                    )}

                    {/* 채점 수정 버튼 (단답형/서술형) */}
                    <div className='flex items-center gap-3 pt-2'>
                      <span className='text-sm text-theme-secondary'>
                        {normalizeQuestionType(currentQuestion.type) === "서술형" 
                          ? "이 답안이 맞았나요?" 
                          : "채점 결과를 수정하시겠습니까?"}
                      </span>
                      <div className='flex gap-2'>
                        <button
                          onClick={() => handleManualGrade(currentQuestion.id, true)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            getResultForQuestion(currentQuestion.id)?.isCorrect
                              ? "bg-green-500 text-white"
                              : "bg-theme-tertiary text-theme-secondary hover:bg-green-100 hover:text-green-700"
                          }`}
                        >
                          <Check className='h-4 w-4' />
                          맞음
                        </button>
                        <button
                          onClick={() => handleManualGrade(currentQuestion.id, false)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            getResultForQuestion(currentQuestion.id)?.isCorrect === false && getResultForQuestion(currentQuestion.id)?.manuallyGraded
                              ? "bg-red-500 text-white"
                              : !getResultForQuestion(currentQuestion.id)?.isCorrect && !getResultForQuestion(currentQuestion.id)?.manuallyGraded && normalizeQuestionType(currentQuestion.type) === "단답형"
                                ? "bg-red-500 text-white"
                                : "bg-theme-tertiary text-theme-secondary hover:bg-red-100 hover:text-red-700"
                          }`}
                        >
                          <X className='h-4 w-4' />
                          틀림
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 객관식 해설 (리뷰 모드) */}
            {quizState === "reviewing" && normalizeQuestionType(currentQuestion.type) === "객관식" && (
              <div className='mt-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'>
                <p className='text-sm font-medium text-blue-700 dark:text-blue-300 mb-2'>
                  💡 해설
                </p>
                <p className='text-blue-600 dark:text-blue-400 text-sm'>
                  {quiz.answers.find((a) => a.id === currentQuestion.id)?.explanation}
                </p>
              </div>
            )}
          </div>
        )}

        {/* 네비게이션 버튼 */}
        <div className='flex gap-3'>
          <button
            onClick={goToPrevQuestion}
            disabled={currentQuestionIndex === 0}
            className='flex-1 flex items-center justify-center gap-2 py-3 px-4 border border-theme-tertiary text-theme-primary rounded-lg hover:bg-theme-tertiary transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
          >
            <ChevronLeft className='h-4 w-4' />
            이전
          </button>

          {currentQuestionIndex === totalQuestions - 1 ? (
            quizState === "playing" ? (
              <button
                onClick={handleSubmit}
                className='flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-accent-theme text-white rounded-lg hover:bg-accent-theme-secondary transition-colors'
              >
                채점하기
              </button>
            ) : (
              <button
                onClick={handleFinalSubmit}
                disabled={isSaving || !allEssaysReviewed}
                className='flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {isSaving ? "저장 중..." : "최종 제출"}
              </button>
            )
          ) : (
            <button
              onClick={goToNextQuestion}
              className='flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-accent-theme text-white rounded-lg hover:bg-accent-theme-secondary transition-colors'
            >
              다음
              <ChevronRight className='h-4 w-4' />
            </button>
          )}
        </div>

        {/* 문제 번호 네비게이션 */}
        <div className='mt-6 bg-theme-secondary rounded-lg shadow-sm p-4'>
          <p className='text-sm text-theme-secondary mb-3'>문제 바로가기</p>
          <div className='flex flex-wrap gap-2'>
            {quiz.questions.map((q, idx) => {
              const isAnswered = !!userAnswers[q.id]
              const result = getResultForQuestion(q.id)
              const isCurrent = idx === currentQuestionIndex
              const questionType = normalizeQuestionType(q.type)

              let btnClass = "bg-theme-tertiary text-theme-secondary"
              if (quizState === "reviewing" && result) {
                if (result.isCorrect) {
                  btnClass = "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                } else {
                  btnClass = "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                }
                // 서술형 미확인 표시
                if (questionType === "서술형" && !result.manuallyGraded) {
                  btnClass = "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                }
              } else if (isAnswered) {
                btnClass = "bg-accent-theme/20 text-accent-theme"
              }

              if (isCurrent) {
                btnClass += " ring-2 ring-accent-theme"
              }

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentQuestionIndex(idx)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${btnClass}`}
                >
                  {q.id}
                </button>
              )
            })}
          </div>
          {quizState === "reviewing" && (
            <div className='flex flex-wrap gap-3 mt-3 text-xs text-theme-tertiary'>
              <span className='flex items-center gap-1'>
                <span className='w-3 h-3 rounded bg-green-100 dark:bg-green-900/30' /> 정답
              </span>
              <span className='flex items-center gap-1'>
                <span className='w-3 h-3 rounded bg-red-100 dark:bg-red-900/30' /> 오답
              </span>
              <span className='flex items-center gap-1'>
                <span className='w-3 h-3 rounded bg-amber-100 dark:bg-amber-900/30' /> 확인 필요
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
