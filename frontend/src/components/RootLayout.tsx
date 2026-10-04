import { ScrollRestoration } from 'react-router'
import { PageOutlet } from './ui.tsx'

export function RootLayout() {
  return (
    <>
      <PageOutlet depth={1} />
      {/* New page starts at the top; back/forward restores the old position. */}
      <ScrollRestoration />
    </>
  )
}
