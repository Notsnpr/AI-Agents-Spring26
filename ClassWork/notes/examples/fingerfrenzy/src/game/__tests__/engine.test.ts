import { describe, expect, it } from 'vitest'
import { createInitialState, formatTime, stepGame } from '../engine'

describe('engine', () => {
  it('starts on A and sets running + start time', () => {
    const s0 = createInitialState()
    const r = stepGame(s0, { key: 'a', nowMs: 100 })
    expect(r.correct).toBe(true)
    expect(r.state.status).toBe('running')
    expect(r.state.startMs).toBe(100)
    expect(r.state.expectedIndex).toBe(1) // expecting B now
  })

  it('wrong key does not advance', () => {
    const s0 = createInitialState()
    const r1 = stepGame(s0, { key: 'B', nowMs: 100 })
    expect(r1.wrong).toBe(true)
    expect(r1.state.expectedIndex).toBe(0)
  })

  it('space resets from any state', () => {
    const s0 = createInitialState()
    const r1 = stepGame(s0, { key: 'A', nowMs: 10 })
    const r2 = stepGame(r1.state, { key: ' ', nowMs: 20 })
    expect(r2.sound).toBe('reset')
    expect(r2.state.status).toBe('idle')
    expect(r2.state.expectedIndex).toBe(0)
  })

  it('finishes on Z and sets end time', () => {
    let s = createInitialState()
    let now = 0
    for (let i = 0; i < 26; i++) {
      const key = String.fromCharCode('A'.charCodeAt(0) + i)
      now += 10
      const r = stepGame(s, { key, nowMs: now })
      s = r.state
      if (i < 25) {
        expect(r.justFinished).toBe(false)
      }
      if (i === 25) {
        expect(r.justFinished).toBe(true)
        expect(s.status).toBe('finished')
        expect(s.endMs).toBe(now)
      }
    }
  })

  it('formatTime outputs ss.mmm', () => {
    expect(formatTime(0)).toBe('00.000s')
    expect(formatTime(1234)).toBe('01.234s')
    expect(formatTime(9999)).toBe('09.999s')
  })
})
