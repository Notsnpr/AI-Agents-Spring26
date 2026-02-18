import type { LeaderboardEntry } from './types'

export const LEADERBOARD_LIMIT = 10
export const LEADERBOARD_STORAGE_KEY = 'fingerfrenzy.leaderboard.v1'

export function sanitizeInitials(input: string): string {
  const letters = (input ?? '').toUpperCase().replace(/[^A-Z]/g, '')
  return letters.slice(0, 3)
}

export function isValidInitials(input: string): boolean {
  return sanitizeInitials(input).length === 3
}

export function sortEntries(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries].sort((a, b) => a.ms - b.ms || a.createdAt - b.createdAt)
}

export function qualifiesForLeaderboard(entries: LeaderboardEntry[], ms: number): boolean {
  if (entries.length < LEADERBOARD_LIMIT) return true
  const sorted = sortEntries(entries)
  return ms < sorted[sorted.length - 1]!.ms
}

export function addEntry(entries: LeaderboardEntry[], entry: LeaderboardEntry): LeaderboardEntry[] {
  const merged = sortEntries([...entries, entry])
  return merged.slice(0, LEADERBOARD_LIMIT)
}

export function loadLeaderboard(storage: Pick<Storage, 'getItem'>): LeaderboardEntry[] {
  try {
    const raw = storage.getItem(LEADERBOARD_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((e) => {
        const initials = typeof e?.initials === 'string' ? sanitizeInitials(e.initials) : ''
        const ms = typeof e?.ms === 'number' ? e.ms : NaN
        const createdAt = typeof e?.createdAt === 'number' ? e.createdAt : Date.now()
        if (!isFinite(ms) || ms <= 0 || initials.length !== 3) return null
        return { initials, ms, createdAt } satisfies LeaderboardEntry
      })
      .filter(Boolean) as LeaderboardEntry[]
  } catch {
    return []
  }
}

export function saveLeaderboard(storage: Pick<Storage, 'setItem'>, entries: LeaderboardEntry[]): void {
  storage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(sortEntries(entries).slice(0, LEADERBOARD_LIMIT)))
}

export function defaultLeaderboard(): LeaderboardEntry[] {
  // slightly silly seeded scores so the leaderboard feels alive
  const base = [
    { initials: 'ACE', ms: 4200 },
    { initials: 'JAM', ms: 4800 },
    { initials: 'ZIP', ms: 5100 },
    { initials: 'CRT', ms: 5600 },
    { initials: 'NEO', ms: 6100 },
    { initials: 'VHS', ms: 6700 },
    { initials: 'SYN', ms: 7400 },
    { initials: 'BIT', ms: 8200 },
    { initials: 'GLW', ms: 9100 },
    { initials: 'POP', ms: 9900 },
  ]
  const now = Date.now()
  return base.map((b, i) => ({ ...b, createdAt: now - (base.length - i) * 1000 }))
}
