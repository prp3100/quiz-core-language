import { Check, Copy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter'
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash'
import cpp from 'react-syntax-highlighter/dist/esm/languages/prism/cpp'
import csharp from 'react-syntax-highlighter/dist/esm/languages/prism/csharp'
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css'
import dart from 'react-syntax-highlighter/dist/esm/languages/prism/dart'
import glsl from 'react-syntax-highlighter/dist/esm/languages/prism/glsl'
import go from 'react-syntax-highlighter/dist/esm/languages/prism/go'
import java from 'react-syntax-highlighter/dist/esm/languages/prism/java'
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript'
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json'
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx'
import kotlin from 'react-syntax-highlighter/dist/esm/languages/prism/kotlin'
import lua from 'react-syntax-highlighter/dist/esm/languages/prism/lua'
import markup from 'react-syntax-highlighter/dist/esm/languages/prism/markup'
import php from 'react-syntax-highlighter/dist/esm/languages/prism/php'
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python'
import ruby from 'react-syntax-highlighter/dist/esm/languages/prism/ruby'
import rust from 'react-syntax-highlighter/dist/esm/languages/prism/rust'
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql'
import { oneLight, vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import swift from 'react-syntax-highlighter/dist/esm/languages/prism/swift'
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript'
import type { LanguageId } from '../data/questionBank'

type SyntaxSnippetProps = {
  code: string
  languageId: LanguageId
  theme: 'light' | 'dark'
  label: string
  copyLabel: string
  copiedLabel: string
  compact?: boolean
  mode?: 'syntax' | 'neutral'
  showLanguageLabel?: boolean
}

const syntaxLanguageMap: Record<LanguageId, string> = {
  python: 'python',
  java: 'java',
  javascript: 'javascript',
  html: 'markup',
  css: 'css',
  json: 'json',
  csharp: 'csharp',
  cpp: 'cpp',
  flutter: 'dart',
  dart: 'dart',
  go: 'go',
  kotlin: 'kotlin',
  swift: 'swift',
  ruby: 'ruby',
  jsx: 'jsx',
  typescript: 'typescript',
  bash: 'bash',
  'cloud-functions': 'typescript',
  sql: 'sql',
  php: 'php',
  rust: 'rust',
  'roblox-lua': 'lua',
  'love2d-lua': 'lua',
  'godot-gdscript': 'python',
  'godot-shader': 'glsl',
  'unity-csharp': 'csharp',
  'unity-shaderlab': 'glsl',
  'unreal-cpp': 'cpp',
  glsl: 'glsl',
  'phaser-typescript': 'typescript',
  'rpg-maker-js': 'javascript',
  'gamemaker-gml': 'javascript',
  'defold-lua': 'lua',
  'cocos-typescript': 'typescript',
  'bevy-rust': 'rust',
  'renpy-python': 'python',
}

SyntaxHighlighter.registerLanguage('bash', bash)
SyntaxHighlighter.registerLanguage('cpp', cpp)
SyntaxHighlighter.registerLanguage('csharp', csharp)
SyntaxHighlighter.registerLanguage('css', css)
SyntaxHighlighter.registerLanguage('dart', dart)
SyntaxHighlighter.registerLanguage('glsl', glsl)
SyntaxHighlighter.registerLanguage('go', go)
SyntaxHighlighter.registerLanguage('java', java)
SyntaxHighlighter.registerLanguage('javascript', javascript)
SyntaxHighlighter.registerLanguage('json', json)
SyntaxHighlighter.registerLanguage('jsx', jsx)
SyntaxHighlighter.registerLanguage('kotlin', kotlin)
SyntaxHighlighter.registerLanguage('lua', lua)
SyntaxHighlighter.registerLanguage('markup', markup)
SyntaxHighlighter.registerLanguage('php', php)
SyntaxHighlighter.registerLanguage('python', python)
SyntaxHighlighter.registerLanguage('ruby', ruby)
SyntaxHighlighter.registerLanguage('rust', rust)
SyntaxHighlighter.registerLanguage('sql', sql)
SyntaxHighlighter.registerLanguage('swift', swift)
SyntaxHighlighter.registerLanguage('typescript', typescript)

export function SyntaxSnippet({
  code,
  languageId,
  theme,
  label,
  copyLabel,
  copiedLabel,
  compact = false,
  mode = 'syntax',
  showLanguageLabel = true,
}: SyntaxSnippetProps) {
  const [copied, setCopied] = useState(false)
  const lineItems = code.split('\n')

  useEffect(() => {
    if (!copied) {
      return
    }

    const timeoutId = window.setTimeout(() => setCopied(false), 1600)
    return () => window.clearTimeout(timeoutId)
  }, [copied])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="overflow-hidden rounded-[24px] border border-[var(--code-line)] bg-[var(--code-bg)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--code-line)] bg-[var(--code-header)] px-4 py-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--code-muted)]">{label}</p>
          {showLanguageLabel && <p className="mt-1 truncate text-xs font-medium text-[var(--code-ink)]">{syntaxLanguageMap[languageId]}</p>}
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--code-line)] bg-[var(--code-panel)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--code-muted)] transition hover:text-[var(--code-ink)]"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? copiedLabel : copyLabel}
        </button>
      </div>

      {mode === 'neutral' ? (
        <div
          className="overflow-x-auto px-4 py-4"
          style={{
            fontFamily: 'Consolas, "SFMono-Regular", "Cascadia Code", monospace',
            fontSize: compact ? '0.76rem' : '0.82rem',
            lineHeight: compact ? '1.65' : '1.75',
          }}
        >
          {lineItems.map((line, index) => (
            <div key={`${index + 1}-${line}`} className="grid grid-cols-[2.4em_minmax(0,1fr)] gap-3 text-[var(--code-ink)]">
              {!compact && <span className="select-none text-right text-[var(--code-muted)]/60">{index + 1}</span>}
              {compact && <span className="hidden" aria-hidden="true" />}
              <code className="whitespace-pre-wrap break-words">{line || ' '}</code>
            </div>
          ))}
        </div>
      ) : (
        <SyntaxHighlighter
          language={syntaxLanguageMap[languageId]}
          style={theme === 'dark' ? vscDarkPlus : oneLight}
          customStyle={{
            margin: 0,
            padding: compact ? '0.9rem 1rem' : '1rem 1.1rem',
            background: 'transparent',
            fontSize: compact ? '0.76rem' : '0.82rem',
            lineHeight: compact ? '1.65' : '1.75',
            fontFamily: 'Consolas, "SFMono-Regular", "Cascadia Code", monospace',
          }}
          codeTagProps={{
            style: {
              fontFamily: 'Consolas, "SFMono-Regular", "Cascadia Code", monospace',
            },
          }}
          wrapLongLines
          showLineNumbers={!compact}
          lineNumberStyle={{ minWidth: '2.4em', opacity: 0.38 }}
        >
          {code}
        </SyntaxHighlighter>
      )}
    </div>
  )
}
