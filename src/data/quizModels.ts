export type Difficulty = 'easy' | 'hard'

export type QuizTrackId = 'core' | 'game-dev'

export type QuizFormatId = 'identify-language' | 'fix-error'

export type CoreLanguageId =
  | 'python'
  | 'java'
  | 'javascript'
  | 'html'
  | 'css'
  | 'json'
  | 'csharp'
  | 'cpp'
  | 'flutter'
  | 'dart'
  | 'go'
  | 'kotlin'
  | 'swift'
  | 'ruby'
  | 'jsx'
  | 'typescript'
  | 'bash'
  | 'cloud-functions'
  | 'sql'
  | 'php'
  | 'rust'

export type GameLanguageId =
  | 'roblox-lua'
  | 'love2d-lua'
  | 'godot-gdscript'
  | 'godot-shader'
  | 'unity-csharp'
  | 'unity-shaderlab'
  | 'unreal-cpp'
  | 'glsl'
  | 'phaser-typescript'
  | 'rpg-maker-js'
  | 'gamemaker-gml'
  | 'defold-lua'
  | 'cocos-typescript'
  | 'bevy-rust'
  | 'renpy-python'

export type LanguageId = CoreLanguageId | GameLanguageId

export type GuideFamilyId = 'web' | 'app' | 'backend' | 'data' | 'system' | 'gameplay' | 'lifecycle' | 'shader'

export type LocalizedText = {
  th: string
  en: string
}

export type QuestionSeed = {
  snippetText: string
  distractors: [LanguageId, LanguageId, LanguageId]
  hint: LocalizedText
  signals: string[]
}

export type LanguageIdentifyQuestionSeed = QuestionSeed

export type QuestionBankItem = LanguageIdentifyQuestionSeed & {
  id: string
  format: 'identify-language'
  difficulty: Difficulty
  answer: LanguageId
}

export type LanguageIdentifyQuestionBankItem = QuestionBankItem

export type FixErrorChoice = {
  id: string
  label: LocalizedText
  lineNumber: number
  fragment: string
}

export type FixErrorExplanation = {
  correct: LocalizedText
  wrongChoices: Record<string, LocalizedText>
}

export type FixErrorQuestionSeed = {
  format: 'fix-error'
  track: 'core'
  language: CoreLanguageId
  errorText: LocalizedText
  snippetText: string
  choices: [FixErrorChoice, FixErrorChoice, FixErrorChoice, FixErrorChoice]
  answer: string
  hint: LocalizedText
  explanation: FixErrorExplanation
}

export type FixErrorQuestionBankItem = FixErrorQuestionSeed & {
  id: string
}

export type FutureQuizQuestionBankItem = LanguageIdentifyQuestionBankItem | FixErrorQuestionBankItem

export const createQuestionSet = (
  difficulty: Difficulty,
  answer: LanguageId,
  seeds: LanguageIdentifyQuestionSeed[],
): QuestionBankItem[] =>
  seeds.map((seed, index) => ({
    ...seed,
    id: `${difficulty}-${answer}-${index + 1}`,
    format: 'identify-language',
    difficulty,
    answer,
  }))
