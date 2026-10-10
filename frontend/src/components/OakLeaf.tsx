import { useId } from 'react'

/** Oak's mark: an oak leaf (from the Oak Solutions logo; founder's pick
 * 2026-10-10, replacing lucide's TreeDeciduous). Drawn in currentColor with
 * its middle vein cut out, so whatever is behind shows through. Taller than
 * wide (144 × 250): size it by height, e.g. `h-6 w-auto`. The same shape is
 * in public/favicon.svg and backend/app/services/oak_mark.py. */
export function OakLeaf({ className = '' }: { className?: string }) {
  const vein = `oakvein${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  return (
    <svg viewBox="28 6 144 250" fill="currentColor" aria-hidden className={className}>
      <mask id={vein}>
        <rect width="200" height="262" fill="white" />
        <rect x="97.5" y="50" width="5" height="138" rx="2.5" fill="black" />
      </mask>
      <g mask={`url(#${vein})`}>
        <ellipse cx="100" cy="118" rx="19" ry="92" />
        <ellipse cx="100" cy="42" rx="23" ry="30" />
        <ellipse cx="134" cy="90" rx="36" ry="17" transform="rotate(-28 134 90)" />
        <ellipse cx="66" cy="90" rx="36" ry="17" transform="rotate(28 66 90)" />
        <ellipse cx="132" cy="136" rx="33" ry="16" transform="rotate(-24 132 136)" />
        <ellipse cx="68" cy="136" rx="33" ry="16" transform="rotate(24 68 136)" />
        <ellipse cx="124" cy="174" rx="25" ry="13" transform="rotate(-20 124 174)" />
        <ellipse cx="76" cy="174" rx="25" ry="13" transform="rotate(20 76 174)" />
      </g>
      <rect x="95.5" y="194" width="9" height="56" rx="4.5" />
    </svg>
  )
}
