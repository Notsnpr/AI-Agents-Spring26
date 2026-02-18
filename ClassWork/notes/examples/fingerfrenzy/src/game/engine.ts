import type { GameState, StepResult } from './types'

const A_CODE = 'A'.charCodeAt(0)
const Z_CODE = 'Z'.charCodeAt(0)

export function indexToLetter(index: number): string {
  const code = A_CODE + index
  if (code < A_CODE || code > Z_CODE) throw new Error(`index out of range: ${index}`)
  return String.fromCharCode(code)
}

export function normalizeKeyToLetter(key: string): string | null {
  if (!key) return null
  if (key.length !== 1) return null
  const upper = key.toUpperCase()
  const code = upper.charCodeAt(0)
  if (code < A_CODE || code > Z_CODE) return null
  return upper
}

export function createInitialState(): GameState {
  return {
    status: 'idle',
    expectedIndex: 0,
    startMs: null,
    endMs: null,
    message: 'TYPE A TO START • SPACE TO RESET',
    lastKey: null,
    errorStreak: 0,
  }
}

export function resetState(): StepResult {
  return {
    state: createInitialState(),
    correct: false,
    wrong: false,
    justFinished: false,
    sound: 'reset',
  }
}

export function getElapsedMs(state: GameState): number | null {
  if (state.startMs == null) return null
  const end = state.endMs ?? null
  if (end == null) return null
  return Math.max(0, end - state.startMs)
}

/**
 * Pure game step.
 * - Timer starts on correct 'A'
 * - Timer ends on correct 'Z'
 * - Wrong keys don't advance
 */
export function stepGame(state: GameState, opts: { key: string; nowMs: number }): StepResult {
  const { key, nowMs } = opts

  if (key === ' ') {
    return resetState()
  }

  // ignore input if finished (except space handled above)
  if (state.status === 'finished') {
    return { state: { ...state, lastKey: key }, correct: false, wrong: false, justFinished: false, sound: null }
  }

  const letter = normalizeKeyToLetter(key)
  if (!letter) {
    return {
      state: { ...state, lastKey: key },
      correct: false,
      wrong: false,
      justFinished: false,
      sound: null,
    }
  }

  const expected = indexToLetter(state.expectedIndex)

  if (letter !== expected) {
    const streak = state.errorStreak + 1
    return {
      state: {
        ...state,
        lastKey: letter,
        errorStreak: streak,
        message: streak >= 3 ? 'OOPS! FOCUS…' : 'WRONG KEY!',
      },
      correct: false,
      wrong: true,
      justFinished: false,
      sound: 'error',
    }
  }

  // Correct!
  const nextIndex = state.expectedIndex + 1
  const isFirst = state.expectedIndex === 0
  const isLast = expected === 'Z'

  if (isLast) {
    // finish
    return {
      state: {
        ...state,
        status: 'finished',
        endMs: nowMs,
        lastKey: letter,
        message: 'FINISH! SPACE TO PLAY AGAIN',
        errorStreak: 0,
      },
      correct: true,
      wrong: false,
      justFinished: true,
      sound: 'success',
    }
  }

  return {
    state: {
      ...state,
      status: isFirst ? 'running' : state.status,
      startMs: isFirst ? nowMs : state.startMs,
      lastKey: letter,
      expectedIndex: nextIndex,
      errorStreak: 0,
      message: isFirst ? 'GO! GO! GO!' : 'KEEP IT HOT!',
    },
    correct: true,
    wrong: false,
    justFinished: false,
    sound: 'success',
  }
}

export function formatTime(ms: number): string {
  const total = Math.max(0, ms)
  const s = Math.floor(total / 1000)
  const millis = total % 1000
  const sec = String(s).padStart(2, '0')
  const mmm = String(millis).padStart(3, '0')
  return `${sec}.${mmm}s`
}
