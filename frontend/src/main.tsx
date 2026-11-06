import * as Sentry from '@sentry/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import './index.css'
import { router } from './router.tsx'
import { AuthProvider } from './auth/AuthContext.tsx'
import { FeedbackProvider } from './components/FeedbackProvider.tsx'
import { LanguageProvider } from './i18n/LanguageProvider.tsx'
import { initTheme } from './theme/theme.ts'

// Error tracking is off unless a DSN is set (production only).
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN, environment: import.meta.env.MODE })
}

initTheme()

// A new version went live while this tab was open, so the part of the app
// it asks for (the dashboard, the admin) is gone: load the page again, once
// per address, instead of showing an error.
window.addEventListener('vite:preloadError', (event) => {
  try {
    if (sessionStorage.getItem('sc.reloaded') === location.pathname) return
    sessionStorage.setItem('sc.reloaded', location.pathname)
  } catch {
    return
  }
  event.preventDefault()
  location.reload()
})

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <FeedbackProvider>
            <RouterProvider router={router} />
          </FeedbackProvider>
        </AuthProvider>
      </QueryClientProvider>
    </LanguageProvider>
  </StrictMode>,
)
