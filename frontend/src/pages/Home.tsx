import { Link2, MessageCircleOff, Smartphone } from 'lucide-react'
import { Link, Navigate } from 'react-router'
import { useAuth } from '../auth/useAuth.ts'
import { Spinner } from '../components/ui.tsx'
import { buttonClass } from '../components/styles.ts'
import { BrandMark } from './AuthLayout.tsx'

const points = [
  { icon: Link2, title: 'One link for your shop', text: 'Share it on Facebook, TikTok, or Instagram.' },
  { icon: MessageCircleOff, title: 'Fewer back-and-forth chats', text: 'Customers see prices, photos, and stock themselves.' },
  { icon: Smartphone, title: 'Run it from your phone', text: 'Add products and update stock anywhere.' },
]

export function Home() {
  const { status } = useAuth()

  if (status === 'loading') return <Spinner />
  if (status === 'authenticated') return <Navigate to="/dashboard" replace />

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)] sm:justify-center">
      <BrandMark />
      <div className="mt-12 sm:mt-10">
        <h1 className="text-3xl font-bold leading-tight tracking-tight text-slate-900">
          Turn social media chats into real orders
        </h1>
        <p className="mt-3 text-base text-slate-600">
          A simple online shop for sellers who sell through social media.
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
          Create your store
        </Link>
        <Link to="/login" className={`${buttonClass('secondary', 'lg')} w-full`}>
          Log in
        </Link>
      </div>
    </main>
  )
}
