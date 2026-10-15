/**
 * Link previews on Vercel (Routing Middleware, runs before the SPA) until
 * the move to Cloudflare Pages (decided 2026-10-14), which runs the same
 * code as functions/shop/[[path]].ts. What it does: linkPreview.ts.
 */
import { next } from '@vercel/functions'
// ".js", not ".ts": Vercel compiles each file to .js without bundling, so a
// ".ts" import points at a file that isn't there and every /shop/* page fails.
import { isPreviewBot, previewResponse } from './linkPreview.js'

export const config = { matcher: '/shop/:path*' }

export default async function middleware(request: Request) {
  if (!isPreviewBot(request.headers.get('user-agent'))) return next()
  const page = await fetch(new URL('/index.html', request.url))
  if (!page.ok) return next()
  return previewResponse(request.url, await page.text(), process.env.VITE_API_URL)
}
