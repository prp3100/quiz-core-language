import { Suspense, lazy, startTransition, useEffect, useEffectEvent, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import clsx from 'clsx'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Moon,
  ChevronDown,
  ChevronUp,
  Clock3,
  Gamepad2,
  Languages,
  Lightbulb,
  Play,
  RotateCcw,
  Sparkles,
  SunMedium,
  Trophy,
  WandSparkles,
  XCircle,
} from 'lucide-react'
import {
  guideBookEntries,
  guideFamilyLabels,
  guidePrimerSections,
  modeSettings,
  questionBanks,
  trackSettings,
  trackTopicIds,
  type Difficulty,
  type GuideFamilyId,
  type LanguageId,
  type QuizTrackId,
} from './data/questionBank'
import {
  FIX_ERROR_ALL_CORE_SCOPE,
  fixErrorSupportedLanguageIds,
  type FixErrorScopeId,
  type FixErrorSupportedLanguageId,
} from './data/fixErrorData'
import { fixErrorFormat, identifyLanguageFormat, quizFormatSettings } from './data/quizFormats'
import type { FixErrorChoice, QuizFormatId } from './data/quizModels'
import { LOCALE_STORAGE_KEY, getInitialLocale, getLanguageLabel, uiText, type Locale } from './lib/i18n'
import { useQuizAudio } from './lib/audio'
import { SyntaxSnippet } from './components/SyntaxSnippet'
import {
  createFixErrorSession,
  createIdentifyLanguageSession,
  getOutcomeBreakdown,
  getRatingBand,
  type FixErrorQuizQuestion,
  type IdentifyLanguageQuizQuestion,
  type QuestionOutcome,
  type QuizQuestion,
} from './lib/quiz'

type AppView = 'menu' | 'guide' | 'quiz' | 'result'
type QuizPhase = 'active' | 'feedback'
type GuideFilter = GuideFamilyId | 'all'
type ThemeMode = 'light' | 'dark'
type ComparisonState = {
  source: LanguageId
  target: LanguageId
}

const QuizStatsCharts = lazy(async () => {
  const module = await import('./components/QuizStatsCharts')
  return { default: module.QuizStatsCharts }
})

const TRACK_STORAGE_KEY = 'code-language-quiz:track'
const QUIZ_FORMAT_STORAGE_KEY = 'code-language-quiz:format'
const DIFFICULTY_STORAGE_KEY = 'code-language-quiz:difficulty'
const FIX_ERROR_SCOPE_STORAGE_KEY = 'code-language-quiz:fix-error-scope'
const VIEWED_GUIDES_STORAGE_KEY = 'code-language-quiz:viewed-guides'
const THEME_STORAGE_KEY = 'code-language-quiz:theme'

const choiceLetters = ['A', 'B', 'C', 'D'] as const

const screenMotion = {
  initial: { opacity: 0, y: 26 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.4, ease: 'easeOut' as const },
}

const outcomeToneMap = {
  correct: {
    surface: 'border-emerald-500/30 bg-emerald-500/10',
    text: 'text-emerald-700',
    icon: CheckCircle2,
  },
  wrong: {
    surface: 'border-rose-500/30 bg-rose-500/10',
    text: 'text-rose-700',
    icon: XCircle,
  },
  timeout: {
    surface: 'border-amber-500/30 bg-amber-500/10',
    text: 'text-amber-700',
    icon: Clock3,
  },
} as const

const trackIcons = {
  core: BookOpen,
  'game-dev': Gamepad2,
} satisfies Record<QuizTrackId, typeof BookOpen>

const chartFallback = <div className="h-[260px] rounded-[28px] border border-[var(--line)] bg-[var(--surface-strong)]" />

const panelClass =
  'rounded-[30px] border border-[var(--line)] bg-[var(--surface)]/95 p-5 shadow-[0_22px_46px_rgba(100,84,64,0.08)] backdrop-blur-xl md:p-6'

const softSurfaceClass = 'border-[var(--line)] bg-[var(--surface-soft)]'
const hoverSurfaceClass = 'hover:bg-[var(--surface-hover)]'

const formatTime = (value: number) => `00:${String(value).padStart(2, '0')}`

const formatSignals = (signals: string[]) => signals.map((signal) => `\`${signal}\``).join(', ')

const fixErrorSupportedLanguageSet = new Set<FixErrorSupportedLanguageId>(fixErrorSupportedLanguageIds)

const extraCopy = {
  th: {
    formatLabel: 'Quiz Format',
    profileLabel: 'Profile',
    scopeLabel: 'Language Scope',
    allCoreLabel: 'All Core',
    identifyFormatSummary: '30 ข้อ / Easy-Hard',
    standardSummary: 'Standard / 15 ข้อ / 3 hints',
    fixedCoreNote: 'Fix Error เล่นได้เฉพาะ core track',
    fixErrorRules: [
      'Fix Error เป็น standard mode อย่างเดียว 15 ข้อ และให้เวลา 35 วินาทีต่อข้อ',
      'มี hint รวม 3 ครั้งต่อรอบ และใช้ได้เฉพาะ core ที่รองรับใน phase นี้',
      'เลือกได้ว่าจะสุ่มจาก All Core หรือเจาะภาษาเดียว',
      'คำถามจะให้ดู snippet ก่อน แล้ววาง error ไว้ด้านล่างเพื่อระบุ line ที่น่าจะเป็นต้นเหตุหลัก',
    ],
    tryFixError: 'Try Fix Error',
    fixErrorQuestionLabel: 'โจทย์',
    fixErrorQuestionHint: 'อ่าน flow ของ snippet นี้ก่อน แล้วค่อยใช้ error ด้านล่างเพื่อชี้ว่าบรรทัดไหนคือต้นเหตุหลัก',
    errorTextLabel: 'Error',
    culpritLabel: 'จุดที่น่าจะพัง',
    correctLineLabel: 'Culprit line',
    choiceWhyLabel: 'Why each line is or is not the culprit',
    allCoreDescription: 'สุ่มข้ามภาษา core ที่รองรับทั้งหมด',
    singleCoreDescription: 'เจาะ language เดียวเพื่อซ้อมแก้จุดพัง',
    scopeNote: 'phase แรกยังไม่รวม html, css, json และ flutter',
    fixErrorBadge: 'Core only',
    fixErrorResultNote: 'สรุปโหมด Fix Error จะวัดหัวข้ออ่อนตามภาษา ไม่ใช่ตาม choice line',
  },
  en: {
    formatLabel: 'Quiz Format',
    profileLabel: 'Profile',
    scopeLabel: 'Language Scope',
    allCoreLabel: 'All Core',
    identifyFormatSummary: '30 questions / Easy-Hard',
    standardSummary: 'Standard / 15 questions / 3 hints',
    fixedCoreNote: 'Fix Error is available on the core track only',
    fixErrorRules: [
      'Fix Error uses a single standard profile: 15 questions and 35 seconds per question.',
      'The round has 3 shared hints and only uses the supported core subset in this phase.',
      'You can shuffle across All Core or drill into a single language.',
      'Each question shows the snippet first, then places the error underneath before you choose the culprit line.',
    ],
    tryFixError: 'Try Fix Error',
    fixErrorQuestionLabel: 'Question',
    fixErrorQuestionHint: 'Read this snippet as the failing scenario first, then use the error underneath to pinpoint the culprit line.',
    errorTextLabel: 'Error',
    culpritLabel: 'Possible culprit',
    correctLineLabel: 'Culprit line',
    choiceWhyLabel: 'Why each line is or is not the culprit',
    allCoreDescription: 'Shuffle across every supported core language',
    singleCoreDescription: 'Drill one language at a time',
    scopeNote: 'Phase 1 excludes html, css, json, and flutter.',
    fixErrorBadge: 'Core only',
    fixErrorResultNote: 'Fix Error summary tracks weak spots by language, not by line choice.',
  },
} as const

const persistStorage = (key: string, value: string) => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Ignore storage write failures in restricted browser contexts.
  }
}

const getInitialTrack = (): QuizTrackId => {
  if (typeof window === 'undefined') {
    return 'core'
  }

  const storedValue = window.localStorage.getItem(TRACK_STORAGE_KEY)
  return storedValue === 'core' || storedValue === 'game-dev' ? storedValue : 'core'
}

const getInitialQuizFormat = (): QuizFormatId => {
  if (typeof window === 'undefined') {
    return 'identify-language'
  }

  const storedValue = window.localStorage.getItem(QUIZ_FORMAT_STORAGE_KEY)
  return storedValue === 'identify-language' || storedValue === 'fix-error' ? storedValue : 'identify-language'
}

const getInitialDifficulty = (): Difficulty => {
  if (typeof window === 'undefined') {
    return 'easy'
  }

  const storedValue = window.localStorage.getItem(DIFFICULTY_STORAGE_KEY)
  return storedValue === 'easy' || storedValue === 'hard' ? storedValue : 'easy'
}

const getInitialFixErrorScope = (): FixErrorScopeId => {
  if (typeof window === 'undefined') {
    return FIX_ERROR_ALL_CORE_SCOPE
  }

  const storedValue = window.localStorage.getItem(FIX_ERROR_SCOPE_STORAGE_KEY)

  if (storedValue === FIX_ERROR_ALL_CORE_SCOPE) {
    return storedValue
  }

  return fixErrorSupportedLanguageSet.has(storedValue as FixErrorSupportedLanguageId)
    ? (storedValue as FixErrorSupportedLanguageId)
    : FIX_ERROR_ALL_CORE_SCOPE
}

const getInitialViewedGuideIds = (): LanguageId[] => {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const storedValue = window.localStorage.getItem(VIEWED_GUIDES_STORAGE_KEY)
    const parsed = storedValue ? JSON.parse(storedValue) : []

    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter(
      (value): value is LanguageId =>
        typeof value === 'string' && Object.prototype.hasOwnProperty.call(guideBookEntries, value),
    )
  } catch {
    return []
  }
}

const getInitialTheme = (): ThemeMode => {
  if (typeof window === 'undefined') {
    return 'light'
  }

  const storedValue = window.localStorage.getItem(THEME_STORAGE_KEY)

  if (storedValue === 'light' || storedValue === 'dark') {
    return storedValue
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const buildCorrectSummary = (locale: Locale, question: QuizQuestion) => {
  if (question.format !== 'identify-language') {
    return question.explanation.correct[locale]
  }

  const guide = guideBookEntries[question.answer]
  const signals = formatSignals(question.signals)

  return locale === 'th'
    ? `ข้อนี้คือ ${guide.label.th} เพราะ snippet นี้มี ${signals} ซึ่งตรงกับ marker หลักของหมวดนี้ ${guide.plainSummary.th} จำแบบไว ๆ ได้จากคำว่า “${guide.quickSpot.th}”`
    : `This is ${guide.label.en} because the snippet shows ${signals}, which matches the strongest markers for this topic. ${guide.plainSummary.en} A quick memory hook is: “${guide.quickSpot.en}”.`
}

const isIdentifyLanguageQuestion = (question: QuizQuestion | null): question is IdentifyLanguageQuizQuestion =>
  question?.format === 'identify-language'

const isFixErrorQuestion = (question: QuizQuestion | null): question is FixErrorQuizQuestion => question?.format === 'fix-error'

const isFixErrorSupportedLanguage = (topicId: LanguageId): topicId is FixErrorSupportedLanguageId =>
  fixErrorSupportedLanguageSet.has(topicId as FixErrorSupportedLanguageId)

function App() {
  const [locale, setLocale] = useState<Locale>(getInitialLocale)
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme)
  const [quizFormat, setQuizFormat] = useState<QuizFormatId>(getInitialQuizFormat)
  const [track, setTrack] = useState<QuizTrackId>(() => (getInitialQuizFormat() === 'fix-error' ? 'core' : getInitialTrack()))
  const [difficulty, setDifficulty] = useState<Difficulty>(getInitialDifficulty)
  const [fixErrorScope, setFixErrorScope] = useState<FixErrorScopeId>(getInitialFixErrorScope)
  const [view, setView] = useState<AppView>('menu')
  const [quizPhase, setQuizPhase] = useState<QuizPhase>('active')
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(identifyLanguageFormat.questionTimeLimitSeconds)
  const [outcomes, setOutcomes] = useState<QuestionOutcome[]>([])
  const [currentOutcome, setCurrentOutcome] = useState<QuestionOutcome | null>(null)
  const [hintedQuestionIds, setHintedQuestionIds] = useState<string[]>([])
  const [familyFilter, setFamilyFilter] = useState<GuideFilter>('all')
  const [expandedGuideId, setExpandedGuideId] = useState<LanguageId | null>(trackSettings[track].defaultGuideId)
  const [comparison, setComparison] = useState<ComparisonState | null>(null)
  const [viewedGuideIds, setViewedGuideIds] = useState<LanguageId[]>(getInitialViewedGuideIds)
  const audio = useQuizAudio()

  const copy = uiText[locale]
  const formatCopy = extraCopy[locale]
  const formatConfig = quizFormatSettings[quizFormat]
  const isFixErrorMode = quizFormat === 'fix-error'
  const activeTrack = isFixErrorMode ? 'core' : track
  const mode = isFixErrorMode ? fixErrorFormat.standard : modeSettings[difficulty]
  const currentTrack = trackSettings[activeTrack]
  const currentQuestion = questions[currentIndex] ?? null
  const hintsRemaining = Math.max(0, mode.hintLimit - hintedQuestionIds.length)
  const currentQuestionHintVisible = currentQuestion ? hintedQuestionIds.includes(currentQuestion.id) : false
  const score = outcomes.filter((outcome) => outcome.isCorrect).length
  const breakdown = getOutcomeBreakdown(outcomes)
  const totalQuestions = questions.length || formatConfig.questionsPerSession
  const rating = getRatingBand(score, totalQuestions)
  const isLastQuestion = currentIndex === questions.length - 1
  const timerProgress = `${(timeLeft / formatConfig.questionTimeLimitSeconds) * 100}%`
  const trackTopicList = trackTopicIds[activeTrack]
  const familyOptions = [...new Set(trackTopicList.map((topicId) => guideBookEntries[topicId].family))] as GuideFamilyId[]
  const filteredGuideIds =
    familyFilter === 'all'
      ? trackTopicList
      : trackTopicList.filter((topicId) => guideBookEntries[topicId].family === familyFilter)
  const trackViewedCount = trackTopicList.filter((topicId) => viewedGuideIds.includes(topicId)).length
  const screenView: AppView = view === 'quiz' && !currentQuestion ? 'menu' : view
  const currentFormatLabel = formatConfig.label[locale]
  const currentModeLabel = mode.label[locale]
  const currentModeBadge = mode.badge[locale]
  const currentScopeLabel =
    fixErrorScope === FIX_ERROR_ALL_CORE_SCOPE ? formatCopy.allCoreLabel : getLanguageLabel(locale, fixErrorScope)
  const activeIntroRules = isFixErrorMode ? formatCopy.fixErrorRules : copy.introRules
  const currentQuestionLabel =
    currentQuestion && isFixErrorQuestion(currentQuestion) ? formatCopy.fixErrorQuestionLabel : copy.snippetLabel
  const currentQuestionHint =
    currentQuestion && isFixErrorQuestion(currentQuestion) ? formatCopy.fixErrorQuestionHint : copy.snippetHint

  useEffect(() => {
    persistStorage(LOCALE_STORAGE_KEY, locale)
  }, [locale])

  useEffect(() => {
    persistStorage(QUIZ_FORMAT_STORAGE_KEY, quizFormat)
  }, [quizFormat])

  useEffect(() => {
    persistStorage(THEME_STORAGE_KEY, theme)
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
  }, [theme])

  useEffect(() => {
    persistStorage(TRACK_STORAGE_KEY, track)
  }, [track])

  useEffect(() => {
    persistStorage(DIFFICULTY_STORAGE_KEY, difficulty)
  }, [difficulty])

  useEffect(() => {
    persistStorage(FIX_ERROR_SCOPE_STORAGE_KEY, fixErrorScope)
  }, [fixErrorScope])

  useEffect(() => {
    persistStorage(VIEWED_GUIDES_STORAGE_KEY, JSON.stringify(viewedGuideIds))
  }, [viewedGuideIds])

  useEffect(() => {
    if (view !== 'quiz' || quizPhase !== 'active') {
      return
    }

    const intervalId = window.setInterval(() => {
      setTimeLeft((currentTime) => (currentTime > 0 ? currentTime - 1 : 0))
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [view, quizPhase, currentIndex])

  const onTimeout = useEffectEvent(() => {
    const question = questions[currentIndex]

    if (!question || view !== 'quiz' || quizPhase !== 'active') {
      return
    }

    const nextOutcome: QuestionOutcome =
      question.format === 'identify-language'
        ? {
            questionId: question.id,
            format: question.format,
            answer: question.answer,
            selectedChoice: null,
            isCorrect: false,
            result: 'timeout',
            hintUsed: hintedQuestionIds.includes(question.id),
            difficulty,
            track: activeTrack,
          }
        : {
            questionId: question.id,
            format: question.format,
            language: question.language,
            answer: question.answer,
            selectedChoice: null,
            isCorrect: false,
            result: 'timeout',
            hintUsed: hintedQuestionIds.includes(question.id),
            track: 'core',
          }

    setCurrentOutcome(nextOutcome)
    setOutcomes((current) => [...current, nextOutcome])
    audio.playError()
    setQuizPhase('feedback')
  })

  useEffect(() => {
    if (view === 'quiz' && quizPhase === 'active' && timeLeft === 0) {
      onTimeout()
    }
  }, [view, quizPhase, timeLeft])

  const applyTrackSelection = (nextTrack: QuizTrackId) => {
    setTrack(nextTrack)
    setFamilyFilter('all')
    setExpandedGuideId(trackSettings[nextTrack].defaultGuideId)
    setComparison(null)
  }

  const markGuideViewed = (topicId: LanguageId) => {
    setViewedGuideIds((current) => (current.includes(topicId) ? current : [...current, topicId]))
  }

  const startNewQuiz = ({
    nextFormat = quizFormat,
    nextTrack = activeTrack,
    nextDifficulty = difficulty,
    nextFixErrorScope = fixErrorScope,
    priorityTopics,
    priorityTopicLimit = 6,
  }: {
    nextFormat?: QuizFormatId
    nextTrack?: QuizTrackId
    nextDifficulty?: Difficulty
    nextFixErrorScope?: FixErrorScopeId
    priorityTopics?: LanguageId[]
    priorityTopicLimit?: number
  } = {}) => {
    const nextQuestions =
      nextFormat === 'identify-language'
        ? createIdentifyLanguageSession(questionBanks[nextTrack][nextDifficulty], identifyLanguageFormat.questionsPerSession, {
            priorityTopics,
            priorityTopicLimit,
          })
        : createFixErrorSession(nextFixErrorScope, fixErrorFormat.questionsPerSession)

    audio.playTap()

    startTransition(() => {
      if (nextFormat === 'fix-error') {
        if (track !== 'core') {
          applyTrackSelection('core')
        }
      } else if (nextTrack !== activeTrack) {
        applyTrackSelection(nextTrack)
      }

      setQuizFormat(nextFormat)
      setDifficulty(nextDifficulty)
      setFixErrorScope(nextFixErrorScope)
      setQuestions(nextQuestions)
      setCurrentIndex(0)
      setTimeLeft(
        nextFormat === 'identify-language'
          ? identifyLanguageFormat.questionTimeLimitSeconds
          : fixErrorFormat.questionTimeLimitSeconds,
      )
      setOutcomes([])
      setCurrentOutcome(null)
      setHintedQuestionIds([])
      setQuizPhase('active')
      setView('quiz')
    })
  }

  const startTopicQuiz = (topicId: LanguageId) => {
    const guide = guideBookEntries[topicId]
    markGuideViewed(topicId)

    startNewQuiz({
      nextFormat: 'identify-language',
      nextTrack: guide.track,
      priorityTopics: [topicId, ...guide.falseFriends],
      priorityTopicLimit: 8,
    })
  }

  const startFixErrorTopicQuiz = (topicId: FixErrorSupportedLanguageId) => {
    markGuideViewed(topicId)

    startNewQuiz({
      nextFormat: 'fix-error',
      nextTrack: 'core',
      nextFixErrorScope: topicId,
    })
  }

  const revealFeedback = (choice: string | null, result: QuestionOutcome['result']) => {
    const question = questions[currentIndex]

    if (!question) {
      return
    }

    const nextOutcome: QuestionOutcome =
      question.format === 'identify-language'
        ? {
            questionId: question.id,
            format: question.format,
            answer: question.answer,
            selectedChoice: choice as LanguageId | null,
            isCorrect: result === 'correct',
            result,
            hintUsed: hintedQuestionIds.includes(question.id),
            difficulty,
            track: activeTrack,
          }
        : {
            questionId: question.id,
            format: question.format,
            language: question.language,
            answer: question.answer,
            selectedChoice: choice,
            isCorrect: result === 'correct',
            result,
            hintUsed: hintedQuestionIds.includes(question.id),
            track: 'core',
          }

    if (result === 'correct') {
      audio.playSuccess()
    } else {
      audio.playError()
    }

    setCurrentOutcome(nextOutcome)
    setOutcomes((current) => [...current, nextOutcome])
    setQuizPhase('feedback')
  }

  const handleChoice = (choice: LanguageId | string) => {
    if (!currentQuestion || view !== 'quiz' || quizPhase !== 'active') {
      return
    }

    revealFeedback(choice, choice === currentQuestion.answer ? 'correct' : 'wrong')
  }

  const handleHint = () => {
    if (!currentQuestion || view !== 'quiz' || quizPhase !== 'active' || currentQuestionHintVisible || hintsRemaining <= 0) {
      return
    }

    audio.playHint()
    setHintedQuestionIds((current) => [...current, currentQuestion.id])
  }

  const handleNextQuestion = () => {
    audio.playNext()

    if (isLastQuestion) {
      setView('result')
      return
    }

    setCurrentIndex((index) => index + 1)
    setCurrentOutcome(null)
    setTimeLeft(formatConfig.questionTimeLimitSeconds)
    setQuizPhase('active')
  }

  const handleFormatChange = (nextFormat: QuizFormatId) => {
    audio.playTap()
    setQuizFormat(nextFormat)

    if (nextFormat === 'fix-error') {
      applyTrackSelection('core')
    }
  }

  const handleTrackChange = (nextTrack: QuizTrackId) => {
    audio.playTap()
    applyTrackSelection(nextTrack)
  }

  const handleDifficultyChange = (nextDifficulty: Difficulty) => {
    audio.playTap()
    setDifficulty(nextDifficulty)
  }

  const handleFixErrorScopeChange = (nextScope: FixErrorScopeId) => {
    audio.playTap()
    setFixErrorScope(nextScope)
  }

  const handleOpenGuide = (nextTrack = activeTrack) => {
    audio.playTap()

    if (nextTrack !== activeTrack) {
      applyTrackSelection(nextTrack)
    }

    setView('guide')
  }

  const handleReadGuide = (topicId: LanguageId) => {
    audio.playTap()
    markGuideViewed(topicId)
    setComparison((current) => (current?.source === topicId ? current : null))
    setExpandedGuideId((current) => (current === topicId ? null : topicId))
  }

  const handleCompare = (topicId: LanguageId, targetId?: LanguageId) => {
    const falseFriend = targetId ?? guideBookEntries[topicId].falseFriends[0]

    if (!falseFriend) {
      return
    }

    audio.playTap()
    markGuideViewed(topicId)
    setExpandedGuideId(topicId)
    setComparison((current) => (current?.source === topicId ? null : { source: topicId, target: falseFriend }))
  }

  const handleBackToMenu = () => {
    audio.playTap()
    setView('menu')
  }

  const handleBackToGuide = () => {
    audio.playTap()
    setView('guide')
  }

  const handleThemeToggle = () => {
    audio.playTap()
    setTheme((current) => (current === 'light' ? 'dark' : 'light'))
  }

  const renderFormatPicker = () => (
    <div className="grid gap-4 md:grid-cols-2">
      {(['identify-language', 'fix-error'] as const).map((value) => {
        const config = quizFormatSettings[value]
        const isActive = quizFormat === value
        const badge = value === 'identify-language' ? formatCopy.identifyFormatSummary : formatCopy.standardSummary

        return (
          <button
            key={value}
            type="button"
            onClick={() => handleFormatChange(value)}
            className={clsx(
              'rounded-[28px] border p-5 text-left transition duration-300',
              isActive
                ? 'border-[var(--line-strong)] bg-[var(--surface-strong)] shadow-[0_24px_44px_rgba(100,84,64,0.12)]'
                : `${softSurfaceClass} hover:-translate-y-1 ${hoverSurfaceClass}`,
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-lg font-semibold text-[var(--ink)]">{config.label[locale]}</p>
              <span className="rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                {badge}
              </span>
            </div>
            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{config.description[locale]}</p>
          </button>
        )
      })}
    </div>
  )

  const renderTrackPicker = () => (
    isFixErrorMode ? (
      <div className="rounded-[28px] border border-[var(--line-strong)] bg-[var(--surface-strong)] p-5 shadow-[0_24px_44px_rgba(100,84,64,0.12)]">
        <div className="flex items-start justify-between gap-4">
          <div className="rounded-2xl bg-[var(--surface-raised)] p-3 text-[var(--ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
            <BookOpen size={18} />
          </div>
          <span className="rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
            {formatCopy.fixErrorBadge}
          </span>
        </div>
        <p className="mt-4 text-lg font-semibold text-[var(--ink)]">{trackSettings.core.label[locale]}</p>
        <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{formatCopy.fixedCoreNote}</p>
      </div>
    ) : (
      <div className="grid gap-4 md:grid-cols-2">
        {(['core', 'game-dev'] as const).map((topicTrack) => {
          const config = trackSettings[topicTrack]
          const Icon = trackIcons[topicTrack]
          const isActive = topicTrack === activeTrack
          const viewed = trackTopicIds[topicTrack].filter((topicId) => viewedGuideIds.includes(topicId)).length

          return (
            <button
              key={topicTrack}
              type="button"
              onClick={() => handleTrackChange(topicTrack)}
              className={clsx(
                'group rounded-[28px] border p-5 text-left transition duration-300',
                isActive
                  ? 'border-[var(--line-strong)] bg-[var(--surface-strong)] shadow-[0_24px_44px_rgba(100,84,64,0.12)]'
                  : `${softSurfaceClass} hover:-translate-y-1 ${hoverSurfaceClass}`,
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="rounded-2xl bg-[var(--surface-strong)] p-3 text-[var(--ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
                  <Icon size={18} />
                </div>
                <span className="rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                  {config.badge[locale]}
                </span>
              </div>
              <p className="mt-4 text-lg font-semibold text-[var(--ink)]">{config.label[locale]}</p>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{config.description[locale]}</p>
              <div className="mt-4 flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                <span>
                  {copy.viewedGuides}: {viewed}/{trackTopicIds[topicTrack].length}
                </span>
                <span className="transition group-hover:translate-x-0.5">{currentModeBadge}</span>
              </div>
            </button>
          )
        })}
      </div>
    )
  )

  const renderModePicker = () =>
    isFixErrorMode ? (
      <div className="rounded-[28px] border border-[var(--line-strong)] bg-[var(--surface-strong)] p-5 shadow-[0_24px_44px_rgba(100,84,64,0.12)]">
        <div className="flex items-center justify-between gap-3">
          <p className="text-lg font-semibold text-[var(--ink)]">{fixErrorFormat.standard.label[locale]}</p>
          <span className="rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
            {fixErrorFormat.standard.badge[locale]}
          </span>
        </div>
        <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{fixErrorFormat.standard.description[locale]}</p>
      </div>
    ) : (
      <div className="grid gap-4 md:grid-cols-2">
        {(['easy', 'hard'] as const).map((value) => {
          const config = modeSettings[value]
          const isActive = difficulty === value

          return (
            <button
              key={value}
              type="button"
              onClick={() => handleDifficultyChange(value)}
              className={clsx(
                'rounded-[28px] border p-5 text-left transition duration-300',
                isActive
                  ? 'border-[var(--line-strong)] bg-[var(--surface-strong)] shadow-[0_24px_44px_rgba(100,84,64,0.12)]'
                  : `${softSurfaceClass} hover:-translate-y-1 ${hoverSurfaceClass}`,
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-lg font-semibold text-[var(--ink)]">{config.label[locale]}</p>
                <span className="rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                  {config.badge[locale]}
                </span>
              </div>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{config.description[locale]}</p>
            </button>
          )
        })}
      </div>
    )

  const renderFixErrorScopePicker = () =>
    isFixErrorMode ? (
      <div className="space-y-4">
        <div className="rounded-[24px] border border-[var(--line)] bg-[var(--surface-raised)] p-4">
          <p className="text-sm text-[var(--ink)]">{formatCopy.scopeNote}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <button
            type="button"
            onClick={() => handleFixErrorScopeChange(FIX_ERROR_ALL_CORE_SCOPE)}
            className={clsx(
              'rounded-[24px] border p-4 text-left transition duration-300',
              fixErrorScope === FIX_ERROR_ALL_CORE_SCOPE
                ? 'border-[var(--line-strong)] bg-[var(--surface-strong)] shadow-[0_18px_36px_rgba(100,84,64,0.12)]'
                : `${softSurfaceClass} hover:-translate-y-0.5 ${hoverSurfaceClass}`,
            )}
          >
            <p className="text-sm font-semibold text-[var(--ink)]">{formatCopy.allCoreLabel}</p>
            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{formatCopy.allCoreDescription}</p>
          </button>

          {fixErrorSupportedLanguageIds.map((languageId) => (
            <button
              key={languageId}
              type="button"
              onClick={() => handleFixErrorScopeChange(languageId)}
              className={clsx(
                'rounded-[24px] border p-4 text-left transition duration-300',
                fixErrorScope === languageId
                  ? 'border-[var(--line-strong)] bg-[var(--surface-strong)] shadow-[0_18px_36px_rgba(100,84,64,0.12)]'
                  : `${softSurfaceClass} hover:-translate-y-0.5 ${hoverSurfaceClass}`,
              )}
            >
              <p className="text-sm font-semibold text-[var(--ink)]">{getLanguageLabel(locale, languageId)}</p>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{formatCopy.singleCoreDescription}</p>
            </button>
          ))}
        </div>
      </div>
    ) : null

  const renderMenu = () => {
    const menuStats = [
      {
        label: copy.trackLabel,
        value: currentTrack.label[locale],
        Icon: trackIcons[activeTrack],
      },
      {
        label: formatCopy.formatLabel,
        value: currentFormatLabel,
        Icon: WandSparkles,
      },
      {
        label: isFixErrorMode ? formatCopy.scopeLabel : formatCopy.profileLabel,
        value: isFixErrorMode ? currentScopeLabel : currentModeLabel,
        Icon: Sparkles,
      },
      {
        label: copy.guideProgress,
        value: `${trackViewedCount}/${trackTopicList.length}`,
        Icon: BookOpen,
      },
    ]

    return (
      <motion.section key="menu" {...screenMotion} className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
        <article className="rounded-[34px] border border-[var(--line-strong)] bg-[var(--surface-strong)]/96 p-6 shadow-[0_28px_54px_rgba(100,84,64,0.12)] backdrop-blur-xl md:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-1.5 text-sm text-[var(--muted)]">
            <Sparkles size={16} className="text-[var(--accent)]" />
            {copy.menuBadge}
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {activeIntroRules.map((rule) => (
              <span key={rule} className="rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-1 text-xs text-[var(--muted)]">
                {rule}
              </span>
            ))}
          </div>

          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">{copy.readyLabel}</p>
          <h1
            className="mt-3 max-w-4xl text-4xl font-semibold leading-[0.96] tracking-[-0.05em] text-[var(--ink)] md:text-6xl"
            style={{ fontFamily: 'Sora, sans-serif' }}
          >
            {copy.menuTitle}
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-[var(--muted)] md:text-lg">{copy.menuDescription}</p>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">{copy.readyDescription}</p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {menuStats.map(({ label, value, Icon }) => (
              <div
                key={label}
                className="rounded-[24px] border border-[var(--line)] bg-[var(--surface-raised)] p-4 shadow-[0_16px_28px_rgba(100,84,64,0.05)]"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-[var(--surface-strong)] p-2.5 text-[var(--ink)]">
                    <Icon size={16} />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{label}</p>
                </div>
                <p className="mt-3 text-sm font-semibold text-[var(--ink)]">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">{formatCopy.formatLabel}</p>
            <div className="mt-4">{renderFormatPicker()}</div>
          </div>

          <div className="mt-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">{copy.trackLabel}</p>
            <div className="mt-4">{renderTrackPicker()}</div>
          </div>

          <div className="mt-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">{formatCopy.profileLabel}</p>
            <div className="mt-4">{renderModePicker()}</div>
          </div>

          {isFixErrorMode && (
            <div className="mt-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">{formatCopy.scopeLabel}</p>
              <div className="mt-4">{renderFixErrorScopePicker()}</div>
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => handleOpenGuide()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-[var(--surface-strong)] shadow-[0_22px_38px_rgba(66,52,37,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_26px_44px_rgba(66,52,37,0.22)]"
            >
              <BookOpen size={16} />
              {copy.openGuideBook}
            </button>
            <button
              type="button"
              onClick={() => startNewQuiz()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] px-5 py-3 text-sm font-semibold text-[var(--ink)] transition hover:-translate-y-0.5 hover:bg-[var(--surface-hover)]"
            >
              <Play size={16} />
              {copy.skipToQuiz}
            </button>
          </div>
        </article>

        <div className="grid gap-6">
          <article className={panelClass}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">{copy.readyLabel}</p>
                <p className="mt-1 text-sm text-[var(--ink)]">{copy.readyDescription}</p>
              </div>
              <span className="rounded-full border border-[var(--line)] bg-[var(--surface-strong)]/85 px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                {currentModeBadge}
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                { label: copy.trackLabel, value: currentTrack.label[locale], Icon: BookOpen },
                { label: copy.timeLeft, value: `${formatConfig.questionTimeLimitSeconds}s`, Icon: Clock3 },
                { label: copy.guideProgress, value: `${trackViewedCount}/${trackTopicList.length}`, Icon: Sparkles },
              ].map(({ label, value, Icon }) => (
                <div key={label} className="rounded-[24px] border border-[var(--line)] bg-[var(--surface-strong)]/78 p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-[var(--accent-soft-2)] p-2.5 text-[var(--accent-2)]">
                      <Icon size={16} />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-[var(--ink)]">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-[26px] border border-[var(--line)] bg-[linear-gradient(135deg,rgba(120,144,132,0.08),rgba(198,165,134,0.12))] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{copy.quizTitle}</p>
              <div className="mt-4 space-y-3">
                {activeIntroRules.slice(0, 3).map((rule) => (
                  <div key={rule} className="flex items-start gap-3 rounded-2xl bg-[var(--surface-strong)]/72 px-4 py-3">
                    <ArrowRight size={16} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                    <p className="text-sm leading-7 text-[var(--ink)]">{rule}</p>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <article className={panelClass}>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[var(--surface-soft)] p-3 text-[var(--accent)]">
                <WandSparkles size={18} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">{copy.universalPrimer}</p>
                <p className="mt-1 text-sm text-[var(--ink)]">{copy.guidePrimerDescription}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {guidePrimerSections.map((section) => (
                <div key={section.id} className="rounded-[24px] border border-[var(--line)] bg-[var(--surface-raised)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">{section.marker}</p>
                  <p className="mt-2 text-sm font-semibold text-[var(--ink)]">{section.title[locale]}</p>
                  <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{section.description[locale]}</p>
                </div>
              ))}
            </div>
          </article>
        </div>
      </motion.section>
    )
  }

  const renderGuide = () => (
    <motion.section key="guide" {...screenMotion} className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <button
            type="button"
            onClick={handleBackToMenu}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm font-semibold text-[var(--muted)] transition hover:bg-[var(--surface-hover)]"
          >
            <ArrowLeft size={14} />
            {copy.backToMenu}
          </button>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.26em] text-[var(--muted)]">{copy.guideTitle}</p>
          <h2
            className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)] md:text-5xl"
            style={{ fontFamily: 'Sora, sans-serif' }}
          >
            {currentTrack.label[locale]}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)] md:text-base">{copy.guideDescription}</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="rounded-[22px] border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--muted)]">
            {copy.guideProgress}: {trackViewedCount}/{trackTopicList.length}
          </div>
          <button
            type="button"
            onClick={() => startNewQuiz()}
            className="inline-flex items-center justify-center gap-2 rounded-[22px] bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-[var(--surface-strong)] transition hover:-translate-y-0.5"
          >
            <Play size={16} />
            {isFixErrorMode ? formatCopy.tryFixError : copy.startTrackQuiz}
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_360px]">
        <article className={panelClass}>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">{copy.guidePrimerTitle}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {guidePrimerSections.map((section) => (
              <div key={section.id} className="rounded-[24px] border border-[var(--line)] bg-[var(--surface-raised)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">{section.marker}</p>
                <p className="mt-2 text-sm font-semibold text-[var(--ink)]">{section.title[locale]}</p>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{section.description[locale]}</p>
              </div>
            ))}
          </div>
        </article>

        <article className={panelClass}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">{copy.quickSpot}</p>
              <p className="mt-1 text-sm text-[var(--ink)]">{currentTrack.description[locale]}</p>
            </div>
            <span className="rounded-full border border-[var(--line)] bg-[var(--surface-raised)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
              {currentTrack.badge[locale]}
            </span>
          </div>

          <div className="mt-4 grid gap-3">
            <div className="rounded-[24px] border border-[var(--line)] bg-[var(--surface-strong)]/78 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{copy.trackLabel}</p>
              <p className="mt-2 text-sm font-semibold text-[var(--ink)]">{currentTrack.label[locale]}</p>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{currentTrack.description[locale]}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-[24px] border border-[var(--line)] bg-[var(--surface-strong)]/78 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{copy.totalCount}</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--ink)]">{formatConfig.questionsPerSession}</p>
              </div>
              <div className="rounded-[24px] border border-[var(--line)] bg-[var(--surface-strong)]/78 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{copy.timeLeft}</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--ink)]">{formatConfig.questionTimeLimitSeconds}s</p>
              </div>
            </div>
          </div>
        </article>
      </div>

      {comparison && (
        <article className={panelClass}>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">{copy.compareTitle}</p>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{copy.compareNote}</p>
            </div>
            <button
              type="button"
              onClick={() => setComparison(null)}
              className="rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm font-semibold text-[var(--muted)] transition hover:bg-[var(--surface-hover)]"
            >
              {copy.hideGuide}
            </button>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {[comparison.source, comparison.target].map((topicId) => {
              const guide = guideBookEntries[topicId]

              return (
                <div key={topicId} className="rounded-[24px] border border-[var(--line)] bg-[var(--surface-raised)] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-[var(--ink)]">{guide.label[locale]}</p>
                      <p className="mt-1 text-sm text-[var(--muted)]">{guideFamilyLabels[guide.family][locale]}</p>
                    </div>
                    <span className="rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">
                      {guide.quickSpot[locale]}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {guide.signature.map((signal) => (
                      <span key={signal} className="rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-1 text-xs text-[var(--muted)]">
                        {signal}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </article>
      )}

      <article className={panelClass}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">{copy.familyFilter}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setFamilyFilter('all')}
                className={clsx(
                  'rounded-full border px-4 py-2 text-sm font-semibold transition',
                  familyFilter === 'all'
                    ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--surface-strong)]'
                    : 'border-[var(--line)] bg-[var(--surface-soft)] text-[var(--muted)] hover:bg-[var(--surface-hover)]',
                )}
              >
                {copy.allFamilies}
              </button>
              {familyOptions.map((family) => (
                <button
                  key={family}
                  type="button"
                  onClick={() => setFamilyFilter(family)}
                  className={clsx(
                    'rounded-full border px-4 py-2 text-sm font-semibold transition',
                    familyFilter === family
                      ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--surface-strong)]'
                      : 'border-[var(--line)] bg-[var(--surface-soft)] text-[var(--muted)] hover:bg-[var(--surface-hover)]',
                  )}
                >
                  {guideFamilyLabels[family][locale]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredGuideIds.length === 0 ? (
          <div className="mt-6 rounded-[24px] border border-dashed border-[var(--line)] bg-[var(--surface-soft)] p-5 text-sm text-[var(--muted)]">
            {copy.noFamilyMatches}
          </div>
        ) : (
          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {filteredGuideIds.map((topicId) => {
              const guide = guideBookEntries[topicId]
              const isExpanded = expandedGuideId === topicId
              const isViewed = viewedGuideIds.includes(topicId)
              const compareTarget = guide.falseFriends[0]

              return (
                <article key={topicId} className="rounded-[28px] border border-[var(--line)] bg-[var(--surface-raised)] p-5 shadow-[0_18px_28px_rgba(100,84,64,0.05)]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xl font-semibold text-[var(--ink)]">{guide.label[locale]}</p>
                        {isViewed && (
                          <span className="rounded-full bg-emerald-500/12 px-3 py-1 text-xs font-semibold text-emerald-700">
                            {copy.viewedGuides}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-[var(--muted)]">{guideFamilyLabels[guide.family][locale]}</p>
                    </div>
                    <span className="rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">
                      {guide.quickSpot[locale]}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[22px] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{copy.whatIsThis}</p>
                      <p className="mt-2 text-sm leading-7 text-[var(--ink)]">{guide.plainSummary[locale]}</p>
                    </div>
                    <div className="rounded-[22px] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{copy.looksLike}</p>
                      <p className="mt-2 text-sm leading-7 text-[var(--ink)]">{guide.metaphor[locale]}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => handleReadGuide(topicId)}
                      className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--surface-hover)]"
                    >
                      {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      {isExpanded ? copy.hideGuide : copy.readGuide}
                    </button>
                    <button
                      type="button"
                      onClick={() => startTopicQuiz(topicId)}
                      className="inline-flex items-center gap-2 rounded-full bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-[var(--surface-strong)] transition hover:-translate-y-0.5"
                    >
                      <Play size={15} />
                      {copy.tryThisTopic}
                    </button>
                    {guide.track === 'core' && isFixErrorSupportedLanguage(topicId) && (
                      <button
                        type="button"
                        onClick={() => startFixErrorTopicQuiz(topicId)}
                        className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:-translate-y-0.5 hover:bg-[var(--surface-hover)]"
                      >
                        <WandSparkles size={15} />
                        {formatCopy.tryFixError}
                      </button>
                    )}
                    {compareTarget && (
                      <button
                        type="button"
                        onClick={() => handleCompare(topicId)}
                        className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface-raised)] px-4 py-2 text-sm font-semibold text-[var(--muted)] transition hover:bg-[var(--surface-hover)]"
                      >
                        <ArrowRight size={15} />
                        {copy.compareButton}
                      </button>
                    )}
                  </div>

                  <p className="mt-3 text-xs text-[var(--muted)]">
                    {guide.track === 'core' && isFixErrorSupportedLanguage(topicId) && isFixErrorMode
                      ? formatCopy.scopeNote
                      : copy.focusDrillNote}
                  </p>

                  {isExpanded && (
                    <div className="mt-5 space-y-4">
                      <div className="rounded-[22px] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{copy.spottingRulesTitle}</p>
                        <ul className="mt-3 space-y-2 text-sm leading-7 text-[var(--ink)]">
                          {guide.spottingRules.map((rule, index) => (
                            <li key={`${topicId}-rule-${index}`}>• {rule[locale]}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className="rounded-[22px] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{copy.falseFriendsTitle}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {guide.falseFriends.map((falseFriend) => (
                              <button
                                key={`${topicId}-${falseFriend}`}
                                type="button"
                                onClick={() => handleCompare(topicId, falseFriend)}
                                className="rounded-full border border-[var(--line)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs font-semibold text-[var(--muted)] transition hover:bg-[var(--surface-hover)]"
                              >
                                {getLanguageLabel(locale, falseFriend)}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-[22px] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{copy.miniNotesTitle}</p>
                          <div className="mt-3 space-y-2 text-sm text-[var(--ink)]">
                            {guide.miniSnippetNotes.map((note, index) => (
                              <SyntaxSnippet
                                key={`${topicId}-note-${index}`}
                                code={note[locale]}
                                languageId={topicId}
                                theme={theme}
                                label={copy.miniNotesTitle}
                                copyLabel={copy.copyCode}
                                copiedLabel={copy.copiedCode}
                                compact
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[22px] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{copy.beginnerChecklistTitle}</p>
                        <ul className="mt-3 space-y-2 text-sm leading-7 text-[var(--ink)]">
                          {guide.beginnerChecklist.map((item, index) => (
                            <li key={`${topicId}-check-${index}`}>• {item[locale]}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </article>
    </motion.section>
  )

  const renderChoiceCard = (choice: LanguageId | FixErrorChoice, index: number) => {
    if (!currentQuestion) {
      return null
    }

    const isLocked = quizPhase === 'feedback'
    const choiceId = typeof choice === 'string' ? choice : choice.id
    const isCorrect = currentQuestion.answer === choiceId
    const isSelected = currentOutcome?.selectedChoice === choiceId

    return (
      <button
        key={choiceId}
        type="button"
        disabled={isLocked}
        onClick={() => handleChoice(choiceId)}
        className={clsx(
          'group rounded-[28px] border p-4 text-left transition duration-300',
          isLocked ? 'cursor-default' : 'hover:-translate-y-1 hover:bg-[var(--surface-hover)]',
          isLocked && isCorrect && 'border-emerald-500/35 bg-emerald-500/8',
          isLocked && isSelected && !isCorrect && 'border-rose-500/35 bg-rose-500/8',
          !isLocked && 'border-[var(--line)] bg-[var(--surface-raised)]',
          isLocked && !isCorrect && !isSelected && 'border-[var(--line)] bg-[var(--surface-soft)]',
        )}
      >
        <div className="flex items-start gap-4">
          <div
            className={clsx(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border text-sm font-semibold',
              isLocked && isCorrect
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
                : isLocked && isSelected && !isCorrect
                  ? 'border-rose-500/30 bg-rose-500/10 text-rose-700'
                  : 'border-[var(--line)] bg-[var(--surface-strong)] text-[var(--ink)]',
            )}
          >
            {choiceLetters[index]}
          </div>

          <div className="min-w-0 flex-1">
            {typeof choice === 'string' ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[var(--ink)]">{getLanguageLabel(locale, choice)}</p>
                  <span className="rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                    {guideFamilyLabels[guideBookEntries[choice].family][locale]}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{guideBookEntries[choice].quickSpot[locale]}</p>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[var(--ink)]">{choice.label[locale]}</p>
                  <span className="rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                    {formatCopy.culpritLabel}
                  </span>
                </div>
                <p className="mt-2 font-mono text-sm leading-7 text-[var(--muted)]">{choice.fragment}</p>
              </>
            )}
          </div>
        </div>
      </button>
    )
  }

  const renderQuiz = () => {
    if (!currentQuestion) {
      return null
    }

    const answerGuide =
      currentQuestion.format === 'identify-language'
        ? guideBookEntries[currentQuestion.answer]
        : guideBookEntries[currentQuestion.language]
    const selectedChoiceLabel =
      currentQuestion.format === 'identify-language'
        ? currentOutcome?.selectedChoice
          ? getLanguageLabel(locale, currentOutcome.selectedChoice as LanguageId)
          : copy.noChoice
        : currentOutcome?.selectedChoice
          ? (() => {
              const selectedChoice = currentQuestion.choices.find((choice) => choice.id === currentOutcome.selectedChoice)
              return selectedChoice ? `${selectedChoice.label[locale]}: ${selectedChoice.fragment}` : copy.noChoice
            })()
          : copy.noChoice
    const correctFixErrorChoice =
      currentQuestion.format === 'fix-error'
        ? currentQuestion.choices.find((choice) => choice.id === currentQuestion.answer) ?? currentQuestion.choices[0]
        : null

    return (
      <motion.section key="quiz" {...screenMotion} className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_360px]">
        <div className="space-y-6">
          <article className={panelClass}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">{copy.quizTitle}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                    {currentTrack.label[locale]}
                  </span>
                  <span className="rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                    {currentFormatLabel}
                  </span>
                  <span className="rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                    {currentModeLabel}
                  </span>
                  <span className="rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                    {copy.question} {currentIndex + 1} {copy.of} {questions.length}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:w-auto">
                <div className="rounded-[22px] border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{copy.timeLeft}</p>
                  <p className="mt-1 text-xl font-semibold text-[var(--ink)]">{formatTime(timeLeft)}</p>
                </div>
                <div className="rounded-[22px] border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{copy.hintsLeft}</p>
                  <p className="mt-1 text-xl font-semibold text-[var(--ink)]">{hintsRemaining}</p>
                </div>
              </div>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                <span>
                  {copy.progress} {(Math.round(((currentIndex + 1) / questions.length) * 100)).toString()}%
                </span>
                <span>{copy.reviewImmediate}</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[rgba(80,66,51,0.08)]">
                <motion.div
                  className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent-2),var(--accent))]"
                  animate={{ width: timerProgress }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            <div className="mt-6 rounded-[28px] border border-[var(--line)] bg-[var(--surface-strong)]/94 p-4 md:p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">{currentQuestionLabel}</p>
                <span className="rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                  {guideFamilyLabels[answerGuide.family][locale]}
                </span>
              </div>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{currentQuestionHint}</p>
              <div className="mt-4">
                <SyntaxSnippet
                  code={currentQuestion.snippetText}
                  languageId={currentQuestion.format === 'identify-language' ? currentQuestion.answer : currentQuestion.language}
                  theme={theme}
                  label={currentQuestionLabel}
                  copyLabel={copy.copyCode}
                  copiedLabel={copy.copiedCode}
                  mode="neutral"
                  showLanguageLabel={false}
                />
              </div>
            </div>

            {isFixErrorQuestion(currentQuestion) && (
              <div className="mt-6 rounded-[28px] border border-[var(--line)] bg-[var(--surface-raised)] p-4 md:p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">{formatCopy.errorTextLabel}</p>
                  <span className="rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                    {answerGuide.label[locale]}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-[var(--ink)]">{currentQuestion.errorText[locale]}</p>
              </div>
            )}
          </article>

          <article className={panelClass}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                {isFixErrorQuestion(currentQuestion) ? formatCopy.culpritLabel : copy.choicesLabel}
              </p>
              {quizPhase === 'feedback' && <span className="text-xs text-[var(--muted)]">{copy.answerLocked}</span>}
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">{currentQuestion.choices.map((choice, index) => renderChoiceCard(choice, index))}</div>
          </article>
        </div>

        <div className="space-y-6">
          <article className={panelClass}>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[var(--surface-soft)] p-3 text-[var(--accent)]">
                <Lightbulb size={18} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">{copy.hintTitle}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {currentQuestionHintVisible ? copy.hintUsed : `${copy.hintsLeft}: ${hintsRemaining}`}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-[24px] border border-[var(--line)] bg-[var(--surface-raised)] p-4">
              {currentQuestionHintVisible ? (
                <p className="text-sm leading-7 text-[var(--ink)]">{currentQuestion.hint[locale]}</p>
              ) : (
                <button
                  type="button"
                  onClick={handleHint}
                  disabled={quizPhase !== 'active' || hintsRemaining <= 0}
                  className={clsx(
                    'inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition',
                    quizPhase === 'active' && hintsRemaining > 0
                      ? 'bg-[var(--ink)] text-[var(--surface-strong)] hover:-translate-y-0.5'
                      : 'cursor-not-allowed bg-[rgba(80,66,51,0.08)] text-[var(--muted)]',
                  )}
                >
                  <Lightbulb size={16} />
                  {copy.hintButton}
                </button>
              )}
            </div>

            {quizPhase === 'active' && (
              <div className="mt-4 rounded-[24px] border border-[var(--line)] bg-[var(--surface-raised)] p-4">
                <p className="text-sm font-semibold text-[var(--ink)]">{answerGuide.label[locale]}</p>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                  {isFixErrorQuestion(currentQuestion) ? answerGuide.debugFocus[locale][0] : answerGuide.difficultyHint[locale]}
                </p>
              </div>
            )}
          </article>

          {currentOutcome ? (
            <article className={panelClass}>
              <div className={clsx('rounded-[24px] border p-4', outcomeToneMap[currentOutcome.result].surface)}>
                <div className="flex items-start gap-3">
                  <div className={clsx('rounded-2xl p-2.5', outcomeToneMap[currentOutcome.result].text)}>
                    {(() => {
                      const OutcomeIcon = outcomeToneMap[currentOutcome.result].icon
                      return <OutcomeIcon size={20} />
                    })()}
                  </div>
                  <div>
                    <p className={clsx('text-sm font-semibold', outcomeToneMap[currentOutcome.result].text)}>
                      {copy[
                        currentOutcome.result === 'correct'
                          ? 'feedbackCorrect'
                          : currentOutcome.result === 'wrong'
                            ? 'feedbackWrong'
                            : 'feedbackTimeout'
                      ]}
                    </p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {currentOutcome.result === 'timeout' ? copy.timeoutNote : buildCorrectSummary(locale, currentQuestion)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-[24px] border border-[var(--line)] bg-[var(--surface-raised)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{copy.correctAnswer}</p>
                    {isIdentifyLanguageQuestion(currentQuestion) ? (
                      <p className="mt-2 text-lg font-semibold text-[var(--ink)]">{answerGuide.label[locale]}</p>
                    ) : (
                      <p className="mt-2 text-lg font-semibold text-[var(--ink)]">
                        {formatCopy.correctLineLabel}: {correctFixErrorChoice?.label[locale]}
                      </p>
                    )}
                  </div>
                  <span className="rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">
                    {isIdentifyLanguageQuestion(currentQuestion) ? answerGuide.quickSpot[locale] : correctFixErrorChoice?.fragment}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                  {copy.selectedChoice}: {selectedChoiceLabel}
                </p>
              </div>

              <div className="mt-5 space-y-4">
                <div className="rounded-[24px] border border-[var(--line)] bg-[var(--surface-raised)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{copy.whyThisWorks}</p>
                  <p className="mt-3 text-sm leading-7 text-[var(--ink)]">{buildCorrectSummary(locale, currentQuestion)}</p>
                </div>

                {isFixErrorQuestion(currentQuestion) && (
                  <div className="rounded-[24px] border border-[var(--line)] bg-[var(--surface-raised)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{formatCopy.choiceWhyLabel}</p>
                    <div className="mt-3 space-y-3">
                      {currentQuestion.choices.map((choice) => {
                        const explanation =
                          choice.id === currentQuestion.answer
                            ? currentQuestion.explanation.correct[locale]
                            : currentQuestion.explanation.wrongChoices[choice.id]?.[locale]

                        return (
                          <div key={`${currentQuestion.id}-${choice.id}`} className="rounded-[18px] border border-[var(--line)] bg-[var(--surface-strong)] p-3">
                            <p className="text-sm font-semibold text-[var(--ink)]">
                              {choice.label[locale]}: <span className="font-mono">{choice.fragment}</span>
                            </p>
                            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{explanation}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="rounded-[24px] border border-[var(--line)] bg-[var(--surface-raised)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{copy.debugFocus}</p>
                  <ul className="mt-3 space-y-2 text-sm leading-7 text-[var(--ink)]">
                    {answerGuide.debugFocus[locale].map((item, index) => (
                      <li key={`${currentQuestion.id}-debug-${index}`}>• {item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <button
                type="button"
                onClick={handleNextQuestion}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-[var(--surface-strong)] transition hover:-translate-y-0.5"
              >
                {isLastQuestion ? <Trophy size={16} /> : <ArrowRight size={16} />}
                {isLastQuestion ? copy.finishQuiz : copy.nextQuestion}
              </button>
            </article>
          ) : (
            <article className={panelClass}>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">{copy.debugFocus}</p>
              <div className="mt-4 space-y-3">
                {guidePrimerSections.slice(0, 3).map((section) => (
                  <div key={section.id} className="rounded-[22px] border border-[var(--line)] bg-[var(--surface-strong)]/78 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-[var(--ink)]">{section.title[locale]}</p>
                      <span className="rounded-full bg-[var(--accent-soft-2)] px-3 py-1 text-xs font-semibold text-[var(--accent-2)]">
                        {section.marker}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{section.description[locale]}</p>
                  </div>
                ))}
              </div>
            </article>
          )}
        </div>
      </motion.section>
    )
  }

  const renderResult = () => {
    const ratingKey = rating.key as keyof typeof copy.ratingNotes
    const weakTopics = Object.entries(
      outcomes.reduce<Record<string, number>>((totals, outcome) => {
        if (!outcome.isCorrect) {
          const topicId = outcome.format === 'identify-language' ? outcome.answer : outcome.language
          totals[topicId] = (totals[topicId] ?? 0) + 1
        }

        return totals
      }, {}),
    )
      .sort((left, right) => right[1] - left[1])
      .slice(0, 3) as Array<[LanguageId, number]>

    const resultStats = [
      {
        label: copy.correctCount,
        value: breakdown.correct,
        Icon: CheckCircle2,
        tone: 'text-emerald-700 bg-emerald-500/12',
      },
      {
        label: copy.wrongCount,
        value: breakdown.wrong,
        Icon: XCircle,
        tone: 'text-rose-700 bg-rose-500/12',
      },
      {
        label: copy.timeoutCount,
        value: breakdown.timeout,
        Icon: Clock3,
        tone: 'text-amber-700 bg-amber-500/12',
      },
      {
        label: copy.rating,
        value: rating.label[locale],
        Icon: Trophy,
        tone: 'text-[var(--accent)] bg-[var(--accent-soft)]',
      },
    ]

    return (
      <motion.section key="result" {...screenMotion} className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_360px]">
          <article className="rounded-[34px] border border-[var(--line-strong)] bg-[var(--surface-strong)]/96 p-6 shadow-[0_28px_54px_rgba(100,84,64,0.12)] backdrop-blur-xl md:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-1.5 text-sm text-[var(--muted)]">
              <WandSparkles size={16} className="text-[var(--accent)]" />
              {copy.resultBadge}
            </div>

            <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2
                  className="text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)] md:text-5xl"
                  style={{ fontFamily: 'Sora, sans-serif' }}
                >
                  {copy.resultTitle}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)] md:text-base">{copy.resultDescription}</p>
              </div>

              <div className="rounded-[28px] border border-[var(--line)] bg-[var(--surface-raised)] px-5 py-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{copy.score}</p>
                <p className="mt-2 text-4xl font-semibold text-[var(--ink)]">{score}/{questions.length}</p>
              </div>
            </div>

            <div className="mt-6 rounded-[28px] border border-[var(--line)] bg-[image:var(--panel-gradient)] p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[var(--accent-soft)] p-3 text-[var(--accent)]">
                  <Trophy size={18} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{copy.rating}</p>
                  <p className="mt-1 text-xl font-semibold text-[var(--ink)]">{rating.label[locale]}</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-[var(--muted)]">{copy.ratingNotes[ratingKey]}</p>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {resultStats.map(({ label, value, Icon, tone }) => (
                <div key={label} className="rounded-[24px] border border-[var(--line)] bg-[var(--surface-soft)] p-4">
                  <div className="flex items-center gap-3">
                    <div className={clsx('rounded-2xl p-2.5', tone)}>
                      <Icon size={16} />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
                  </div>
                  <p className="mt-3 text-lg font-semibold text-[var(--ink)]">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => startNewQuiz()}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-[var(--surface-strong)] transition hover:-translate-y-0.5"
              >
                <RotateCcw size={16} />
                {copy.playAgain}
              </button>
              <button
                type="button"
                onClick={handleBackToGuide}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] px-5 py-3 text-sm font-semibold text-[var(--ink)] transition hover:-translate-y-0.5 hover:bg-[var(--surface-hover)]"
              >
                <BookOpen size={16} />
                {copy.backToGuide}
              </button>
              <button
                type="button"
                onClick={handleBackToMenu}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] px-5 py-3 text-sm font-semibold text-[var(--ink)] transition hover:-translate-y-0.5 hover:bg-[var(--surface-hover)]"
              >
                <ArrowLeft size={16} />
                {copy.backToMenu}
              </button>
            </div>
          </article>

          <div className="space-y-6">
            <article className={panelClass}>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">{copy.readyLabel}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-[24px] border border-[var(--line)] bg-[var(--surface-strong)]/78 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{copy.trackLabel}</p>
                  <p className="mt-2 text-lg font-semibold text-[var(--ink)]">{currentTrack.label[locale]}</p>
                </div>
                <div className="rounded-[24px] border border-[var(--line)] bg-[var(--surface-strong)]/78 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{formatCopy.formatLabel}</p>
                  <p className="mt-2 text-lg font-semibold text-[var(--ink)]">{currentFormatLabel}</p>
                </div>
                <div className="rounded-[24px] border border-[var(--line)] bg-[var(--surface-strong)]/78 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{formatCopy.profileLabel}</p>
                  <p className="mt-2 text-lg font-semibold text-[var(--ink)]">{currentModeLabel}</p>
                </div>
              </div>
            </article>

            <article className={panelClass}>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">{copy.analyticsNote}</p>
              {isFixErrorMode && <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{formatCopy.fixErrorResultNote}</p>}
              {weakTopics.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {weakTopics.map(([topicId, count]) => (
                    <button
                      key={`weak-${topicId}`}
                      type="button"
                      onClick={() => {
                        markGuideViewed(topicId)
                        setExpandedGuideId(topicId)
                        setView('guide')
                      }}
                      className="flex w-full items-center justify-between rounded-[22px] border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 text-left transition hover:bg-[var(--surface-hover)]"
                    >
                      <div>
                        <p className="text-sm font-semibold text-[var(--ink)]">{getLanguageLabel(locale, topicId)}</p>
                        <p className="mt-1 text-xs text-[var(--muted)]">{guideBookEntries[topicId].quickSpot[locale]}</p>
                      </div>
                      <span className="rounded-full bg-rose-500/12 px-3 py-1 text-xs font-semibold text-rose-700">{count}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm leading-7 text-[var(--muted)]">{copy.instantReviewValue}</p>
              )}
            </article>
          </div>
        </div>

        <article className={panelClass}>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">{copy.graphTitle}</p>
          <div className="mt-5">
            <Suspense fallback={chartFallback}>
              <QuizStatsCharts locale={locale} outcomes={outcomes} score={score} total={questions.length || formatConfig.questionsPerSession} />
            </Suspense>
          </div>
        </article>
      </motion.section>
    )
  }

  return (
    <div className="relative isolate overflow-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <motion.div
          className="absolute left-[-6rem] top-[8vh] h-64 w-64 rounded-full bg-[color-mix(in_oklab,var(--accent),white_78%)] blur-3xl sm:h-80 sm:w-80"
          animate={{ x: [0, 36, -14, 0], y: [0, 26, -18, 0], scale: [1, 1.04, 0.96, 1] }}
          transition={{ duration: 20, ease: 'easeInOut', repeat: Infinity }}
        />
        <motion.div
          className="absolute right-[-5rem] top-[14vh] h-72 w-72 rounded-full bg-[color-mix(in_oklab,var(--accent-2),white_80%)] blur-3xl sm:h-[24rem] sm:w-[24rem]"
          animate={{ x: [0, -34, 18, 0], y: [0, 20, -24, 0], scale: [1, 1.06, 0.98, 1] }}
          transition={{ duration: 24, ease: 'easeInOut', repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-[-4rem] left-1/4 h-72 w-72 rounded-full bg-[color-mix(in_oklab,var(--bg-2),white_60%)] blur-3xl sm:h-[26rem] sm:w-[26rem]"
          animate={{ x: [0, 22, -18, 0], y: [0, -22, 12, 0], scale: [1, 1.08, 0.95, 1] }}
          transition={{ duration: 28, ease: 'easeInOut', repeat: Infinity }}
        />

        <div className="absolute right-[-10rem] top-[-5rem] hidden h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(122,168,154,0.18),transparent_64%)] blur-3xl lg:block" />
      </div>

      <main className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-5 sm:px-6 md:px-8 md:py-8 lg:px-12">
        <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">{copy.appTitle}</p>
            <p className="mt-1 text-sm text-[var(--ink)]">{copy.appSubtitle}</p>
          </div>

          <div className="flex w-full flex-wrap items-center justify-between gap-3 rounded-[24px] border border-[var(--line)] bg-[var(--surface)]/90 p-2 shadow-[0_12px_26px_rgba(100,84,64,0.06)] backdrop-blur-xl sm:w-auto sm:flex-nowrap sm:rounded-full">
            <div className="inline-flex items-center gap-2 rounded-full px-1">
              <span className="pl-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{copy.languageSwitch}</span>
              {(['th', 'en'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    audio.playTap()
                    setLocale(value)
                  }}
                  className={clsx(
                    'rounded-full px-3 py-2 text-sm font-semibold transition',
                    locale === value ? 'bg-[var(--ink)] text-[var(--surface-strong)]' : 'text-[var(--muted)] hover:text-[var(--ink)]',
                  )}
                >
                  <Languages size={14} className="mr-1 inline-flex" />
                  {value.toUpperCase()}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleThemeToggle}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface-strong)]/72 px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:-translate-y-0.5"
            >
              {theme === 'dark' ? <SunMedium size={15} /> : <Moon size={15} />}
              <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{copy.themeLabel}</span>
              <span>{theme === 'dark' ? copy.darkTheme : copy.lightTheme}</span>
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {screenView === 'menu' && renderMenu()}
          {screenView === 'guide' && renderGuide()}
          {screenView === 'quiz' && renderQuiz()}
          {screenView === 'result' && renderResult()}
        </AnimatePresence>
      </main>
    </div>
  )
}

export default App
