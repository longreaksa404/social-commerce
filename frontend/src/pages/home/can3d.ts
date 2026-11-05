import { reducedMotion } from '../../components/effects.ts'

let answer: boolean | undefined

/** Whether this phone gets the 3D phone (spec 2026-11-04 §5.3): not with
 * reduce motion, without WebGL, when the browser asks to save data, or on
 * a phone that says it has under 4 GB or under 4 cores. Asked once. */
export function canUse3D(): boolean {
  if (answer !== undefined) return answer
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } }
  answer =
    !reducedMotion() &&
    !nav.connection?.saveData &&
    !(nav.deviceMemory !== undefined && nav.deviceMemory < 4) &&
    !(nav.hardwareConcurrency !== undefined && nav.hardwareConcurrency < 4) &&
    hasWebGL()
  return answer
}

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    // Give the test context back at once: browsers allow only a few.
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
    return gl !== null
  } catch {
    return false
  }
}
