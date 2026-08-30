import { useCallback, useEffect, useRef, useState } from 'react'
import { subscribeToFrames } from './clock'

export interface TimelineControls {
  /** Current position, in simulated ms. Read inside `onFrame`; not React state. */
  readonly tRef: React.RefObject<number>
  readonly playing: boolean
  play: () => void
  pause: () => void
  toggle: () => void
  /** Restart from zero and play. */
  replay: () => void
  seek: (tMs: number) => void
}

/**
 * Drives a timeline from the shared frame loop.
 *
 * `onFrame` runs on every animation frame and is where a widget writes to the DOM through refs.
 * It must not call setState -- that is the whole reason position lives in a ref. Discrete changes
 * (an outcome appearing) are the caller's job to detect and set sparingly.
 */
export function useTimeline(
  durationMs: number,
  onFrame: (tMs: number) => void,
  opts: { autoPlay?: boolean; loop?: boolean } = {},
): TimelineControls {
  const { autoPlay = false, loop = false } = opts
  const tRef = useRef(0)
  const [playing, setPlaying] = useState(autoPlay)
  const onFrameRef = useRef(onFrame)
  onFrameRef.current = onFrame

  // Paint the initial position, and repaint whenever the duration changes under us.
  useEffect(() => {
    onFrameRef.current(tRef.current)
  }, [durationMs])

  useEffect(() => {
    if (!playing) return
    return subscribeToFrames((delta) => {
      const next = tRef.current + delta
      if (next >= durationMs) {
        tRef.current = loop ? 0 : durationMs
        if (!loop) setPlaying(false)
      } else {
        tRef.current = next
      }
      onFrameRef.current(tRef.current)
    })
  }, [playing, durationMs, loop])

  // Someone who tabs away mid-run should come back to a paused timeline, not a finished one.
  useEffect(() => {
    const onHide = () => {
      if (document.hidden) setPlaying(false)
    }
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
  }, [])

  const seek = useCallback((tMs: number) => {
    tRef.current = Math.min(Math.max(0, tMs), durationMs)
    onFrameRef.current(tRef.current)
  }, [durationMs])

  const play = useCallback(() => setPlaying(true), [])
  const pause = useCallback(() => setPlaying(false), [])
  const toggle = useCallback(() => setPlaying((p) => !p), [])
  const replay = useCallback(() => {
    tRef.current = 0
    onFrameRef.current(0)
    setPlaying(true)
  }, [])

  return { tRef, playing, play, pause, toggle, replay, seek }
}
