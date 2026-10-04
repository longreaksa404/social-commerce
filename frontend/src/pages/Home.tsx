import { Link2, MessageCircleOff, Smartphone } from 'lucide-react'
import { Link, Navigate } from 'react-router'
import { useAuth } from '../auth/useAuth.ts'
import { Spinner } from '../components/ui.tsx'
import { buttonClass } from '../components/styles.ts'
import { LanguageSwitch } from '../i18n/LanguageSwitch.tsx'
import { useT } from '../i18n/useT.ts'
import { BrandMark } from './AuthLayout.tsx'

export function Home() {
  const { status } = useAuth()
  const t = useT()
  const home = t.auth.home
  const points = [
    { icon: Link2, title: home.pointLinkTitle, text: home.pointLinkText },
    { icon: MessageCircleOff, title: home.pointChatsTitle, text: home.pointChatsText },
    { icon: Smartphone, title: home.pointPhoneTitle, text: home.pointPhoneText },
  ]

  if (status === 'loading') return <Spinner />
  if (status === 'authenticated') return <Navigate to="/dashboard" replace />

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)] sm:justify-center">
      <div className="flex items-center justify-between gap-3">
        <BrandMark />
        <LanguageSwitch />
      </div>
      <div className="mt-12 sm:mt-10">
        <h1 className="text-3xl font-bold leading-tight tracking-tight text-slate-900">
          {home.title}
        </h1>
        <p className="mt-3 text-base text-slate-600">
          {home.subtitle}
        </p>
      </div>
      <ul className="mt-8 space-y-4">
        {points.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Icon aria-hidden className="size-5" />
            </span>
            <span>
              <span className="block font-semibold text-slate-900">{title}</span>
              <span className="block text-sm text-slate-500">{text}</span>
            </span>
          </li>
        ))}
      </ul>
      {/* Pinned to the bottom on phones, where thumbs are. */}
      <div className="mt-auto flex flex-col gap-3 pt-10 sm:mt-10">
        <Link to="/register" className={`${buttonClass('primary', 'lg')} w-full`}>
          {t.auth.createYourStore}
        </Link>
        <Link to="/login" className={`${buttonClass('secondary', 'lg')} w-full`}>
          {t.auth.logIn}
        </Link>
      </div>
    </main>
  )
}
