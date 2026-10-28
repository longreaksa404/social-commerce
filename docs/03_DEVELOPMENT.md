# Social Commerce SaaS — Development Plan

> **Status:** Draft — derived from `01_PRODUCT.md` and `02_TECHNICAL.md`
>
> This document defines **HOW and WHEN** the MVP gets built.
>
> Product rationale and MVP scope live in `01_PRODUCT.md`.
> Architecture and data model live in `02_TECHNICAL.md`.
>
> Planning assumption: solo founder, **10–20 hours/week**, building alongside full-time employment (`01_PRODUCT.md` §2.3, §38.8).

---

# 1. Development Principles

1. **Build the smallest complete loop first, then widen.** Get one product through checkout to delivery before polishing any single step.
2. **No phase is "done" until it's usable end-to-end**, not just "code exists." Matches the MVP Definition of Done in `01_PRODUCT.md` §42.
3. **Use yourself as the first test seller.** Before recruiting a real seller, run the full workflow (§9 in `01_PRODUCT.md`) yourself with fake/real products to catch broken flows cheaply.
4. **Track every custom request separately from the roadmap.** Per `01_PRODUCT.md` §39 — anything a seller asks for that isn't in this plan goes into a running "requirements log," not straight into the codebase.
5. **Timebox spikes.** Unknowns (Bakong integration, Telegram bot setup) get a capped exploration slot before being scheduled as real work, so an unexpectedly hard integration doesn't silently blow up the schedule.

---

# 2. Estimation Basis

At **10–20 hrs/week**, budget roughly **12–15 effective hours/week** after accounting for context-switching from a full-time job (setup time, interrupted sessions, review/testing overhead). Estimates below are in **person-hours**, converted to elapsed weeks at that rate. Treat elapsed-week numbers as ranges, not commitments — the hour estimates are the more reliable unit.

> **Update (2026-09-30):** The estimates above assume hand-coding. Since
> development now uses Claude Code, treat the hour estimates as an upper bound.
> Actual hours are not tracked (time log dropped 2026-10-02).

---

# 3. Phase Breakdown

```
Phase 0 — Setup & Foundations
Phase 1 — Auth + Store + Product Management
Phase 2 — Storefront (Customer-Facing Browsing)
Phase 3 — Checkout + Orders
Phase 4 — Payments
Phase 5 — Delivery
Phase 6 — Telegram Integration
Phase 7 — Notifications + Customer Management
Phase 8 — Shareable Links + Basic Tracking
Phase 9 — Polish, Hardening, First Real Seller
```

This order follows the Product Expansion Strategy in `01_PRODUCT.md` §41 (Core Ordering → Inventory → Payments → Delivery → Customer Management), adapted to what can be built and tested incrementally by one person.

---

## Phase 0 — Setup & Foundations

**Goal:** empty-but-deployed skeleton, so every future phase ships to a real URL from day one.

| Task | Est. hours |
|---|---|
| Repo setup (backend + frontend, monorepo or two repos) | 2 |
| FastAPI project skeleton, Pydantic settings, health-check endpoint | 3 |
| PostgreSQL provisioning (managed), Alembic migration setup | 3 |
| SQLAlchemy base models, `tenant_id` convention established | 2 |
| React + Vite + TypeScript + Tailwind skeleton | 3 |
| CI: lint + basic test run on push (GitHub Actions, free tier) | 2 |
| Deploy skeletons: backend → Render, frontend → Vercel | 3 |
| Error tracking (Sentry) wired into both apps | 1 |

**Subtotal:** ~19 hours (**~1.5–2 weeks**)

> Domain + Cloudflare DNS moved to Phase 9 (2026-10-01): the free
> `*.onrender.com` / `*.vercel.app` URLs are enough until a real seller.

**Definition of done:** visiting the deployed frontend URL loads a blank page that successfully calls a deployed backend health-check endpoint.

---

## Phase 1 — Auth + Store + Product Management

**Goal:** a seller can register, log in, and manage their product catalog.

| Task | Est. hours |
|---|---|
| `seller`, `store` tables + migrations | 2 |
| Register/login/refresh endpoints + JWT issuing | 5 |
| Password hashing, basic auth middleware/dependency | 2 |
| Seller dashboard shell (layout, protected routes, login/register pages) | 6 |
| `product`, `product_variant`, `category` tables + migrations | 3 |
| Product CRUD endpoints (create/edit/deactivate) | 6 |
| Category CRUD endpoints | 2 |
| Image upload: presigned URL flow (backend + R2 setup) | 5 |
| Product list + product form UI (with image upload, variants) | 10 |
| Category management UI | 3 |
| RLS policies on tenant tables | 3 |

**Subtotal:** ~47 hours (**~3–4 weeks**)

**Definition of done:** a seller can register, log in, create a store, add a product with an image and stock quantity, and see it in a product list.

---

## Phase 2 — Storefront (Customer-Facing Browsing)

**Goal:** a customer can open a store/product/category link and browse.

| Task | Est. hours |
|---|---|
| Public storefront endpoints (`/shop/{slug}/...`) | 5 |
| Storefront layout (store page, product grid) | 6 |
| Product detail page (images, variants, price, stock) | 6 |
| Category page | 3 |
| Responsive/mobile styling pass (most traffic will be mobile, from social apps) | 5 |

**Subtotal:** ~25 hours (**~2 weeks**)

**Definition of done:** opening `/shop/{store-slug}` on a phone shows real products; opening a product link shows that specific product correctly.

---

## Phase 3 — Checkout + Orders

**Goal:** a customer can place an order; a seller can see and manage it.

| Task | Est. hours |
|---|---|
| `customer`, `order`, `order_item` tables + migrations | 3 |
| Cart state (frontend, in-memory/localStorage — no backend cart needed pre-checkout) | 5 |
| Checkout flow UI (customer info, delivery info, review) | 8 |
| Order creation endpoint (guest checkout, stock check, snapshot pricing) | 6 |
| Order confirmation page + order tracking lookup endpoint/page | 5 |
| Seller order list + order detail UI | 8 |
| Order status transition endpoint + transition-table enforcement | 4 |
| Seller order status update UI (accept/reject/advance status) | 5 |
| Automatic vs. manual order confirmation setting | 2 |

**Subtotal:** ~46 hours (**~3–4 weeks**)

**Definition of done:** a customer can complete checkout end-to-end and see a confirmation; the seller sees the order appear and can accept/reject/advance it, matching the order state machine in `02_TECHNICAL.md` §7.1.

**This is the first point where the complete "smallest transaction loop" (product → order) exists — worth manually testing the full path before continuing.**

---

## Phase 4 — Payments

**Goal:** COD, manual bank transfer, and KHQR all work at the MVP's "manual confirmation" level.

| Task | Est. hours |
|---|---|
| `payment` table + migration | 1 |
| Payment method selection at checkout (COD / bank transfer / KHQR) | 4 |
| COD: mark-paid flow (seller side) | 2 |
| Bank transfer: display store's bank details after ordering (order page) | 2 |
| **Spike:** Bakong/KHQR API access — confirm requirements, timebox 4 hrs | 4 |
| KHQR generation + QR display after ordering (order page) | 6 |
| Payment status update endpoint + seller UI | 3 |

**Subtotal:** ~22 hours (**~1.5–2 weeks**, KHQR spike may push this depending on Bakong onboarding friction — flag as the phase most likely to slip)

**Definition of done:** an order can be placed with any of the three payment methods, and a seller can mark it paid.

> **Spike result (2026-10-02):** generating a KHQR needs no Bakong onboarding,
> account, or API token: the code is built on our server from the seller's
> Bakong ID (`02_TECHNICAL.md` §10.3). Only automatic payment confirmation
> needs the Bakong Open API, which stays post-MVP. So KHQR shipped in
> Phase 4 and the fallback in §9 wasn't needed. Payment details show on the
> order page right after ordering (decided 2026-10-02).

---

## Phase 5 — Delivery

**Goal:** seller-managed delivery status + pickup option both work.

| Task | Est. hours |
|---|---|
| `delivery` table + migration | 1 |
| Delivery method selection at checkout (seller delivery / pickup) | 2 |
| Delivery status update endpoint (transition table per `02_TECHNICAL.md` §7.3) | 3 |
| Seller delivery status UI | 4 |
| Pickup-specific simplified flow | 2 |
| Order completion rule (payment + delivery gating, `02_TECHNICAL.md` §7.4) | 2 |
| Delivery fee + free-delivery rules, couriers, customer GPS location + address note (decided 2026-10-03) | 6 |
| Bill discounts (decided 2026-10-03) | 4 |

**Subtotal:** ~24 hours (**~2 weeks**)

> **Decided (2026-10-03):** one delivery fee per shop for any address and
> any courier, free from an amount or a number of items; the seller's own
> delivery and/or couriers (J&T, VET, ...) chosen by the customer and booked
> by hand; GPS location + address note at checkout; simple bill discounts;
> completion needs the delivery delivered; a failed delivery can be retried.
> See `01_PRODUCT.md` §26 and `02_TECHNICAL.md` §5.2, §7.3, §7.4.

**Definition of done:** an order can be marked through delivery states to `delivered`, and the order itself can then be marked `completed`.

---

## Phase 6 — Telegram Integration

**Goal:** seller notifications + "Ask Seller" customer flow.

| Task | Est. hours |
|---|---|
| Telegram bot creation + webhook registration | 2 |
| Store-to-Telegram linking flow (code-based) | 4 |
| `notification_log` table + migration (moved from Phase 7, 2026-10-03: every alert writes a row) | 1 |
| Seller notification sending (new order, low stock; decided 2026-10-03) | 5 |
| "Ask Seller": seller's Telegram username + `t.me/<username>?text=` link (decided 2026-10-03: the seller's own Telegram, no bot conversation) | 2 |
| Settings UI: connect/disconnect Telegram, username | 3 |

**Subtotal:** ~17 hours (**~1.5 weeks**)

**Definition of done:** placing a test order sends a real Telegram message to the seller; tapping "Ask seller" on a product opens a Telegram chat with the seller's own account.

---

## Phase 7 — Notifications (Web) + Customer Management

**Goal:** in-app notifications and a basic customer list/history.

| Task | Est. hours |
|---|---|
| Web notification UI (simple in-dashboard list/badge, no push notifications needed for MVP) | 5 |
| Customer list endpoint + UI | 3 |
| Customer detail (order history) endpoint + UI | 3 |

**Subtotal:** ~11 hours (**~1 week**)

**Definition of done:** a test order makes the bell show a count, and tapping the notification opens the order; from the order, the seller opens the customer and sees their details and order history.

---

## Phase 8 — Shareable Links + Basic Tracking

**Goal:** sellers can generate and share trackable links.

| Task | Est. hours |
|---|---|
| `shareable_link`, `link_event` tables + migrations | 2 |
| Link generation endpoint + UI (store/product/category) | 4 |
| View/order tracking (background task write) | 3 |
| Basic link stats view (views, orders per link) | 4 |
| Link previews: Open Graph tags for preview bots (decided 2026-10-03) | 4 |

**Subtotal:** ~17 hours (**~1.5 weeks**)

> **Decided (2026-10-03):** the seller makes a named link per place they
> post (`?l=<token>`); an order counts for the last link opened on that
> device in the last 7 days; a Links tab replaces Categories in the phone's
> tabs; link previews built here. See `02_TECHNICAL.md` §9.

**Definition of done:** a seller makes a link for a product and shares it; it previews with the product's name and photo; opening it and ordering shows one view and one order on the link's page.

---

## Phase 9 — Polish, Hardening, First Real Seller

**Goal:** ready for one real seller to use it with real customers.

| Task | Est. hours |
|---|---|
| End-to-end manual test pass of full workflow (§42 in `01_PRODUCT.md`) | 4 |
| Error states / empty states / loading states pass across UI | 8 |
| Mobile responsiveness pass on storefront + checkout (highest-traffic surfaces) | 6 |
| Basic rate limiting + security review (`02_TECHNICAL.md` §13) | 4 |
| Seed real store data for first seller | 3 |
| Onboard first real seller (manual walkthrough, not self-serve yet) | 4 |
| Domain + Cloudflare DNS setup (moved from Phase 0) | 1 |
| Khmer / English language switch (all UI text in shop + dashboard; default Khmer; seller-entered text not translated) | 12 |
| Light / dark mode (follows phone setting + Light/Dark/Auto switch in Settings and a light/dark button in the shop; KHQR stays dark on light) | 8 |
| Small photo copies for grids and lists (Phase 2 proposal, decided 2026-10-04) | 3 |
| Nightly database backup to a private R2 bucket (decided 2026-10-04) | 2 |
| UX pass: delivery/payment info on shop and product pages, pinned Add to cart, shop logo; Settings as a menu; order page summary; one row per product option (founder's request 2026-10-04) | 15 |
| Order tracking for customers: current-order bar, Your orders page, auto-refresh, ask about an order on Telegram (founder's request 2026-10-04) | 7 |
| UX pass 2: effects in the shop and the dashboard, cart bars toward a discount and free delivery with a pinned Checkout, numbered checkout, shop logo beside the name, softer cards, Kantumruy Pro for Khmer (founder's request 2026-10-04) | 10 |
| Layout pass: phones edge to edge, lists aligned, action and Save bars floating on wide screens (founder's request 2026-10-04) | 3 |
| Load test before the first seller (`backend/loadtest/`: locally at Render's CPU, then once on the live site) and the bcrypt fix it found (founder's request 2026-10-06) | 4 |
| Frontend redesign: Navy brand colour, Kantumruy Pro for all text, every screen reworked from options the founder picked (shop, checkout, order tracking, seller orders, products, customers, links, settings, login, start page), the brand name and mark, Oak Order since 2026-10-08 (founder's request 2026-10-06, done 2026-10-08) | 14 |
| More in Settings: your account and password, forgot password via the shop's Telegram, pause orders with a reopening day, Call and Messenger buttons, low-stock alert level, export orders to Excel, close shop, staff logins (everything but Settings), the founder's commands (`docs/ADMIN.md`) (founder's request 2026-10-08, done the same day; plan and billing: the rows below, since pricing was decided 2026-10-14) | 39 |
| Pre-pilot review: login renewal retry, delivery-fee reminder, first-product empty state, Khmer bot; then the short path, Not paid after all, orders from chat, Send to driver, I've paid, setup checklist (founder's picks 2026-10-09) | 32 |
| Sign-up with a phone number checked through the Telegram bot, phone number logins (staff too), Continue with Google, Facebook and TikTok; privacy policy, terms and data deletion pages (founder's request 2026-10-09) | 24 |
| Oak in the shop: "Made with Oak Order" with Privacy · Terms at the bottom of the shop's grid pages and the order page; link cards titled "… · Oak Order" with Oak's mark small on the logo or photo (drawn by the API); the oak leaf as the mark; Oak's own link card and iPhone icon (founder's picks 2026-10-10) | 4 |
| Plan and billing, part 1 (pricing decided 2026-10-14, `01_PRODUCT.md` §33.1; the data model is shown to the founder first): the 1-month free trial, Settings → Plan (trial or paid-until date, the price, past payments), reminders in the dashboard, no new orders 7 days after an unpaid trial or period, the founder's command to record a payment made by hand, the sign-up and Terms text | 12 |
| Move the frontend from Vercel to Cloudflare Pages, link previews included (founder's pick 6A, 2026-10-14; before the first seller pays) | 4 |
| Plan and billing part 2, hand collection: admin page, payment status, daily reminders, I've paid (founder's picks 2026-10-14; real time spent, about 2 hrs: the admin page and payment statuses carried over from the PayWay work, then the rework) | 2 |
| Wrong or fake customer phones, part 1: checkout reads the number back once it's whole ("The seller will call 012 345 678") and warns when no Cambodian number starts like it (founder's pick 2026-10-15) | 2 |
| Wrong or fake customer phones, part 2: "Get updates on Telegram" on the customer's order page; the customer shares their Telegram number with Oak's bot and gets their order's news there; the seller sees "Phone confirmed in Telegram", or the Telegram number when it's another one (founder's pick 2026-10-15; adds `customer.telegram_phone`) | 10 |
| Shop links: a changed link keeps opening the shop (old links forward to the current one and stay that shop's) (founder's pick 2026-10-15; adds `store_old_slug`); a new shop's link is a 6-character code, made at sign-up, not changeable (2026-10-18) | 3 |
| Customers log in with Telegram (founder, 2026-10-20): the mini app test, Continue with Telegram at checkout, the shop inside Telegram (Open checkout, the cart carried), a receipt and "Sent" alerts, "🛍 <shop>" beside the message box, "Your shops" for OPEN, the customer's Telegram photo (adds `phone_check.cart`, `customer.photo_url`) | 22 |
| Customer Telegram and payments (founder's picks 1-3, 2026-10-20): "Message on Telegram" from the seller's order to a customer who gets updates there, with a button to reply to the shop's own Telegram; "Received, mark paid" under the seller's "says paid" Telegram alert; a payment reminder to the customer 2 hours after a KHQR or bank order, and "Not paid after 24 h" with Cancel order as the seller's next step (an hourly cron-job.org call) | 11 |
| Admin panel (founder's picks 2026-10-28, `01_PRODUCT.md` §22.11: D1A D2B D3A D4B D5A; every part but 7, later, and 32, skipped): its own `/admin` area in English, with its own admin account (password, then Telegram; no shop); Home with what needs you and the numbers; shops (list, page, close, reopen, erase); Open as seller (30 minutes, logged, the shop told); people (every login, password, log out, phone, Google/Facebook); money (paid-until date, undo, every payment with Excel, reminder now); orders, customers and products across shops; settings (riel rate, prices, trial length); system (jobs, bot, version); the activity log; test shop, a Telegram message to every shop, sign-ups that didn't finish. Data: `admin_account` (+ `admin_session`), `admin_action`, `platform_setting`, a `void` payment status, unfinished phone checks kept 30 days. A design options page first, then 7 steps | 34 |
| Bug-fix buffer | 10 |

**Subtotal:** ~314 hours (**~24 weeks**)

> **Decided (2026-10-04):** a .com domain bought through Cloudflare (oaksolve.com, bought 2026-10-09); Render
> stays on the free plan for the first seller (the app says when the
> server is waking up; a free cron-job.org ping keeps it awake from 7:00
> to midnight, 2026-10-08); small photo copies and nightly backups built here.
> See `02_TECHNICAL.md` §3, §11, §15.

**Definition of done:** a real seller runs their shop on the live site in Khmer, and a real customer's order goes from a shared link to completed.

---

# 4. Total Estimate

| Phase | Hours | Elapsed (at ~13 hrs/week) |
|---|---|---|
| 0 — Setup | 19 | 1.5 wks |
| 1 — Auth/Store/Products | 47 | 3.5 wks |
| 2 — Storefront | 25 | 2 wks |
| 3 — Checkout/Orders | 46 | 3.5 wks |
| 4 — Payments | 22 | 1.5–2 wks |
| 5 — Delivery | 24 | 2 wks |
| 6 — Telegram | 17 | 1.5 wks |
| 7 — Notifications/Customers | 11 | 1 wk |
| 8 — Links/Tracking | 17 | 1.5 wks |
| 9 — Polish/First Seller | 281 | 21.5 wks |
| **Total** | **~509 hrs** | **~39 weeks (~9 months)** |

This is a planning estimate, not a commitment.

---

# 5. Sprint Structure

Given the hours-per-week constraint, use **2-week sprints** rather than weekly ones — a 1-week sprint at 10–15 hours is too short to absorb interruption from the day job.

**Per sprint:**
1. Pick the next phase (or split a large phase across 2 sprints).
2. Break the phase's task table into daily-sized chunks (1.5–3 hrs each) at the start of the sprint.
3. End-of-sprint: does the phase's "Definition of done" statement hold true? If not, it's not done — carry it forward rather than marking partial credit.

---

# 6. Requirements Log

Maintain a **Requirements Log** for anything a seller asks for that isn't in this plan (per `01_PRODUCT.md` §39):

| Column | Purpose |
|---|---|
| Date | |
| Seller | who asked |
| Request | what they asked for |
| Category | one-off vs. possibly-repeated |
| Seen from other sellers? | tracked over time — this is how "custom request → repeated pattern → reusable feature" gets decided, not gut feel |

### Log

| Date | Seller | Request | Category | Seen from other sellers? |
|---|---|---|---|---|
| 2026-10-02 | Founder (own idea while testing Phase 4; no seller yet) | **One-tap pay for several banks.** A "Pay" button that opens the customer's own bank app (ABA, ACLEDA, Wing, …) with the amount filled in, and marks the payment paid automatically. Today the customer saves the KHQR and scans it from their gallery, and the seller confirms by hand. | Possibly repeated. **Validate First** (`01_PRODUCT.md` §44) | Not yet; ask the first sellers |
| 2026-10-09 | Founder (trying the Orders tab's numbers card locally; no seller yet) | **Seller dashboard.** A page for the shop's numbers (orders, sales, not paid yet; today, 7 days, this month) with a chart of sales per day. The Orders tab had them as a card for a day; the founder took it off until this page exists. The server part is built (`GET /seller/stats`, owner only). | Possibly repeated. **Build later** | Not yet |
| 2026-10-10 | Founder (Oak in the shop; no seller yet) | **Hide "Made with Oak Order".** Sellers on a paid plan can turn off the line at the bottom of their shop (our mark and "Made with Oak Order"; Privacy · Terms would stay). A common paid extra on shop builders. | Possibly repeated. **Decided 2026-10-14:** the line stays on the Standard plan; hiding it may come with a later plan, Growth or Business (`01_PRODUCT.md` §33.1, §33.4) | Not yet |
| 2026-10-06 | Founder (shop redesign; no seller yet) | **Search in the shop.** A search box above the products, for shops with many products (30+). Not in the MVP customer features (`01_PRODUCT.md` §24). | Possibly repeated. **Validate First**: build when a seller's shop is big enough to need it | Not yet |
| 2026-10-14 | Founder (Oak's own billing; no seller yet) | Automatic subscription payments with ABA PayWay: Pay now and auto-charge from a linked ABA account or card. Built up to the PayWay calls; parked on branch payway. | Platform (Oak's own billing). Build Later: when Oak Solutions has MOC registration and 6 months of business, or hand collection takes over ~4 hrs/month | n/a |
| 2026-10-15 | Founder (customers giving wrong or fake phone numbers; no seller yet) | **Seller tools against fake orders.** On the order, a "Couldn't reach the customer" reason when cancelling; on the customer, a "No cash on delivery" or "Block" mark, so the next order from that number shows a warning or must be paid by KHQR first. About 4–6 hrs. Parts 1 and 2 (phone read back at checkout, phone confirmed in Telegram) were built instead (§3, Phase 9). | Possibly repeated. **Validate First**: build when a seller gets a fake order | Not yet |
| 2026-10-15 | Founder (letting sellers choose their link; no seller yet) | **Custom domain as a paid extra.** A seller's own domain for the shop (`shop.sokhabeauty.com` or `sokhabeauty.com`) instead of `order.oaksolve.com/shop/<link>`. Paying to choose the `/shop/<link>` part was considered and not taken: it's in the Standard plan, and a random link during the trial would be what sellers post everywhere. Choosing the link stays free, and old links keep opening the shop (§3, Phase 9). Needs the frontend on Cloudflare Pages first; then Cloudflare for SaaS custom hostnames (first 100 free, then cents each a month), certificates, a setup page for the seller's DNS, and help when it's set wrong. A few evenings. | Possibly repeated. **Build Later**: when a seller asks for it, as a paid extra or with a later plan (`01_PRODUCT.md` §33.4) | Not yet |
| 2026-10-20 | Founder (from Glisten Blossom Shop's own bot; no seller yet) | **Each shop its own Telegram bot.** The shop's own bot name and photo in the customer's chat list ("Srey Mom Fashion" instead of Oak's bot), its own Go Shopping and OPEN. Each seller would make a bot in BotFather and paste its token into Oak Order; Oak would run one webhook per bot and keep each token secret. Today Oak's one bot does the same with "🛍 <shop>" per customer and "Your shops" (built 2026-10-20). About 8-12 hrs. | Possibly a paid extra. **Validate First**: build when sellers ask for their own name in Telegram | Not yet |
| 2026-10-20 | Founder (how to reach a customer who typed a wrong phone; no seller yet) | **Customers confirm their phone in Telegram before ordering.** A seller's switch, off by default: checkout asks for "Get updates on Telegram" (the bot's Share my phone number) before Place order, so every order has a number that works and a chat the seller can message. Today it's offered after ordering and optional. A required step means leaving the shop for Telegram and back (in TikTok's or Facebook's own browser some buyers won't come back), so the seller would trade some orders for always-reachable customers. About 6 hrs; no new column. Picks 1-3 of the same list were built instead (§3, Phase 9). | Possibly repeated. **Validate First**: build when a seller asks, e.g. after fake or unreachable orders | Not yet |
| 2026-10-19 | Founder (settings check #1; no seller yet) | **Convert prices when a shop switches currency.** Today a switch keeps every number ($12.00 becomes 12៛), and Save asks first. Converting needs a rate: a fixed 4,000 or 4,100 goes stale as the rate moves, and sellers shouldn't have to know or type one. So: a dollar–riel rate that Oak Order sets and keeps up to date (a box on the admin page), used at the switch for product and option prices, the delivery fee, free delivery from, and discounts; riel rounded to the nearest 100, dollars to the cent. Orders already placed keep their currency. About an evening with tests. | Possibly repeated. **Built 2026-10-24** (founder: "i set it 4100 first"): converted at `KHR_PER_USD`, 4,100, set by hand on Render until the admin page holds it; **2026-10-28:** the admin panel's Settings will hold it (01 §22.11) | Not yet |
| 2026-10-27 | Founder (TikTok turned down Oak Order's developer app; no seller yet) | **Remove "Continue with TikTok".** It was built 2026-10-09 and only ever worked for test accounts (TikTok's sandbox); TikTok rejected the app at review. Log in with Telegram (2026-10-24) covers it for owners, and every shop already has a phone checked in Telegram, so no shop depended on TikTok. "TikTok" as a place a seller posts a link stays. | Platform (sign-in). **Decided 2026-10-27: removed** (buttons, Settings, callback page, API routes, settings and their variables); stored TikTok ids kept unused until the founder decides on deleting them (04) | No |
| 2026-10-28 | Founder (admin plan, part 30; no seller yet) | **A Telegram message to every shop.** From the admin panel: write once, send it to the founder first, then to every open shop with Telegram, or only those on trial or paying. For downtime and price-change notices. Not in the docs before. | Platform (Oak's own tools). **Decided 2026-10-28: build** with the admin panel (01 §22.11) | No |
| 2026-10-28 | Founder (admin plan, part 31; no seller yet) | **Sign-ups that didn't finish.** Numbers checked in Telegram that never made a shop, listed for 30 days so the founder can call and help them finish. Needs those checks kept 30 days (deleted when they expire today) and a Privacy line. | Platform (Oak's own tools). **Decided 2026-10-28: build** (founder picked Build over the recommended Later) | No |

Notes on the 2026-10-02 one-tap pay request:

- No free, bank-neutral way exists: each bank's app-to-app payment is its own merchant service (ABA PayWay, ACLEDA Toanchet Pay, Wing's merchant service), or an aggregator covers several banks with one account (e.g. A-Pay, iPay88). Either way each seller signs up, usually pays a fee per payment, and is usually asked for business registration. Bakong's own deep link opens only the Bakong app and relied on Firebase Dynamic Links (shut down August 2025).
- Cost if built: about 2–3 days per bank, or about the same once for an aggregator, plus keeping each seller's keys safe and an endpoint for payment notifications. It would also make payment confirmation automatic for those payments.
- Ask the first sellers: which banks their customers use; whether they are a registered business; whether they'd pay a fee per payment for automatic "Paid". If most aren't registered, keep KHQR (all banks, free, confirmed by hand).

---

# 7. Testing Strategy (MVP-Appropriate)

No heavy test infrastructure — matches the "low operating cost / narrow scope" constraint.

- **Backend:** `pytest` for state-machine transition logic (§7 in `02_TECHNICAL.md`) and order/payment total calculations — these are the places a silent bug directly costs money or breaks trust with a seller. Skip exhaustive endpoint testing at MVP stage; cover the arithmetic and state-transition rules, not every CRUD path.
- **Frontend:** no automated test suite required for MVP. Manual click-through testing of the checkout flow before each deploy is sufficient at this scale.
- **Manual regression checklist:** `docs/REGRESSION_CHECKLIST.md` (create product → share link → place order → accept → pay → deliver → complete, plus other paths); run it manually before onboarding a new seller or after a risky change.

Expand automated coverage only once a second developer joins or the manual checklist becomes a bottleneck — not preemptively.

---

# 8. Deployment Strategy

- **Branching:** trunk-based, `main` branch auto-deploys to production (solo dev, no need for long-lived feature branches or a heavyweight git-flow).
- **Environments:** `production` only for the MVP. A `staging` environment is a "build later" per `01_PRODUCT.md` §44's decision framework — add it once a second seller's data must not be put at risk by testing.
- **Migrations:** Alembic migrations run at container start while the backend is on Render's free plan (no pre-deploy command); move them to a pre-deploy command once on a paid instance.
- **Rollback:** rely on the hosting platform's one-click redeploy of the previous build; no custom rollback tooling needed at this scale.
- **Backups:** nightly database copy to a private R2 bucket by GitHub Actions; setup and restore in `docs/BACKUPS.md`.

---

# 9. Risk Tracking (Development-Specific)

| Risk | Mitigation |
|---|---|
| KHQR/Bakong integration takes longer than the 4-hr spike suggests | **Resolved 2026-10-02:** generation needed no Bakong onboarding (Phase 4 spike result). Original mitigation: timebox strictly; if the spike reveals heavy merchant-onboarding requirements, ship Phase 4 with COD + bank transfer only and defer KHQR to a fast-follow — matches `01_PRODUCT.md` §25's "do not implement multiple payment providers simply to make the product appear complete" |
| Full-time job leaves inconsistent weekly hours | Plan in 2-week sprints (§5), not daily quotas; a light week is absorbed by the next sprint rather than breaking the schedule |
| Scope creep from imagined seller needs | Anything not in Phases 0–9 goes into the Requirements Log (§6), not into a sprint, until a real seller asks for it |
| Building Phase 6+ before validating Phases 1–3 actually work with a real user | After Phase 3, do a real manual end-to-end run (flagged in Phase 3's definition of done) before continuing — catches a broken core loop early instead of after 5 more phases |

---

# 10. Exit Criteria for "MVP Built"

Matches `01_PRODUCT.md` §42 and §37 (MVP Success):

- [ ] A real seller can create a store and products without developer help
- [ ] A real seller can share a working product/store/category link
- [ ] A real customer can complete an order via that link, including payment method selection
- [ ] The seller receives a Telegram notification and can manage the order through to completion
- [ ] Payment workflow works for COD, bank transfer, and KHQR (manual confirmation)
- [ ] Delivery workflow works for both seller-managed delivery and pickup
- [ ] The full loop has been run at least once with a **real seller and real customer**, not just internal testing

Once these hold, move from "building the MVP" to `01_PRODUCT.md` §35's validation phase — talking to the seller, tracking what breaks, and feeding results back into the Requirements Log rather than immediately starting new development.

---

This document should be revisited at the end of each phase, not treated as fixed after Phase 0.