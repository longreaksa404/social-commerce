import { useQuery } from '@tanstack/react-query'
import { Link, Navigate } from 'react-router'
import { useAuth } from '../auth/useAuth.ts'
import { fetchHealth } from '../lib/api.ts'

export function Home() {
  const { status } = useAuth()
  const health = useQuery({ queryKey: ['health'], queryFn: fetchHealth, retry: false })

  if (status === 'authenticated') return <Navigate to="/dashboard" replace />

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-slate-50 p-6 text-center text-slate-900">
      <div>
        <h1 className="text-2xl font-semibold">Social Commerce</h1>
        <p className="mt-2 text-slate-600">Turn social media chats into real orders.</p>
      </div>
      <div className="flex gap-3">
        <Link to="/register" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700">
          Create your store
        </Link>
        <Link to="/login" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
          Log in
        </Link>
      </div>
      <p className="font-mono text-xs">
        {health.isPending && <span className="text-slate-400">API: checking…</span>}
        {health.isError && <span className="text-red-600">API: unreachable</span>}
        {health.isSuccess && <span className="text-emerald-600">API: {health.data.status}</span>}
      </p>
    </main>
  )
}
