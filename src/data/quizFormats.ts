import type { Difficulty, LocalizedText, QuizFormatId, QuizTrackId } from './quizModels'

type DifficultyModeSetting = {
  label: LocalizedText
  description: LocalizedText
  hintLimit: number
  badge: LocalizedText
}

type StandardModeSetting = {
  label: LocalizedText
  description: LocalizedText
  hintLimit: number
  badge: LocalizedText
}

export type IdentifyLanguageFormatSetting = {
  id: 'identify-language'
  label: LocalizedText
  description: LocalizedText
  availableTracks: QuizTrackId[]
  questionsPerSession: number
  questionTimeLimitSeconds: number
  answerModel: 'language-id'
  difficulties: Record<Difficulty, DifficultyModeSetting>
}

export type FixErrorFormatSetting = {
  id: 'fix-error'
  label: LocalizedText
  description: LocalizedText
  availableTracks: ['core']
  questionsPerSession: number
  questionTimeLimitSeconds: number
  answerModel: 'choice-id'
  standard: StandardModeSetting
}

export type QuizFormatSetting = IdentifyLanguageFormatSetting | FixErrorFormatSetting

export const quizFormatSettings = {
  'identify-language': {
    id: 'identify-language',
    label: { th: 'ทายภาษา', en: 'Identify language' },
    description: {
      th: 'โหมดปัจจุบันที่ให้ดู snippet แล้วเลือกว่าภาษาอะไร',
      en: 'The current mode where players inspect a snippet and identify the language.',
    },
    availableTracks: ['core', 'game-dev'],
    questionsPerSession: 30,
    questionTimeLimitSeconds: 30,
    answerModel: 'language-id',
    difficulties: {
      easy: {
        label: { th: 'โหมดง่าย', en: 'Easy mode' },
        description: {
          th: 'snippet สั้นกว่า มอง marker หลักให้ไว และเหมาะกับการฝึกจับกลิ่นครั้งแรก',
          en: 'Shorter snippets that focus on the main markers and first-pass pattern recognition.',
        },
        hintLimit: 5,
        badge: { th: 'Hints 5 ครั้ง', en: '5 hints' },
      },
      hard: {
        label: { th: 'โหมดยาก', en: 'Hard mode' },
        description: {
          th: 'snippet ยาวขึ้น marker ลึกขึ้น และมีโครงสร้างที่แยกภาษาคล้ายกันได้ชัดกว่า',
          en: 'Longer snippets with deeper markers and structures that separate lookalike options more clearly.',
        },
        hintLimit: 7,
        badge: { th: 'Hints 7 ครั้ง', en: '7 hints' },
      },
    },
  },
  'fix-error': {
    id: 'fix-error',
    label: { th: 'Fix Error', en: 'Fix Error' },
    description: {
      th: 'อ่าน snippet แล้วใช้อาการ error ด้านล่างช่วยหา line ที่ทำให้โค้ดพัง',
      en: 'Inspect the snippet, then use the error underneath to locate the line that actually breaks the run.',
    },
    availableTracks: ['core'],
    questionsPerSession: 15,
    questionTimeLimitSeconds: 35,
    answerModel: 'choice-id',
    standard: {
      label: { th: 'Standard', en: 'Standard' },
      description: {
        th: '15 ข้อ เวลา 35 วินาทีต่อข้อ และใช้ hint รวมได้ 3 ครั้งต่อรอบ',
        en: '15 questions, 35 seconds per question, and 3 shared hints for the full round.',
      },
      hintLimit: 3,
      badge: { th: '15 ข้อ / 3 hints', en: '15 questions / 3 hints' },
    },
  },
} satisfies Record<QuizFormatId, QuizFormatSetting>

export const identifyLanguageFormat = quizFormatSettings['identify-language']
export const fixErrorFormat = quizFormatSettings['fix-error']
