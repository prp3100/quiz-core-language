import {
  FIX_ERROR_ALL_CORE_SCOPE,
  fixErrorQuestionBanks,
  fixErrorSupportedLanguageIds,
  type FixErrorScopeId,
  type FixErrorSupportedLanguageId,
} from '../data/fixErrorData'
import type {
  Difficulty,
  FixErrorQuestionBankItem,
  LanguageId,
  LanguageIdentifyQuestionBankItem,
  QuizTrackId,
} from '../data/questionBank'
import type { CoreLanguageId, FixErrorChoice } from '../data/quizModels'

export type IdentifyLanguageQuizQuestion = LanguageIdentifyQuestionBankItem & {
  choices: LanguageId[]
}

export type FixErrorQuizQuestion = FixErrorQuestionBankItem & {
  choices: [FixErrorChoice, FixErrorChoice, FixErrorChoice, FixErrorChoice]
}

export type QuizQuestion = IdentifyLanguageQuizQuestion | FixErrorQuizQuestion

export type RatingBand = {
  min: number
  max: number
  key: string
  label: {
    th: string
    en: string
  }
}

export type IdentifyLanguageOutcome = {
  questionId: string
  format: 'identify-language'
  answer: LanguageId
  selectedChoice: LanguageId | null
  isCorrect: boolean
  result: 'correct' | 'wrong' | 'timeout'
  hintUsed: boolean
  difficulty: Difficulty
  track: QuizTrackId
}

export type FixErrorOutcome = {
  questionId: string
  format: 'fix-error'
  language: CoreLanguageId
  answer: string
  selectedChoice: string | null
  isCorrect: boolean
  result: 'correct' | 'wrong' | 'timeout'
  hintUsed: boolean
  track: 'core'
}

export type QuestionOutcome = IdentifyLanguageOutcome | FixErrorOutcome

const ratingBandsByTotal: Record<number, RatingBand[]> = {
  30: [
    { min: 0, max: 4, key: 'newbie', label: { th: 'Newbie', en: 'Newbie' } },
    { min: 5, max: 9, key: 'beginner', label: { th: 'Beginner', en: 'Beginner' } },
    { min: 10, max: 14, key: 'explorer', label: { th: 'Explorer', en: 'Explorer' } },
    { min: 15, max: 19, key: 'learner', label: { th: 'Learner', en: 'Learner' } },
    { min: 20, max: 24, key: 'skilled', label: { th: 'Skilled', en: 'Skilled' } },
    { min: 25, max: 27, key: 'expert', label: { th: 'Expert', en: 'Expert' } },
    { min: 28, max: 30, key: 'master', label: { th: 'Master', en: 'Master' } },
  ],
  15: [
    { min: 0, max: 2, key: 'newbie', label: { th: 'Newbie', en: 'Newbie' } },
    { min: 3, max: 5, key: 'beginner', label: { th: 'Beginner', en: 'Beginner' } },
    { min: 6, max: 8, key: 'explorer', label: { th: 'Explorer', en: 'Explorer' } },
    { min: 9, max: 10, key: 'learner', label: { th: 'Learner', en: 'Learner' } },
    { min: 11, max: 12, key: 'skilled', label: { th: 'Skilled', en: 'Skilled' } },
    { min: 13, max: 14, key: 'expert', label: { th: 'Expert', en: 'Expert' } },
    { min: 15, max: 15, key: 'master', label: { th: 'Master', en: 'Master' } },
  ],
}

export const shuffleList = <T,>(items: T[]) => {
  const shuffled = [...items]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }

  return shuffled
}

type CreateIdentifyLanguageSessionOptions = {
  priorityTopics?: LanguageId[]
  priorityTopicLimit?: number
}

const shuffleFixErrorChoices = (choices: readonly FixErrorChoice[]) =>
  shuffleList([...choices]) as [FixErrorChoice, FixErrorChoice, FixErrorChoice, FixErrorChoice]

export const createIdentifyLanguageSession = (
  bank: LanguageIdentifyQuestionBankItem[],
  totalQuestions: number,
  options: CreateIdentifyLanguageSessionOptions = {},
) => {
  const groupedByLanguage = new Map<LanguageId, LanguageIdentifyQuestionBankItem[]>()

  for (const item of bank) {
    const group = groupedByLanguage.get(item.answer) ?? []
    groupedByLanguage.set(item.answer, [...group, item])
  }

  for (const [language, items] of groupedByLanguage.entries()) {
    groupedByLanguage.set(language, shuffleList(items))
  }

  const selected: LanguageIdentifyQuestionBankItem[] = []
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
    throw new Error(`Unable to build a ${totalQuestions}-question identify-language session.`)
  }

  return shuffleList(selected).map<IdentifyLanguageQuizQuestion>((item) => ({
    ...item,
    choices: shuffleList([item.answer, ...item.distractors]),
  }))
}

const createFixErrorSingleLanguageSession = (
  language: FixErrorSupportedLanguageId,
  totalQuestions: number,
): FixErrorQuizQuestion[] => {
  const selected = shuffleList(fixErrorQuestionBanks[language]).slice(0, totalQuestions)

  if (selected.length !== totalQuestions) {
    throw new Error(`Unable to build a ${totalQuestions}-question fix-error session for ${language}.`)
  }

  return selected.map((item) => ({
    ...item,
    choices: shuffleFixErrorChoices(item.choices),
  }))
}

const createFixErrorAllCoreSession = (totalQuestions: number): FixErrorQuizQuestion[] => {
  const grouped = new Map<FixErrorSupportedLanguageId, FixErrorQuestionBankItem[]>(
    fixErrorSupportedLanguageIds.map((language) => [language, shuffleList(fixErrorQuestionBanks[language])]),
  )

  const selected: FixErrorQuestionBankItem[] = []

  while (selected.length < totalQuestions) {
    const cycleLanguages = shuffleList(
      [...grouped.entries()]
        .filter(([, items]) => items.length > 0)
        .map(([language]) => language),
    )

    if (cycleLanguages.length === 0) {
      break
    }

    let addedAny = false

    for (const language of cycleLanguages) {
      if (selected.length === totalQuestions) {
        break
      }

      const queue = grouped.get(language)
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

  if (selected.length !== totalQuestions) {
    throw new Error(`Unable to build a ${totalQuestions}-question all-core fix-error session.`)
  }

  return shuffleList(selected).map((item) => ({
    ...item,
    choices: shuffleFixErrorChoices(item.choices),
  }))
}

export const createFixErrorSession = (scope: FixErrorScopeId, totalQuestions: number) =>
  scope === FIX_ERROR_ALL_CORE_SCOPE
    ? createFixErrorAllCoreSession(totalQuestions)
    : createFixErrorSingleLanguageSession(scope, totalQuestions)

export const getRatingBand = (score: number, totalQuestions: number) => {
  const ratingBands = ratingBandsByTotal[totalQuestions]

  if (!ratingBands) {
    throw new Error(`No rating bands configured for ${totalQuestions} questions.`)
  }

  const rating = ratingBands.find((band) => score >= band.min && score <= band.max)

  if (!rating) {
    throw new Error(`No rating band configured for score ${score}/${totalQuestions}.`)
  }

  return rating
}

export const getOutcomeBreakdown = (outcomes: QuestionOutcome[]) => ({
  correct: outcomes.filter((outcome) => outcome.result === 'correct').length,
  wrong: outcomes.filter((outcome) => outcome.result === 'wrong').length,
  timeout: outcomes.filter((outcome) => outcome.result === 'timeout').length,
  hintsUsed: outcomes.filter((outcome) => outcome.hintUsed).length,
})
