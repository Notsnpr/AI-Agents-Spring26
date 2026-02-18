export type GameStatus = 'idle' | 'running' | 'finished'

export type LeaderboardEntry = {
  initials: string
  ms: number
  createdAt: number
}

export type GameState = {
  status: GameStatus
  /** Expected next letter (A..Z). When finished, expected is 'Z'. */
  expectedIndex: number
  startMs: number | null
  endMs: number | null
  /** Shown on-screen as a retro "announcer" line */
  message: string
  /** The last key pressed (for debugging / UI flavor) */
  lastKey: string | null
  /** Wrong key streak for fun */
  errorStreak: number
}

export type StepResult = {
  state: GameState
  /** convenience */
  correct: boolean
  wrong: boolean
  justFinished: boolean
  /** Sound cue for UI */
  sound: 'success' | 'error' | 'reset' | null
}
