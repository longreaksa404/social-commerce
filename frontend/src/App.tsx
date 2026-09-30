import { useQuery } from '@tanstack/react-query'
import { fetchHealth } from './api.ts'

function App() {
  const health = useQuery({ queryKey: ['health'], queryFn: fetchHealth, retry: false })

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-slate-50 p-6 text-slate-900">
      <h1 className="text-2xl font-semibold">Social Commerce</h1>
      <p className="rounded-lg border border-slate-200 bg-white px-4 py-2 font-mono text-sm shadow-sm">
        {health.isPending && 'API: checking…'}
        {health.isError && <span className="text-red-600">API: unreachable</span>}
        {health.isSuccess && <span className="text-emerald-600">API: {health.data.status}</span>}
      </p>
    </main>
  )
}

export default App
