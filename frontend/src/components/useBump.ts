import { useState } from 'react'

/**
 * How many times `value` has changed since the component first showed it
 * (only the changes `counts` accepts, e.g. a count going up). Used as a
 * `key` next to an animation class, it plays the animation on each change
 * but not on first show:
 *
 *   const bumps = useBump(status)
 *   <span key={bumps} className={bumps ? 'animate-pop' : ''}>…</span>
 */
export function useBump<T>(value: T, counts: (before: T, now: T) => boolean = () => true): number {
  const [last, setLast] = useState(value)
  const [bumps, setBumps] = useState(0)
  if (!Object.is(last, value)) {
    setLast(value)
    if (counts(last, value)) setBumps((n) => n + 1)
  }
  return bumps
}
