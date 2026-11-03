# Oak Order: Video Plan (videos 003–022)

Last updated: 2026-11-04

20 videos around the launch: 3 before it, 1 on launch day, 16 after.
Claude Code makes one a day with the `oak-video-edit` skill. This file says
**what** each video is. `02_video_playbook.md` says **how** (voice, look,
tools). `04_content_log.md` records **what was made** and how it did.
Numbers follow the content log (001 and 002 are already there).

## Each day

Say: **"Make the next video from the video plan"** (or "make video 007").

Claude Code takes the first video below that has no row in the content log,
writes the Khmer script from its brief, and shows it to me. Then it makes the
video the usual way (voice, film, preview, render once I approve) and adds the
row to the content log as Draft.

- One video a day fits Gemini's free voice limit: 10 clips a day, so 4 blocks
  plus 6 retakes.
- A brief is a starting point. The script can change the words, never the
  facts: every claim comes from a MARKETING_FACTS row marked Live, and nothing
  in its section 6 "Don't claim".
- Hooks are given in English here. The Khmer is written on the day, and a
  Khmer speaker reads it before posting (playbook).
- If a brief needs a screen marked MISSING that still doesn't exist, Claude
  Code says so before writing the script.

## Before day 1

1. **Launch day (L).** Pick the date. Videos 003–005 say it.
2. **Fresh app pictures.** Run `backend/marketing/shots.py --video`: the
   pictures on disk still show the shoe shop Oak Fashion. Then change
   `linkCard`'s title in `.claude/skills/oak-video-edit/hyperframes/kit.mjs`
   to "Oak Phone · Oak Order" and redo MARKETING_FACTS section 10
   (04_STATUS.md, Next Up, step 2).
3. **Facts check.** MARKETING_FACTS was last checked against the code on
   2026-10-27. Claude Code checks it again before video 003.
4. **Missing screens** (needed from video 010). `shots.py` doesn't make these
   yet: the checkout map pin; the Send to driver message; the start page and
   sign-up with Telegram; the "Get your shop ready" checklist; Payments →
   Upload your bank's QR; Add product; the Open shop dialog; the Links tab and
   a link's Views and Orders; a sale price crossed out; the cart's "Add $3.00
   more for free delivery"; Settings → Discounts, Staff, Export orders, Orders
   and alerts (Take orders), Plan. Two ways to get them:
   - Claude Code adds them to `shots.py` (one session; Khmer and English,
     re-made by the same command whenever the app changes). Recommended.
   - Or I take them on my iPhone from the demo shop, in Khmer.
5. **My phone screenshots** (one sitting, real Telegram):
   - the new-order alert from @OakOrder_bot with its Open order button
     (006, 007);
   - the "says paid" alert with ✅ បានទទួល កត់ថាបានបង់ (008);
   - the low-stock alert (011);
   - the Send to driver message in a Telegram chat (010);
   - the bot's "sent / with the driver" message on a customer's Telegram (013).

## Posting schedule

- **Make**: one a day, in order. Day 1 = video 003 … day 20 = video 022.
- **Post**: 003 on L−6, 004 on L−4, 005 on L−2, 006 on L. After launch, 3 a
  week (Mon / Wed / Fri, the playbook's cadence), so 007–022 take about 5½
  weeks. More often only once videos bring sign-ups (playbook, "Cadence").
- Making runs ahead of posting: that's the buffer. In each weekly REVIEW
  (playbook), any video not made yet can be swapped or rewritten from what
  the posted ones did.
- Video 002 (rendered 2026-11-02, not posted) is the spare: post it in any
  week a video slips.

## Offer and call to action

- **Before launch (003–005)**: "Follow so you don't miss it." And: "Want to
  be one of our first sellers? Message us on Telegram." For our first sellers
  we add their products and show them how, free (MARKETING_FACTS section 5:
  say "our first sellers", never a number). Drop this line once I say the
  first-seller places are taken.
- **From launch (006–022)**: "Free for your first 30 days of selling, from the
  day you open your shop. No card." Then $9.99 a month or $99 a year. Sign up
  at order.oaksolve.com, or message t.me/longreaksa.
- End card as in the house look: acorn, wordmark, the offer line, the Telegram
  button, t.me/longreaksa.

## Video types

| Type | Shape | Film template |
|---|---|---|
| Teaser | The pain or a glimpse, no full app tour, the launch date at the end | new: `teaser.mjs` (first made with 003) |
| Launch | The whole loop fast (link → order → pay → deliver), then the offer | new: `launch.mjs` (first made with 006; 022 reuses it) |
| Pain → Fix | Hook, pain, Oak Order fixing it on the app's screens, offer | `pain-fix-flow.mjs` (video 002) |
| How-to | One job in a few taps, cursor-led, no pain act | new: `how-to.mjs` (first made with 009) |
| FAQ | Three questions, three quick answers | built from `how-to.mjs` (021) |

The first video of a new type takes a longer session (a new template).

## The 20 videos

| # | Make | Post | Type | Feature | Hook (English) |
|---|---|---|---|---|---|
| 003 | day 1 | L−6 | Teaser | (the problem) | One order. Five apps. |
| 004 | day 2 | L−4 | Teaser | First look | We built something for online sellers in Cambodia. First look. |
| 005 | day 3 | L−2 | Teaser | Name and date | In [N] days, your shop gets one link. |
| 006 | day 4 | L | Launch | The whole loop | Oak Order opens today. |
| 007 | day 5 | week 1 | Pain → Fix | Telegram alert for each order | Out all day? Your orders still find you. |
| 008 | day 6 | week 1 | Pain → Fix | KHQR for the exact amount | Customer sent $11 instead of $12.50? |
| 009 | day 7 | week 1 | How-to | What the customer sees | Watch your customer order, start to finish. |
| 010 | day 8 | week 2 | Pain → Fix | Map pin, Send to driver | "Near the pagoda, the house with the blue gate…" |
| 011 | day 9 | week 2 | Pain → Fix | Stock per option, low-stock alert | Sold the last one… twice? |
| 012 | day 10 | week 2 | How-to | Chat order | Customer still orders in chat? Fine. |
| 013 | day 11 | week 3 | Pain → Fix | Order tracking, customer updates | "Where's my order?" for the tenth time today? |
| 014 | day 12 | week 3 | How-to | Sign up and open the shop | Your shop link, ready today. |
| 015 | day 13 | week 3 | Pain → Fix | A link per post | Which of your posts actually brings orders? |
| 016 | day 14 | week 4 | Pain → Fix | Sales, free delivery | Run a sale without editing every post. |
| 017 | day 15 | week 4 | Pain → Fix | Customers tab | Who are your best customers? |
| 018 | day 16 | week 4 | How-to | Staff | Your helper takes orders. Your password stays yours. |
| 019 | day 17 | week 5 | Pain → Fix | Export to Excel, receipt | End of the month: counting orders in a notebook? |
| 020 | day 18 | week 5 | Pain → Fix | Pause orders for a holiday | Going home for the holiday? Your shop can rest too. |
| 021 | day 19 | week 5 | FAQ | No app, no cut, the price | Do my customers need to download an app? |
| 022 | day 20 | week 6 | Launch | Recap and offer | One link. Order, pay, deliver. |

020 belongs a week before a holiday: move it up or down the list so it posts
then.

## Briefs

Screens are paths under `backend/marketing/out/` (Khmer: `km/`, `video/km_…`).
"Phone:" = my own screenshot (see "Before day 1").

### Before launch

**003 · Teaser · One order, five apps**
- Angle: one order today means hopping between apps: the comment, the chat,
  a note to write it down, the bank app, the driver's chat.
- Story: the hook on frame 0 over a busy phone → the five hops, each window
  popping up and stacking faster → "There's an easier way." → the acorn,
  "[date]".
- Screens: none from the app (save the reveal). Brand acorn only.
- Watch out: draw generic chat, note and bank windows. No real app or bank
  logos as the main picture (playbook: bank logos incidental).

**004 · Teaser · First look**
- Angle: a glimpse, not a tour. Three screens, each sharpening from a blur
  for a second: the shop page, a KHQR with the exact amount, the orders list.
- Story: hook → glimpse 1 "Customers order by themselves" → glimpse 2 "They
  pay the exact amount" → glimpse 3 "Every order in one list" → "[date]".
- Screens: km/01_shop.png, km/11_khqr.png, km/07_dashboard.png.
- Watch out: no name yet (that's 005). Different from 002's "How much?"
  angle: no comment flood.

**005 · Teaser · Name and date**
- Angle: the reveal. One link for your Facebook, TikTok and Instagram shop.
- Story: hook with the day count → a shop link pasted into a Telegram chat
  turns into its picture card → the Oak Order wordmark → "Opens [date]. Free
  for your first 30 days, no card." → first sellers: message on Telegram.
- Screens: `linkCard()`, brand/oak-order-name.png, km/01_shop.png.

### Launch day

**006 · Launch · Oak Order opens today**
- Angle: everything in one breath, then the offer.
- Story: hook → share the link (km/16_share_link.png) → the customer orders
  (cut from video/km_customer.mp4) → the Telegram new-order alert → KHQR
  (km/11_khqr.png) → Send to driver (km/14_accepted.png) → complete
  (km/15_completed.png) → offer and sign-up.
- Phone: the new-order alert.
- Watch out: up to about 30 s is fine for this one.

### After launch

**007 · Pain → Fix · Every order on your Telegram**
- Pain: you're out all day, orders sit in a chat you scroll through later.
- Fix: Oak Order's bot sends a Telegram message for every new order, with an
  Open order button → the order → Accept.
- Screens: video/km_order_arrives.mp4, km/07_dashboard.png, km/08_order.png.
  Phone: the new-order alert.
- Watch out: not "push notifications" or "the app notifies you": it's a
  Telegram message from Oak Order's bot.

**008 · Pain → Fix · The exact amount, every time**
- Pain: wrong amounts, adding up the delivery fee by hand, "did they pay?"
- Fix: the KHQR has the exact amount → the customer taps "I've paid: send
  receipt" → the order reads "Says paid at 14:02: check your bank app" → one
  tap marks it paid, in the app or under the Telegram alert. Straight into
  your own bank account; Oak Order takes no cut.
- Screens: km/10_khqr_checkout.png, km/11_khqr.png, km/12_khqr_paid.png,
  video/km_10_khqr.mp4. Phone: the "says paid" alert.
- Watch out: never "confirmed automatically" or "know the moment they pay".
  The seller checks the bank app.

**009 · How-to · What your customer sees**
- Angle: the answer to "will my customers manage it?" No app, no account, no
  password.
- Story: tap the link → pick a size → Continue with Telegram fills in the
  name and phone → delivery, cash → Place order → "Thank you".
- Screens: video/km_customer.mp4 (cut to fit), km/05_checkout.png,
  km/06_confirmation.png.
- Watch out: not every customer's phone is "verified": only those who use
  Telegram.

**010 · Pain → Fix · The address and the driver**
- Pain: "near the pagoda, the blue gate…", retyping it for the driver, the
  driver calling because he's lost.
- Fix: the customer pins the house on the map; the seller opens it in Google
  Maps; Send to driver makes one message with the phone, address, map link,
  items and "COLLECT $13.50 CASH".
- Screens: km/14_accepted.png. MISSING: the checkout map pin, the Send to
  driver message. Phone: the message in a Telegram chat.
- Watch out: the seller shares the message (not sent by itself). No courier
  booking or courier tracking.

**011 · Pain → Fix · Sold the last one twice**
- Pain: two customers paid for the last 256 GB; now you apologise and send
  money back.
- Fix: stock per option goes down with each order; the shop shows "Only 3
  left" and "Sold out"; a Telegram alert when it runs low and when it sells
  out.
- Screens: km/02_products.png, km/19_low_stock_alert.png,
  km/20_low_stock_product.png, video/km_19_low_stock.mp4. Phone: the
  low-stock alert.
- Watch out: stock isn't held while it's in the cart, only once the order is
  placed.

**012 · How-to · An order from chat**
- Angle: customers who still order in chat are fine.
- Story: New order → type the phone → the name fills in → pick the product →
  Save order → Copy link for the customer, who follows and pays there.
- Screens: km/17_chat_order_form.png, km/18_chat_order.png,
  video/km_17_chat_order.mp4.

**013 · Pain → Fix · "Where's my order?"**
- Pain: the same question all day.
- Fix: the customer's order page moves by itself (Ordered → Confirmed → On
  the way → Delivered); customers on Telegram get a message when it's
  confirmed, sent and delivered.
- Screens: km/13_tracking.png, video/km_13_tracking.mp4. Phone: the bot's
  "sent" message on a customer's Telegram.
- Watch out: Telegram updates only for customers who connected it. No live
  courier tracking.

**014 · How-to · Open your shop today**
- Story: sign up with your phone through Telegram (or Google) → "Get your
  shop ready" → upload your bank's Receive QR → add a product → Open shop:
  the 30 free days start. Stuck? We help you set up.
- Screens: MISSING: the start page and sign-up, the checklist, Payments →
  Upload your bank's QR, Add product, the Open shop dialog.
- Watch out: personal Receive QRs only (no business QR). No Facebook login.
  No number of minutes unless it was timed.

**015 · Pain → Fix · Which post brings orders**
- Pain: you post every day and don't know which post sells.
- Fix: Links → New link for each post → each link counts its views and
  orders ("12% ordered").
- Screens: MISSING: the Links tab, a link's Views and Orders.
- Watch out: it counts that link's views and orders, not the post's reach.

**016 · Pain → Fix · Sales and free delivery**
- Pain: a promotion means editing every caption and price by hand.
- Fix: Sales on products: % off until a day, and the shop crosses out the old
  price; free delivery from an amount, and the cart says "Add $3.00 more for
  free delivery".
- Screens: km/01_shop.png (its "$20 off orders from $1,000" line). MISSING: a
  sale price crossed out, the cart's free-delivery line, Settings →
  Discounts.
- Watch out: no discount codes or vouchers.

**017 · Pain → Fix · Your best customers**
- Pain: customers' numbers scattered across chats; no idea who buys most.
- Fix: the Customers tab: search by name or phone, each one's orders and
  total, Call, Message on Telegram ("Driver is near").
- Screens: km/22_customers.png, video/km_22_customers.mp4.
- Watch out: Message on Telegram only for customers who connected it.

**018 · How-to · Add a helper**
- Story: Settings → Staff → Add staff: up to 10 helpers, each with their own
  phone and password; they do everything except Settings.
- Screens: MISSING: the Staff page, Add staff.

**019 · Pain → Fix · End of the month**
- Pain: counting the month's orders in a notebook or a chat.
- Fix: Export orders to Excel: this month, last month or chosen days, in
  Khmer or English. Plus a receipt for each order to share or print.
- Screens: km/21_parcel_slip.png, video/km_21_parcel_slip.mp4. MISSING:
  Settings → Export orders.
- Watch out: not "reports", "dashboard" or "profit". Don't show a Bluetooth
  printer printing.

**020 · Pain → Fix · Holiday pause**
- Pain: going home for the holiday while the comments keep asking.
- Fix: turn off Take orders and pick the day they open again; they open by
  themselves that morning. Customers can still look and message.
- Screens: MISSING: Settings → Orders and alerts (Take orders, Take orders
  again on).
- Post it a week before a holiday.

**021 · FAQ · Three questions**
- Q1: Do my customers need an app? No: a link, nothing to install, no
  account. Q2: Do you take a cut of my sales? No: KHQR goes straight into your
  own bank account. Q3: What does it cost? 30 days free from opening, then
  $9.99 a month or $99 a year; no card, no automatic charges.
- Screens: km/01_shop.png, km/11_khqr.png. MISSING: Settings → Plan.

**022 · Launch · One link. Order, pay, deliver.**
- Angle: the run's closer: the whole loop in about 15 s, then the offer
  with a stronger end card.
- Screens: as 006, in a new order and with new words (`launch.mjs`).
- Watch out: no seller numbers, results or quotes unless a real seller has
  them by then and agrees.
