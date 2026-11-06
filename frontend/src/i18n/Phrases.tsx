import { Fragment, type ReactNode } from 'react'

/** A line break is allowed only at a space or a zero-width space (U+200B)
 * in the text; each piece between them stays on one line. Khmer has no
 * spaces between words, so the browser otherwise breaks it anywhere, as in
 * the middle of បណ្ដាញសង្គម (founder's pick 7A, 2026-11-06). In English
 * every word is a piece, so it wraps as usual. */
export function Phrases({ text, piece }: { text: string; piece?: (phrase: string, index: number) => ReactNode }) {
  return text.split(/([ ​])/).map((part, index) =>
    part === ' ' || part === '​' ? (
      <Fragment key={index}>{part}</Fragment>
    ) : (
      <Fragment key={index}>
        {piece ? piece(part, index / 2) : <span className="whitespace-nowrap">{part}</span>}
      </Fragment>
    ),
  )
}
