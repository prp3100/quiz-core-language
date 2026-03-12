export type Difficulty = 'easy' | 'hard'

export type QuizTrackId = 'core' | 'game-dev'

export type CoreLanguageId =
  | 'python'
  | 'java'
  | 'html'
  | 'css'
  | 'json'
  | 'csharp'
  | 'cpp'
  | 'flutter'
  | 'dart'
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

export type QuestionBankItem = QuestionSeed & {
  id: string
  difficulty: Difficulty
  answer: LanguageId
}

export const createQuestionSet = (
  difficulty: Difficulty,
  answer: LanguageId,
  seeds: QuestionSeed[],
): QuestionBankItem[] =>
  seeds.map((seed, index) => ({
    ...seed,
    id: `${difficulty}-${answer}-${index + 1}`,
    difficulty,
    answer,
  }))
