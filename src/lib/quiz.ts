import type { Difficulty, LanguageId, QuestionBankItem, QuizTrackId } from '../data/questionBank'

export type QuizQuestion = QuestionBankItem & {
  choices: LanguageId[]
}

export type RatingBand = {
  min: number
  max: number
  key: string
  label: {
    th: string
    en: string
  }
}

export type QuestionOutcome = {
  questionId: string
  answer: LanguageId
  selectedChoice: LanguageId | null
  isCorrect: boolean
  result: 'correct' | 'wrong' | 'timeout'
  hintUsed: boolean
  difficulty: Difficulty
  track: QuizTrackId
}

export const ratingBands: RatingBand[] = [
  { min: 0, max: 4, key: 'newbie', label: { th: 'Newbie🐣', en: 'Newbie🐣' } },
  { min: 5, max: 9, key: 'beginner', label: { th: 'Beginner🔍', en: 'Beginner🔍' } },
  { min: 10, max: 14, key: 'explorer', label: { th: 'Explorer💡', en: 'Explorer💡' } },
  { min: 15, max: 19, key: 'learner', label: { th: 'Learner⚡', en: 'Learner⚡' } },
  { min: 20, max: 24, key: 'skilled', label: { th: 'Skilled⚡🔥', en: 'Skilled⚡🔥' } },
  { min: 25, max: 27, key: 'expert', label: { th: 'Expert🏆', en: 'Expert🏆' } },
  { min: 28, max: 30, key: 'master', label: { th: 'Master', en: 'Master' } },
]

export const shuffleList = <T,>(items: T[]) => {
  const shuffled = [...items]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }

  return shuffled
}

type CreateQuizSessionOptions = {
  priorityTopics?: LanguageId[]
  priorityTopicLimit?: number
}

export const createQuizSession = (
  bank: QuestionBankItem[],
  totalQuestions: number,
  options: CreateQuizSessionOptions = {},
) => {
  const groupedByLanguage = new Map<LanguageId, QuestionBankItem[]>()

  for (const item of bank) {
    const group = groupedByLanguage.get(item.answer) ?? []
    groupedByLanguage.set(item.answer, [...group, item])
  }

  for (const [language, items] of groupedByLanguage.entries()) {
    groupedByLanguage.set(language, shuffleList(items))
  }

  const selected: QuestionBankItem[] = []
  const priorityTopics = [...new Set(options.priorityTopics ?? [])].filter((topicId) => groupedByLanguage.has(topicId))
  const priorityTopicLimit = Math.min(
    totalQuestions,
    options.priorityTopicLimit ?? Math.max(priorityTopics.length * 2, 6),
  )

  if (priorityTopics.length > 0) {
    while (selected.length < priorityTopicLimit) {
      let addedAny = false

      for (const topicId of priorityTopics) {
        if (selected.length === priorityTopicLimit) {
          break
        }

        const queue = groupedByLanguage.get(topicId)
        const nextQuestion = queue?.pop()

        if (nextQuestion) {
          selected.push(nextQuestion)
          addedAny = true
        }
      }

      if (!addedAny) {
        break
      }
    }
  }

  while (selected.length < totalQuestions) {
    const availableLanguages = shuffleList(
      [...groupedByLanguage.entries()]
        .filter(([, items]) => items.length > 0)
        .map(([language]) => language),
    )

    if (availableLanguages.length === 0) {
      break
    }

    for (const language of availableLanguages) {
      if (selected.length === totalQuestions) {
        break
      }

      const queue = groupedByLanguage.get(language)
      const nextQuestion = queue?.pop()

      if (nextQuestion) {
        selected.push(nextQuestion)
      }
    }
  }

  if (selected.length !== totalQuestions) {
    throw new Error(`Unable to build a ${totalQuestions}-question session.`)
  }

  return shuffleList(selected).map<QuizQuestion>((item) => ({
    ...item,
    choices: shuffleList([item.answer, ...item.distractors]),
  }))
}

export const getRatingBand = (score: number) => {
  const rating = ratingBands.find((band) => score >= band.min && score <= band.max)

  if (!rating) {
    throw new Error(`No rating band configured for score ${score}.`)
  }

  return rating
}

export const getOutcomeBreakdown = (outcomes: QuestionOutcome[]) => ({
  correct: outcomes.filter((outcome) => outcome.result === 'correct').length,
  wrong: outcomes.filter((outcome) => outcome.result === 'wrong').length,
  timeout: outcomes.filter((outcome) => outcome.result === 'timeout').length,
  hintsUsed: outcomes.filter((outcome) => outcome.hintUsed).length,
})
