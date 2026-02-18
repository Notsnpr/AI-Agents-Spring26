import { describe, expect, it } from 'vitest'
import {
  LEADERBOARD_LIMIT,
  addEntry,
  qualifiesForLeaderboard,
  sanitizeInitials,
  sortEntries,
} from '../leaderboard'

describe('leaderboard', () => {
  it('sanitizes initials', () => {
    expect(sanitizeInitials('ab')).toBe('AB')
    expect(sanitizeInitials('a*b')).toBe('AB')
    expect(sanitizeInitials('abcd')).toBe('ABC')
  })

  it('sorts ascending by ms', () => {
    const sorted = sortEntries([
      { initials: 'AAA', ms: 5000, createdAt: 2 },
      { initials: 'BBB', ms: 4000, createdAt: 1 },
    ])
    expect(sorted[0]!.initials).toBe('BBB')
  })

  it('qualifies when fewer than limit', () => {
    expect(qualifiesForLeaderboard([], 9999)).toBe(true)
  })

  it('qualifies only if better than worst when full', () => {
    const entries = Array.from({ length: LEADERBOARD_LIMIT }, (_, i) => ({
      initials: 'AAA',
      ms: 1000 + i * 100,
      createdAt: i,
    }))
    expect(qualifiesForLeaderboard(entries, 999999)).toBe(false)
    expect(qualifiesForLeaderboard(entries, 900)).toBe(true)
  })

  it('addEntry keeps top 10', () => {
    const entries = Array.from({ length: LEADERBOARD_LIMIT }, (_, i) => ({
      initials: 'AAA',
      ms: 1000 + i * 100,
      createdAt: i,
    }))
    const next = addEntry(entries, { initials: 'BBB', ms: 900, createdAt: 999 })
    expect(next).toHaveLength(LEADERBOARD_LIMIT)
    expect(next[0]!.ms).toBe(900)
  })
})
