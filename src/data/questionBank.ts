import { guideBookEntries, guideEntriesByTrack, guideFamilyLabels, guidePrimerSections, languageGuides, trackSettings, trackTopicIds } from './guideData'
import { easyQuestionBank as coreEasyQuestionBank } from './easyBank'
import { gameEasyQuestionBank } from './gameEasyBank'
import { gameHardQuestionBank } from './gameHardBank'
import { hardQuestionBank as coreHardQuestionBank } from './hardBank'
import { identifyLanguageFormat } from './quizFormats'
import type { Difficulty, LanguageId, LocalizedText, QuestionBankItem, QuizFormatId, QuizTrackId } from './quizModels'

export type { LanguageGuide, TrackSetting } from './guideData'

export const QUIZ_FORMAT: QuizFormatId = identifyLanguageFormat.id
export const QUESTIONS_PER_SESSION = identifyLanguageFormat.questionsPerSession
export const QUESTION_TIME_LIMIT_SECONDS = identifyLanguageFormat.questionTimeLimitSeconds
export const modeSettings: Record<
  Difficulty,
  {
    label: LocalizedText
    description: LocalizedText
    hintLimit: number
    badge: LocalizedText
  }
> = identifyLanguageFormat.difficulties

export const questionBanks: Record<QuizTrackId, Record<Difficulty, QuestionBankItem[]>> = {
  core: {
    easy: coreEasyQuestionBank,
    hard: coreHardQuestionBank,
  },
  'game-dev': {
    easy: gameEasyQuestionBank,
    hard: gameHardQuestionBank,
  },
}

const validateQuestionBank = (
  bank: QuestionBankItem[],
  expectedDistribution: Record<LanguageId, number>,
  label: string,
) => {
  const expectedSize = Object.values(expectedDistribution).reduce((total, count) => total + count, 0)

  if (bank.length !== expectedSize) {
    throw new Error(`Expected ${expectedSize} questions in ${label} but received ${bank.length}.`)
  }

  const counts = bank.reduce<Record<string, number>>((totals, item) => {
    totals[item.answer] = (totals[item.answer] ?? 0) + 1
    return totals
  }, {})

  for (const [topicId, expectedCount] of Object.entries(expectedDistribution)) {
    if ((counts[topicId] ?? 0) !== expectedCount) {
      throw new Error(`Unexpected question count for ${label} -> ${topicId}.`)
    }
  }

  for (const item of bank) {
    const options = new Set([item.answer, ...item.distractors])
    if (options.size !== 4) {
      throw new Error(`Question ${item.id} in ${label} does not have 4 unique choices.`)
    }
  }
}

const coreExpectedDistribution: Record<LanguageId, number> = {
  python: 4,
  java: 4,
  javascript: 4,
  html: 4,
  css: 4,
  json: 4,
  csharp: 4,
  cpp: 4,
  flutter: 3,
  dart: 3,
  go: 4,
  kotlin: 4,
  swift: 4,
  ruby: 4,
  jsx: 4,
  typescript: 4,
  bash: 4,
  'cloud-functions': 3,
  sql: 4,
  php: 4,
  rust: 3,
  'roblox-lua': 0,
  'love2d-lua': 0,
  'godot-gdscript': 0,
  'godot-shader': 0,
  'unity-csharp': 0,
  'unity-shaderlab': 0,
  'unreal-cpp': 0,
  glsl: 0,
  'phaser-typescript': 0,
  'rpg-maker-js': 0,
  'gamemaker-gml': 0,
  'defold-lua': 0,
  'cocos-typescript': 0,
  'bevy-rust': 0,
  'renpy-python': 0,
}

const gameExpectedDistribution: Record<LanguageId, number> = {
  python: 0,
  java: 0,
  javascript: 0,
  html: 0,
  css: 0,
  json: 0,
  csharp: 0,
  cpp: 0,
  flutter: 0,
  dart: 0,
  go: 0,
  kotlin: 0,
  swift: 0,
  ruby: 0,
  jsx: 0,
  typescript: 0,
  bash: 0,
  'cloud-functions': 0,
  sql: 0,
  php: 0,
  rust: 0,
  'roblox-lua': 6,
  'love2d-lua': 6,
  'godot-gdscript': 6,
  'godot-shader': 6,
  'unity-csharp': 6,
  'unity-shaderlab': 6,
  'unreal-cpp': 6,
  glsl: 6,
  'phaser-typescript': 6,
  'rpg-maker-js': 6,
  'gamemaker-gml': 6,
  'defold-lua': 5,
  'cocos-typescript': 5,
  'bevy-rust': 5,
  'renpy-python': 5,
}

validateQuestionBank(coreEasyQuestionBank, coreExpectedDistribution, 'core/easy')
validateQuestionBank(coreHardQuestionBank, coreExpectedDistribution, 'core/hard')
validateQuestionBank(gameEasyQuestionBank, gameExpectedDistribution, 'game-dev/easy')
validateQuestionBank(gameHardQuestionBank, gameExpectedDistribution, 'game-dev/hard')

export {
  guideBookEntries,
  guideEntriesByTrack,
  guideFamilyLabels,
  guidePrimerSections,
  languageGuides,
  trackSettings,
  trackTopicIds,
}

export type {
  Difficulty,
  FixErrorQuestionBankItem,
  GuideFamilyId,
  LanguageId,
  LanguageIdentifyQuestionBankItem,
  LocalizedText,
  QuestionBankItem,
  QuizFormatId,
  QuizTrackId,
} from './quizModels'
