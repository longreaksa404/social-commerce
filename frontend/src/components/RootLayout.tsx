import { Outlet, ScrollRestoration } from 'react-router'

export function RootLayout() {
  return (
    <>
      <Outlet />
      {/* New page starts at the top; back/forward restores the old position. */}
      <ScrollRestoration />
    </>
  )
}
