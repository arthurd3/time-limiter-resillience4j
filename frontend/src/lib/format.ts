/** Formats a millisecond duration the way the page talks about time. */
export function ms(value: number): string {
  if (value < 1000) return `${Math.round(value)} ms`
  return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 2)} s`
}

/** Fixed-width variant for readouts that tick, so digits do not jump. */
export function msTicking(value: number): string {
  return `${(value / 1000).toFixed(2)} s`
}

export function count(value: number, singular: string, plural = `${singular}s`): string {
  return `${value} ${value === 1 ? singular : plural}`
}
