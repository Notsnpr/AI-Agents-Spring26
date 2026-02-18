export type SfxName = 'success' | 'error' | 'reset'

let audioCtx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext()
  return audioCtx
}

function beep(opts: { freq: number; durationMs: number; type?: OscillatorType; gain?: number }) {
  const ctx = getCtx()
  // required on some browsers after user gesture; we call this only from key events
  void ctx.resume()

  const o = ctx.createOscillator()
  const g = ctx.createGain()

  o.type = opts.type ?? 'square'
  o.frequency.value = opts.freq

  g.gain.value = opts.gain ?? 0.03

  o.connect(g)
  g.connect(ctx.destination)

  const now = ctx.currentTime
  o.start(now)
  o.stop(now + opts.durationMs / 1000)
}

export function playSfx(name: SfxName) {
  try {
    if (name === 'success') {
      beep({ freq: 880, durationMs: 55, type: 'square', gain: 0.04 })
      setTimeout(() => beep({ freq: 1320, durationMs: 45, type: 'square', gain: 0.03 }), 45)
    } else if (name === 'error') {
      beep({ freq: 110, durationMs: 120, type: 'sawtooth', gain: 0.05 })
    } else if (name === 'reset') {
      beep({ freq: 330, durationMs: 60, type: 'triangle', gain: 0.04 })
      setTimeout(() => beep({ freq: 220, durationMs: 80, type: 'triangle', gain: 0.03 }), 50)
    }
  } catch {
    // ignore audio errors (e.g., unsupported)
  }
}
