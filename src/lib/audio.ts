import { useEffect, useRef } from 'react'

type WebkitAudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext
}

type ToneConfig = {
  frequency: number
  duration: number
  gain?: number
  type?: OscillatorType
  slideTo?: number
  delay?: number
}

const createTone = (context: AudioContext, master: GainNode, config: ToneConfig) => {
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  const startAt = context.currentTime + (config.delay ?? 0)
  const gainValue = config.gain ?? 0.035

  oscillator.type = config.type ?? 'sine'
  oscillator.frequency.setValueAtTime(config.frequency, startAt)

  if (config.slideTo) {
    oscillator.frequency.exponentialRampToValueAtTime(config.slideTo, startAt + config.duration)
  }

  gain.gain.setValueAtTime(0.0001, startAt)
  gain.gain.exponentialRampToValueAtTime(gainValue, startAt + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + config.duration)

  oscillator.connect(gain)
  gain.connect(master)
  oscillator.start(startAt)
  oscillator.stop(startAt + config.duration + 0.02)
}

export const useQuizAudio = () => {
  const contextRef = useRef<AudioContext | null>(null)
  const masterRef = useRef<GainNode | null>(null)

  const ensureContext = () => {
    if (typeof window === 'undefined') {
      return null
    }

    if (!contextRef.current) {
      const AudioCtor = window.AudioContext ?? (window as WebkitAudioWindow).webkitAudioContext

      if (!AudioCtor) {
        return null
      }

      const context = new AudioCtor()
      const master = context.createGain()
      master.gain.value = 0.65
      master.connect(context.destination)

      contextRef.current = context
      masterRef.current = master
    }

    if (contextRef.current.state === 'suspended') {
      void contextRef.current.resume()
    }

    return {
      context: contextRef.current,
      master: masterRef.current,
    }
  }

  const playSequence = (tones: ToneConfig[]) => {
    const nodes = ensureContext()

    if (!nodes?.master) {
      return
    }

    for (const tone of tones) {
      createTone(nodes.context, nodes.master, tone)
    }
  }

  useEffect(
    () => () => {
      if (contextRef.current) {
        void contextRef.current.close()
      }
    },
    [],
  )

  return {
    playTap: () =>
      playSequence([
        { frequency: 520, duration: 0.06, gain: 0.022, type: 'triangle', slideTo: 460 },
      ]),
    playSuccess: () =>
      playSequence([
        { frequency: 540, duration: 0.08, gain: 0.024, type: 'triangle', slideTo: 620 },
        { frequency: 780, duration: 0.12, gain: 0.026, type: 'sine', delay: 0.07, slideTo: 880 },
      ]),
    playError: () =>
      playSequence([
        { frequency: 400, duration: 0.09, gain: 0.024, type: 'sawtooth', slideTo: 280 },
      ]),
    playHint: () =>
      playSequence([
        { frequency: 680, duration: 0.08, gain: 0.022, type: 'sine', slideTo: 760 },
        { frequency: 920, duration: 0.1, gain: 0.02, type: 'triangle', delay: 0.06, slideTo: 980 },
      ]),
    playNext: () =>
      playSequence([
        { frequency: 460, duration: 0.05, gain: 0.018, type: 'triangle', slideTo: 520 },
      ]),
  }
}
