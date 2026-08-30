/**
 * One requestAnimationFrame loop for the whole page, plus the hook widgets use to drive a
 * timeline from it. Four widgets must not mean four rAF loops.
 */

type Tick = (deltaMs: number) => void

const subscribers = new Set<Tick>()
let rafId: number | null = null
let lastNow = 0

/**
 * A backgrounded tab stops firing frames. Resuming with the true elapsed delta would teleport a
 * timeline straight to its end, destroying the thing the reader came to watch, so deltas are
 * clamped to roughly four frames and the animation simply resumes where it paused.
 */
export const MAX_FRAME_DELTA_MS = 64

function loop(now: number) {
  const delta = Math.min(now - lastNow, MAX_FRAME_DELTA_MS)
  lastNow = now
  for (const tick of subscribers) tick(delta)
  rafId = subscribers.size > 0 ? requestAnimationFrame(loop) : null
}

export function subscribeToFrames(tick: Tick): () => void {
  subscribers.add(tick)
  if (rafId === null) {
    lastNow = performance.now()
    rafId = requestAnimationFrame(loop)
  }
  return () => {
    subscribers.delete(tick)
    if (subscribers.size === 0 && rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }
}
