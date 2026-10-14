/**
 * Link previews on Cloudflare Pages (decided 2026-10-14): a Pages Function
 * on every /shop/* page. Preview bots get the page's own card
 * (linkPreview.ts); people go on to the app (index.html, the SPA
 * fallback). VITE_API_URL comes from the Pages project's variables.
 */
import { isPreviewBot, previewResponse } from '../../linkPreview.ts'

type Context = {
  request: Request
  env: { ASSETS: { fetch: (input: URL | string) => Promise<Response> }; VITE_API_URL?: string }
  next: () => Promise<Response>
}

export async function onRequest({ request, env, next }: Context): Promise<Response> {
  if (!isPreviewBot(request.headers.get('user-agent'))) return next()
  const page = await env.ASSETS.fetch(new URL('/index.html', request.url))
  if (!page.ok) return next()
  return previewResponse(request.url, await page.text(), env.VITE_API_URL)
}
