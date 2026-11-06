import { useEffect, useRef, useState } from 'react'
import { useLang, useT } from '../../i18n/useT.ts'
import { Phone3D } from './Phone3D.tsx'
import { STEP_SCREENS, stepAt } from './screens.ts'
import type { Intro } from './useIntro.ts'

const STEPS = ['share', 'order', 'pay', 'track'] as const
// Each step is 80% of a screen of scrolling; the phone stays put meanwhile.
const STEP_SVH = 80
// The still phone turns a little at each step (the 3D one turns more).
const TURNS = ['rotateY(-12deg) rotateX(4deg)', 'rotateY(8deg) rotateX(2deg)', 'rotateY(-6deg) rotateX(6deg)', 'rotateY(12deg) rotateX(3deg)']

/** How it works: the phone stays in place while the four steps scroll by,
 * its screen changing at each. On phones the step's words change under the
 * phone, the step set by how far the stage has scrolled; on laptops they
 * scroll on the left, and the step is the one whose words are nearest the
 * middle of the screen, so the bright words always sit beside their screen
 * (founder's pick 8A, 2026-11-06). Heights are in svh, the smallest screen
 * height, so a browser bar hiding mid-scroll doesn't jump to another
 * step. */
export function HowItWorks({ intro }: { intro: Intro }) {
  const t = useT()
  const { lang } = useLang()
  const steps = t.home.steps
  const scroller = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLOListElement>(null)
  const [step, setStep] = useState(0)

  useEffect(() => {
    let frame = 0
    const measure = () => {
      frame = 0
      if (!scroller.current || !stage.current) return
      // Laptops (the list is showing): the last step whose top has passed
      // the middle, which is the one whose words are nearest it.
      if (list.current?.offsetParent) {
        const middle = window.innerHeight / 2
        const tops = [...list.current.children].map((item) => item.getBoundingClientRect().top)
        setStep(Math.max(0, tops.findLastIndex((top) => top <= middle)))
        return
      }
      const box = scroller.current.getBoundingClientRect()
      const distance = box.height - stage.current.offsetHeight
      setStep(stepAt(distance > 0 ? -box.top / distance : 0, STEPS.length))
    }
    const later = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }
    // Also on mount, so Back lands on the step it left.
    later()
    window.addEventListener('scroll', later, { passive: true })
    window.addEventListener('resize', later)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', later)
      window.removeEventListener('resize', later)
    }
  }, [])

  const number = (index: number) => `0${index + 1}`
  const fade = 'transition duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none'
  return (
    <section className="px-5 pt-24 sm:px-8 sm:pt-32">
      <div className="mx-auto max-w-6xl">
        <p data-reveal className="home-eyebrow">
          {steps.eyebrow}
        </p>
        <h2 data-reveal="wipe" className="home-display mt-3 max-w-2xl text-[clamp(1.85rem,6vw,3.25rem)]">
          {steps.title}
        </h2>
      </div>
      <div
        ref={scroller}
        data-steps
        className="relative mx-auto max-w-6xl lg:grid lg:grid-cols-2 lg:gap-10"
        style={{ height: `${STEPS.length * STEP_SVH}svh` }}
      >
        {/* Laptops: the steps scroll on the left, the one shown in full. */}
        <ol ref={list} className="hidden lg:block">
          {STEPS.map((key, index) => (
            <li
              key={key}
              className={`flex flex-col justify-center ${fade} ${index === step ? 'opacity-100' : 'opacity-35'}`}
              style={{ height: `${STEP_SVH}svh` }}
            >
              <span className="text-sm font-semibold text-champagne tabular-nums">{number(index)}</span>
              <h3 className="mt-3 text-3xl font-semibold">{steps[key].title}</h3>
              <p className="mt-3 max-w-md text-lg leading-relaxed text-slate-600">{steps[key].text}</p>
            </li>
          ))}
        </ol>
        <div
          ref={stage}
          data-step-stage
          data-step-active={step}
          className="sticky top-0 flex h-svh flex-col items-center justify-center gap-9 pt-[calc(4rem+env(safe-area-inset-top))] pb-6 lg:col-start-2 lg:row-start-1 lg:pt-16"
        >
          <Phone3D
            screen={STEP_SCREENS[step]}
            lang={lang}
            shot={step as 0 | 1 | 2 | 3}
            wait={intro === 'playing'}
            className={`w-[min(60vw,26svh)] lg:w-[min(320px,34svh)] ${fade}`}
            style={{ transform: `perspective(1600px) ${TURNS[step]}` }}
          />
          {/* Phones: the step's words under the phone, one at a time. */}
          <div className="grid w-full max-w-sm lg:hidden">
            {STEPS.map((key, index) => (
              <div
                key={key}
                className={`[grid-area:1/1] transition ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
                  // The old words leave quickly, then the new ones come: never both.
                  index === step ? 'opacity-100 delay-150 duration-500' : 'pointer-events-none translate-y-2 opacity-0 duration-150'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-champagne tabular-nums">{number(index)}</span>
                  <span aria-hidden className="flex flex-1 gap-1">
                    {STEPS.map((other, at) => (
                      <span key={other} className={`h-px flex-1 ${at <= index ? 'bg-champagne' : 'bg-slate-200'}`} />
                    ))}
                  </span>
                </div>
                <h3 className="mt-3 text-xl font-semibold">{steps[key].title}</h3>
                <p className="mt-1.5 leading-relaxed text-slate-600">{steps[key].text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
