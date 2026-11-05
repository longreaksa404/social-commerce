# Home page for new sellers: design

Date: 2026-11-04. Status: design approved in chat, spec waiting for the
founder's review.

## 1. Why

`order.oaksolve.com/` (logged out) shows only the very large "Oak Order",
one line and two buttons. A seller who arrives from a video, a post or a
shared link learns nothing about what Oak Order does, what it costs or
what it looks like. The page should win new sellers: explain, show the
real app, give the price, let them try a demo shop, and send them to
**Create your shop**.

Logged-in sellers still go straight to `/dashboard` (no change).

## 2. Decisions (founder, 2026-11-04)

| # | Question | Pick |
|---|---|---|
| 1 | What the page is for | Win new sellers (a real landing page), not a richer front door |
| 2 | First screen | A new top: says what it does, Create your shop, Try a demo shop, the free-30-days line, a real phone. The big name becomes the normal logo in the top bar |
| 3 | Demo shop | "Try a demo shop" opens Oak Phone (`/shop/zdpb5d`); its orders stay open for test orders, which reach the founder's Telegram |
| 4 | Look | Luxury through restraint: midnight navy, white type, lots of space, one thin champagne-gold accent (home page only), frosted cards, smooth reveals |
| 5 | 3D | One real 3D phone built in code with three.js, showing the real app screens: floating on the first screen, and pinned through How it works while its screen changes per step. CSS depth elsewhere |
| 6 | Pictures of the app | Real screenshots from `backend/marketing/shots.py` (Oak Phone), shrunk to WebP, Khmer and English sets |
| 7 | Cinematic ("also make it cinematic") | A short opening title sequence, a moving 3D camera and a light sweeping across the phone, each How it works step framed like a film shot, light film grain and a vignette (section 4.1) |

Cost accepted (Rule 3): $0, no new service; one new library (`three`,
MIT, about 170 KB gzipped, loaded only on this page); about 2–3 evenings
for the page, about 2 for the 3D and checking on real phones, and about 1
for the cinematic parts.

## 3. The page, top to bottom

Phone first (390 px). On laptops (≥ 1024 px) the text and the phone sit
side by side. The page is navy in light and dark mode alike (it's the
brand, as the start page is today).

English below; the Khmer is drafted with the code and checked by the
founder before it ships. Khmer is the default language, as everywhere.

### 3.1 Top bar

The acorn and "Oak Order" (`BrandMark`), the language switch, **Log in**
(ចូលគណនី). It stays at the top while scrolling, on a frosted navy strip
once the first screen has scrolled away.

### 3.2 First screen

- Headline: **Turn social media chats into real orders** (today's line,
  word for word).
- Under it: "One link for your Facebook, TikTok and Instagram shop.
  Customers order and pay through it, and you see every order, payment and
  delivery in one place on your phone." (MARKETING_FACTS §1)
- **Create your shop** (white, solid) → `/register`.
- **Try a demo shop →** (outline) → `/shop/zdpb5d`, with a small line
  under it: "Oak Phone is our demo shop. Place an order to try it; don't
  pay the QR."
- A small gold-edged line: "Free for your first 30 days of selling. No
  card."
- The phone (3D, or the still picture: section 5) showing Oak Phone's
  shop. On phones it sits under the buttons, its top visible on the first
  screen so people scroll.

### 3.3 How it works

A tall section. On phones the phone stays pinned in the upper part of the
screen and the step's text in the lower part changes as you scroll; on
laptops the phone is pinned on the right and the steps scroll on the left.
At each step the phone turns to a new angle and its screen changes.

| Step | Text | Screen |
|---|---|---|
| 1 | **Share one link in every post.** Your shop, a product or a category, with a picture card in Facebook and Telegram. | share link (`16_share_link`) |
| 2 | **Customers order in your shop.** No app, no account, no password. | checkout (`05_checkout`) |
| 3 | **They pay by KHQR, straight to your bank.** The QR has the exact amount. Oak Order takes no cut. One tap marks it paid. | KHQR (`11_khqr`) |
| 4 | **Every order in one place.** Each new one on your Telegram; follow it to delivered. | Orders tab (`07_dashboard`) |

The step numbers are in gold.

### 3.4 Also in Oak Order

Six frosted tiles, an icon (lucide) and two lines each, no screenshots.
On phones 2 columns, on laptops 3. A tile tilts slightly toward the finger
or mouse (CSS 3D), not with reduce motion.

1. **Orders from chat too**: add an order that came by chat in seconds,
   then send the customer a link to follow and pay.
2. **Stock counts itself**: it goes down with every order, and Telegram
   tells you when a product runs low or sells out.
3. **Send to driver**: the customer, address, map pin and what to collect,
   in one message.
4. **A receipt to share or print**: a parcel slip for each order.
5. **Your customers in one list**: each one's orders and what they spent.
6. **Export your orders to Excel**: this month, last month or chosen days.

### 3.5 Price

One centred card with a gold hairline:

- **Oak Order Standard**
- **$9.99** a month, or **$99 a year** (save $20.88)
- Free for your first 30 days of selling: the 30 days start when you open
  your shop, not when you sign up.
- No card, no automatic charges. Pay by KHQR when it's time.
- Everything included, with up to 10 staff logins.
- We help you set up your shop.
- **Create your shop**

The prices and the trial's length come from the public
`GET /plan/prices` (set on the admin page), read the way the Terms page
already does: today's $9.99, $99 and 30 days show at once and are replaced
when the answer comes. "Save" is 12 × the month price − the year price. The
free-30-days line on the first screen and question 4 use the same numbers.

### 3.6 Questions

Five questions that open on tap (`<details>`, no script):

1. **Do my customers need an app or an account?** No. They open your link
   in their phone's browser, choose and order. Customers who use Telegram
   can follow their order there.
2. **Do I need a computer?** No. Oak Order works in your phone's browser,
   with nothing to install. A laptop works too.
3. **How do customers pay?** By KHQR, straight into your own bank account
   (ABA, ACLEDA, Wing and other Bakong banks), or in cash on delivery. You
   check your bank app and tap Mark paid.
4. **What happens after 30 days?** It's $9.99 a month or $99 a year, paid
   by KHQR. If you don't pay, nothing is deleted, and paying opens your
   shop again at once.
5. **Can I still take orders in chat?** Yes. Add a chat order in Oak Order
   and it's counted with the rest, stock and all.

### 3.7 Bottom

Navy with a soft glow: "Your shop can be ready today." and **Create your
shop**. Then "Questions? Message us on Telegram" (only when
`VITE_SUPPORT_TELEGRAM` is set, as everywhere else), Privacy · Terms ·
Data deletion (`LegalLinks`), and "© Oak Solutions".

### 3.8 Claims

Every sentence on the page comes from MARKETING_FACTS §3–§5 ("Live" rows
and "you can say"), and none from §6 "Don't claim": no automatic payment
checks, no courier links, no app to download, no "free forever", no
seller numbers or quotes.

## 4. The look

- **Colours.** Background navy-950 (`#0b1320`) fading to navy-900, with a
  large soft navy-600 glow behind the phone. Text white, secondary text
  white at 70%. Hairlines white at 10%. One new token,
  `--color-champagne` (about `#d6bc8a`, tuned on screen), used only on the
  home page for step numbers, the price card's edge, the free-30-days
  line and small icons. Never for body text or buttons.
- **Type.** English headlines in Inter, large and tight (about −0.03em,
  semibold). Khmer in Noto Sans Khmer at its normal line height (no tight
  tracking: Khmer stacks need room). The name stays in the wordmark font.
- **Surfaces.** Frosted cards: white at 4% with a 1px white-10% edge and a
  large soft shadow. Backdrop blur only on the top bar (blur on many
  cards is slow on cheap phones).
- **Motion.** Sections fade and rise 16 px as they come into view (one
  `IntersectionObserver`). With reduce motion: no movement, everything
  shown.
- **Buttons.** At least 48 px tall, rounded-xl, as today.

### 4.1 Cinematic

The page should feel like the opening of a film, without ever making
anyone wait.

- **Opening title sequence** (about 1.6 s, once per visit: a flag in
  `sessionStorage`, skipped if storage fails). The page opens dark; a
  soft light rises behind where the phone will be; the headline appears
  word by word, each word sharpening from a slight blur (the same
  word-by-word titles as Oak Order's videos); the phone rises out of the
  dark and a band of light sweeps across its edge and glass; the line
  under the headline, the buttons and the free-30-days line fade in last.
  Everything is in the page from the first moment (real text, real links):
  the sequence is only CSS opacity and transforms on top, so the buttons
  can be tapped at once and nothing waits on three.js. A tap or a scroll
  during the sequence finishes it at once.
- **Film grain and vignette.** A fixed layer over the whole page: a small
  tiled noise image at about 4% opacity, and a radial darkening at the
  edges. Both are static images, not animated, and don't catch taps
  (`pointer-events: none`).
- **Light, not decoration.** Two or three very large, very soft glows
  (navy and a hint of gold) drift slowly in the background, like out-of-
  focus lights behind a subject. Radial gradients, no blur filters.
- **Scenes.** Each section is a scene. Scrolling from the first screen into
  How it works, the first screen dims and drifts back slightly, like a
  cut through black; section titles reveal with a soft upward wipe
  (a mask), not a plain fade.
- **Easing.** One slow, precise curve for everything
  (`cubic-bezier(0.16, 1, 0.3, 1)`), 0.6–1.2 s for scene moves. Nothing
  bounces.
- **No sound**, and no video file.
- **Reduce motion:** no title sequence, no drifting glows, no wipes; the
  grain and vignette stay (they don't move).

## 5. The 3D phone

### 5.1 What it is

A phone built from code, no model file: a rounded titanium body
(`RoundedBoxGeometry`, a metal material lit by three.js's
`RoomEnvironment`, so there is no lighting file to download), a black bezel,
the screen as a flat plane showing the screenshot (unlit, so it's as bright
as a real screen), a thin glass layer with a soft reflection, and a dark
"island" at the top. The back is never shown: it turns at most about 35°
each way.

### 5.2 How it moves

- **First screen:** floats (a slow up-and-down and a slow sway), and
  leans toward the mouse or a dragging finger, easing back when let go.
  A finger dragging up or down still scrolls the page.
- **How it works:** a second instance, pinned (CSS `position: sticky`). The
  scroll position picks the step; the phone eases to that step's angle and
  its screen cross-fades to the step's screenshot in about 0.4 s.
- **Camera, like a film.** Each step is its own shot: the camera moves
  (not the page) to a set framing over about 1 s. Step 1 a wide, slightly
  low angle; step 2 a push in toward the screen; step 3 a close-up on the
  QR with the light on the glass; step 4 pulling back to the whole phone,
  turned the other way. On the first screen the camera pushes in slowly as
  the page scrolls.
- **Light sweep.** A bright band of light (a moving highlight on the
  titanium edge and a soft streak across the glass) passes over the phone
  in the opening sequence and at each step change. The screen itself
  stays readable under it.
- **Shadow.** A soft contact shadow under the phone, so it stands in the
  scene rather than floating on the page.
- Only a phone that is on screen draws; drawing stops when it scrolls away
  or the tab is hidden. At most 2× the screen's pixel density.

### 5.3 The still picture, and when it stays

`PhoneStill` is a phone drawn in CSS (rounded frame, edge highlight,
shadow) around the WebP screenshot, tilted with a CSS perspective. It shows
first, so the page is complete before three.js arrives, and the 3D phone
fades in over it once its first frame is drawn.

The still stays (three.js is never downloaded) when any of these is true:

- reduce motion is on;
- WebGL can't start;
- the browser asks to save data (`navigator.connection.saveData`);
- the phone reports less than 4 GB memory (`navigator.deviceMemory`, where
  known) or fewer than 4 cores.

If the 3D phone's first 60 frames average more than 40 ms, it removes
itself and the still comes back.

In How it works, the still version swaps screenshots with the same
cross-fade, so the steps work without 3D.

### 5.4 Loading

`three` is imported only inside the 3D phone's module, through a dynamic
`import()`, so it becomes its own chunk. The shop pages and the dashboard
never load it. The first screen's screenshot loads at once
(`fetchpriority="high"`); How it works' screenshots load when the section
is near.

## 6. Screenshots

1. The Oak Phone pictures from `backend/marketing/shots.py` (made
   2026-11-05, commit `520be76`).
2. A small script, `backend/marketing/home_images.py` (Pillow, already a
   backend dependency), turns the 5 PNGs per language into WebP at
   780 × 1688 (2× a 390 × 844 screen), quality about 82, into
   `frontend/public/home/{km,en}/{shop,share,checkout,khqr,orders}.webp`.
   Each should be under about 150 KB.
3. The page picks the set for the current language. These 10 files are
   committed (the PNGs stay git-ignored).

When a screen in the app changes, run both scripts again.

## 7. Code

```
frontend/src/pages/home/
  Home.tsx          the page: the auth redirect (as today), then the sections
  TopBar.tsx
  Hero.tsx
  HowItWorks.tsx    the pinned stage and the scroll-to-step logic
  Features.tsx
  Pricing.tsx
  Questions.tsx
  Bottom.tsx
  PhoneStill.tsx    CSS phone around a screenshot
  Phone3D.tsx       React wrapper: capability check, lazy import, fade in, fallback
  phoneScene.ts     the three.js scene (no React), imported only by Phone3D
  screens.ts        screenshot paths per language and step
  Atmosphere.tsx    the fixed grain, vignette and drifting glows
  useIntro.ts       the opening title sequence: once per visit, ends on tap or scroll
  useReveal.ts      fade-in and title wipes on scroll
frontend/src/i18n/messages/home.ts   the page's texts, Khmer and English
frontend/public/home/{km,en}/*.webp
frontend/public/home/grain.webp      a small tiled noise image (a few KB)
backend/marketing/home_images.py
```

- `pages/Home.tsx` moves to `pages/home/Home.tsx`; `router.tsx` imports the
  new path. The headline stays `auth.home.title` (the login and register
  pages' navy half shows it too); `auth.home.tagline` is deleted (only the
  old start page used it). Every other text is new, in `home.ts`.
- The demo shop's code is a constant in `screens.ts` (`DEMO_SHOP =
  'zdpb5d'`), with a comment pointing to MARKETING_FACTS §8.
- `--color-champagne` goes in `index.css` `@theme`.
- The Terms page's `usePrices` moves out of `pages/Legal.tsx` into
  `src/lib/planPrices.ts` so the home page and the Terms page share it.
- No backend change, no new environment variable. The only API call is
  the existing public `GET /plan/prices`.

## 8. Checks before it's done

No automated frontend tests (CLAUDE.md). Instead:

- `npm run lint` and `npm run build` pass; the build shows `three` in its
  own chunk, and the main chunk grows by no more than a few KB.
- Screenshots with headless Chromium at 390 × 844 and 1440 × 900, Khmer
  and English: every section, the pinned steps at each step, nothing wider
  than the screen.
- The same with reduce motion on, and with WebGL off: the still phone,
  everything readable, the steps still change.
- Lighthouse (mobile) on the built page: performance 90+, accessibility
  100, no layout shift from the phone.
- The title sequence: the buttons can be tapped during it; a scroll ends
  it; it doesn't play a second time in the same visit; it never plays
  with reduce motion.
- Keyboard: every link and question reachable with a visible focus ring.
- The founder, on their own phone, on the deployed site: in Chrome, and
  opened from TikTok's and Facebook's in-app browsers (which can't be
  tested here), and a test order through Try a demo shop.

## 9. Docs to update with the code

- `docs/04_STATUS.md`: Done (the home page), Last updated, and Next Up
  (the founder's checks on a real phone).
- `docs/CODEBASE.md`: the routes table row for `/`, the `pages/` line,
  the key files, the home screenshots under "Marketing pictures and
  clips", and `three` in the frontend libraries.
- `docs/MARKETING_FACTS.md`: §1 (the page's lines), §3.0 (the start page's
  buttons, now Create your shop and Try a demo shop), §8 (the demo shop is
  linked from the home page), §9.
- `brand/README.md`: the champagne gold, home page only.
- `docs/03_DEVELOPMENT.md` Phase 9 table, a new row (the founder approves
  the text): "Home page for new sellers: what Oak Order does, How it works
  with a 3D phone showing the real screens, the price, questions, a demo
  shop to try; navy with a champagne accent, a cinematic opening and
  camera (founder's picks 2026-11-04) | 24".

## 10. Not in this

- Pages for one kind of seller (fashion, beauty, …), from 01 §34.
- Seller numbers, reviews or quotes (no seller is live yet).
- Visit counting or analytics on the home page.
- A video on the page (the marketing videos stay on TikTok and Facebook).
- A demo label inside the Oak Phone shop itself.
- Changes to `index.html`'s title, description or link card (they already
  carry the start page's line).
