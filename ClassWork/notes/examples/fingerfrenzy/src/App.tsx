import { useEffect, useMemo, useRef, useState } from 'react'
import './index.css'
import { createInitialState, formatTime, getElapsedMs, indexToLetter, stepGame } from './game/engine'
import {
  addEntry,
  defaultLeaderboard,
  isValidInitials,
  loadLeaderboard,
  qualifiesForLeaderboard,
  sanitizeInitials,
  saveLeaderboard,
} from './game/leaderboard'
import type { GameState, LeaderboardEntry } from './game/types'
import { playSfx } from './sfx'

function useNowWhileRunning(running: boolean, intervalMs = 50) {
  const [now, setNow] = useState(() => performance.now())
  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => setNow(performance.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [running, intervalMs])
  return now
}

export default function App() {
  const containerRef = useRef<HTMLDivElement | null>(null)

  const [state, setState] = useState<GameState>(() => createInitialState())

  const [entries, setEntries] = useState<LeaderboardEntry[]>(() => {
    const loaded = loadLeaderboard(window.localStorage)
    return loaded.length ? loaded : defaultLeaderboard()
  })

  const [pendingInitials, setPendingInitials] = useState('')
  const [needsInitials, setNeedsInitials] = useState(false)

  const expectedLetter = useMemo(() => indexToLetter(Math.min(state.expectedIndex, 25)), [state.expectedIndex])

  const now = useNowWhileRunning(state.status === 'running')

  const liveMs = useMemo(() => {
    if (state.status !== 'running' || state.startMs == null) return null
    return Math.max(0, now - state.startMs)
  }, [now, state.startMs, state.status])

  const finalMs = useMemo(() => getElapsedMs(state), [state])

  useEffect(() => {
    containerRef.current?.focus()
  }, [])

  useEffect(() => {
    saveLeaderboard(window.localStorage, entries)
  }, [entries])

  function resetAll() {
    setState(createInitialState())
    setNeedsInitials(false)
    setPendingInitials('')
    playSfx('reset')
    containerRef.current?.focus()
  }

  function onKeyDown(e: React.KeyboardEvent) {
    // prevent page scroll on space
    if (e.key === ' ') e.preventDefault()

    if (e.key === ' ') {
      resetAll()
      return
    }

    // Leaderboard initials entry mode
    if (state.status === 'finished' && needsInitials) {
      if (e.key === 'Backspace') {
        setPendingInitials((s) => s.slice(0, -1))
        return
      }
      if (e.key === 'Enter') {
        if (finalMs == null) return
        if (!isValidInitials(pendingInitials)) return
        const entry: LeaderboardEntry = {
          initials: sanitizeInitials(pendingInitials),
          ms: finalMs,
          createdAt: Date.now(),
        }
        setEntries((prev) => addEntry(prev, entry))
        setNeedsInitials(false)
        setPendingInitials('')
        return
      }

      // accept only letters
      if (e.key.length === 1 && /[a-z]/i.test(e.key)) {
        setPendingInitials((s) => sanitizeInitials(s + e.key))
      }
      return
    }

    const result = stepGame(state, { key: e.key, nowMs: performance.now() })
    if (result.sound) playSfx(result.sound)

    setState(result.state)

    if (result.justFinished) {
      const ms = getElapsedMs(result.state)
      if (ms != null && qualifiesForLeaderboard(entries, ms)) {
        setNeedsInitials(true)
        setPendingInitials('') // important: clear textbox, should not show 'Z'
      } else {
        setNeedsInitials(false)
        setPendingInitials('')
      }
    }
  }

  const showLeaderboard = state.status === 'finished'

  return (
    <div
      className="ff-root"
      ref={containerRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      role="application"
      aria-label="Finger Frenzy"
    >
      <div className="ff-cabinet">
        <header className="ff-header">
          <div className="ff-marquee">
            <div className="ff-title">FINGER FRENZY</div>
            <div className="ff-sub">TYPE A→Z • SPACE RESETS • NO MOUSE NEEDED</div>
          </div>
        </header>

        <main className="ff-screen" aria-live="polite">
          {!showLeaderboard ? (
            <>
              <div className="ff-hud">
                <div className="ff-hudItem">
                  <div className="ff-hudLabel">NEXT</div>
                  <div className="ff-hudValue">{expectedLetter}</div>
                </div>

                <div className="ff-hudItem">
                  <div className="ff-hudLabel">TIME</div>
                  <div className="ff-hudValue ff-time">
                    {state.status === 'running' && liveMs != null ? formatTime(Math.round(liveMs)) : '—'}
                  </div>
                </div>

                <div className="ff-hudItem">
                  <div className="ff-hudLabel">STREAK</div>
                  <div className="ff-hudValue">{state.errorStreak}</div>
                </div>
              </div>

              <div className="ff-letterWrap">
                <div className="ff-letter" aria-label={`Current letter ${expectedLetter}`}>
                  {expectedLetter}
                </div>
              </div>

              <div className="ff-message">{state.message}</div>
              <div className="ff-tip">PRO TIP: KEEP YOUR HANDS ON HOME ROW. GO VIRAL.</div>
            </>
          ) : (
            <>
              <div className="ff-finish">
                <div className="ff-finishTitle">YOUR TIME</div>
                <div className="ff-finishTime">{finalMs == null ? '—' : formatTime(finalMs)}</div>
                {needsInitials ? (
                  <div className="ff-initialsPanel">
                    <div className="ff-initialsPrompt">NEW HIGH SCORE! ENTER INITIALS (A-Z) + ENTER</div>
                    <div className="ff-initialsBox" aria-label="Initials entry">
                      <span className="ff-initialsText">{pendingInitials.padEnd(3, '•')}</span>
                      <span className="ff-caret" aria-hidden="true" />
                    </div>
                    <div className="ff-initialsHint">BACKSPACE TO EDIT • SPACE TO RESET</div>
                  </div>
                ) : (
                  <div className="ff-initialsPanel">
                    <div className="ff-initialsPrompt">SPACE TO PLAY AGAIN</div>
                  </div>
                )}
              </div>

              <section className="ff-leaderboard" aria-label="Leaderboard">
                <div className="ff-boardTitle">TOP 10</div>
                <ol className="ff-boardList">
                  {entries.slice(0, 10).map((e, i) => (
                    <li className="ff-boardRow" key={`${e.initials}-${e.ms}-${e.createdAt}-${i}`}>
                      <span className="ff-rank">{String(i + 1).padStart(2, '0')}</span>
                      <span className="ff-initials">{e.initials}</span>
                      <span className="ff-score">{formatTime(e.ms)}</span>
                    </li>
                  ))}
                </ol>
              </section>
            </>
          )}
        </main>

        <footer className="ff-footer">
          <div className="ff-footerLine">INSERT COIN: FREE • HIGH SCORES SAVED LOCALLY</div>
        </footer>
      </div>
    </div>
  )
}
