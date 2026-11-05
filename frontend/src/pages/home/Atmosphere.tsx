/** The light around the start page (spec 2026-11-04 §4.1), none of it
 * catching taps: behind everything, three very large soft lights drifting
 * slowly, like out-of-focus lights behind a subject; over everything, a
 * film grain and a darkening at the edges. Static images and gradients, no
 * blur filters or blending: cheap phones scroll it smoothly. */
export function Atmosphere() {
  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="home-glow home-glow-a" />
        <div className="home-glow home-glow-b" />
        <div className="home-glow home-glow-c" />
      </div>
      <div aria-hidden className="home-vignette pointer-events-none fixed inset-0 z-20" />
      <div aria-hidden className="home-grain pointer-events-none fixed inset-0 z-20" />
    </>
  )
}
