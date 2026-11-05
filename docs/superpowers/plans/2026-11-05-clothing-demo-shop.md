# Clothing Demo Shop Plan

Date: 2026-11-05

Status: plan requested by the founder. Name, catalogue, assets and settings
below are proposals for review. No shop created; no live data changed.

## Goal and scope

Prepare a second, separate demo shop for marketing Oak Order to clothing
sellers. Show customers choosing a size and colour, ordering several
items, paying, and receiving delivery updates. Show sellers managing stock
and orders with the app that exists today.

Keep Oak Phone and its current launch footage. Introduce clothing in later
feature videos without delaying the current launch videos. This plan needs
no new paid service, infrastructure, schema, endpoint or screen design.

## Proposed shop

- Working English name: **Oak Wear**. Confirm before creating the live
  shop; the name is not settled.
- Everyday casual clothing, with consistent studio or flat-lay photos.
- Khmer-first product names and short descriptions. Prepare English and
  Khmer copy for founder review. Seller-entered catalogue text is not
  translated by the UI language switch: use short bilingual names or put
  the second language in descriptions where needed.
- Draft Khmer description: `ហាងសាកល្បងលក់សម្លៀកបំពាក់ប្រចាំថ្ងៃ។`
  English meaning: "Demo shop for everyday clothing."
- Navy shop colour, simple name logo, cover showing catalogue garments.
- USD prices, delivery $2, pickup free, cash on delivery and KHQR.
- One offer: free delivery from $30. Leave product sales and overlapping
  bill discounts out of the first recording batch for clearer totals.

Identify this as a demo on its public profile. Illustrative products and
fictional orders must not be presented as a customer testimonial or proof
of real sales.

## Catalogue: 12 products, 3 categories

Prices are proposed demo amounts, not researched retail prices.

| Category | Product | Price | Options |
|---|---|---:|---|
| Tops | Basic T-shirt (main video product) | $8.50 | Black / M, Black / L, White / M, White / L |
| Tops | Oversized T-shirt | $10.00 | Cream / M, Cream / L, Black / M, Black / L |
| Tops | Ribbed top | $9.00 | White / S, White / M, Black / S, Black / M |
| Tops | Polo shirt | $12.00 | Navy / M, Navy / L, White / M, White / L |
| Tops | Linen shirt | $15.00 | Beige / M, Beige / L, White / M, White / L |
| Tops | Light cardigan | $16.00 | Cream / M, Cream / L |
| Bottoms | Casual trousers (second video product) | $14.00 | Black / M, Black / L, Beige / M, Beige / L |
| Bottoms | Straight jeans | $18.00 | Blue / 28, Blue / 30, Blue / 32 |
| Bottoms | Casual shorts | $11.00 | Beige / M, Beige / L, Black / M, Black / L |
| Dresses | Everyday dress | $17.00 | Black / S, Black / M, Black / L |
| Dresses | Midi dress | $20.00 | Beige / S, Beige / M, Beige / L |
| Dresses | Shirt dress | $19.00 | Navy / S, Navy / M, Navy / L |

Use existing combined variant names such as `Black / M`, with Khmer copy
prepared too. The app stores one named-variant list, not independent size
and colour selectors. Do not add selectors or imply automatic photo
switching when a colour is picked.

Stock setup:

- Most options: 8–15 in stock.
- Reserve an everyday-dress option at 7 for the low-stock scene. Buying 2
  takes it to the capture tool's default warning level of 5.
- One jeans size at 0, with the other sizes available.
- Keep both main products' middle options in stock: the capture tool picks
  the first two products with variants and buys each one's middle option.
- Add the main products last in the order needed for filming, then verify
  the actual storefront order and capture selection before recording.

## Photos and identity

Prepare one main photo per product plus a second photo for each main video
product: 14 product photos, one logo and one cover.

- Prefer original AI-generated studio or flat-lay photos of generic,
  unbranded garments. Apply the imagegen skill when generating them.
- Keep background, lighting and framing consistent. Use portrait images
  around 4:5 showing the entire garment.
- Photos must match the garment and available colours. Prepare a matching
  photo for each offered colour before publishing; a shared photo can show
  multiple actual colourways. Stay within the app's five-photo limit.
- Review a contact sheet with the founder before uploading; fix inconsistent
  garment details. Use catalogue garments in the cover too.
- If external photos are used, verify reuse terms and record source,
  author and required credit for each image before uploading.
- Keep source images and previews outside the repo; capture output stays
  in the already ignored marketing output directory.

## Order and video examples

Use fictional orders in the local marketing copy. The existing seeder's
six earlier orders are enough initially. Do not populate the live admin's
totals with another batch of fake sales just to make screenshots.

| Story | What the viewer sees |
|---|---|
| Choose an option | Basic T-shirt, Black / M, add to cart |
| Several items | T-shirt $8.50 + trousers $14 + delivery $2 = $24.50 |
| Free delivery | Another T-shirt takes items to $31, delivery $0, total $31 |
| Stock by option | One jeans size sold out; another can be ordered |
| Low stock | A chat order takes the reserved dress option from 7 to 5 |
| KHQR | A $24.50 order opens a QR for $24.50; seller records payment manually |
| Fulfilment | Accept, record payment and delivery independently, complete under the existing rule |

These are planned scenes. The existing capture sequence does not
necessarily record a multi-item cart: film the two-item and free-delivery
scenes separately if needed.

Live Telegram footage needs a deliberate founder-controlled test: local
captures do not send live messages. Connect the clothing shop only when
needed, use the founder's own recipient and do not message other people
as part of seeding.

## Execution checklist

### 1. Review content

- [ ] Founder reviews name, catalogue, Khmer copy, photos and settings.
- [ ] Save a small catalogue manifest with products, variants, amounts,
  stock, asset filenames and credits; never include credentials.
- [ ] Reuse the current storefront. If a new screen is proposed later,
  follow AGENTS.md's design options page process first.

### 2. Create and configure the separate shop when authorized

- [ ] Use admin Tools → Make a test shop. This existing tool creates an
  email login without a second phone number. It opens the shop immediately
  and starts its trial. Save the temporary password privately.
- [ ] Record the actual store ID and slug. The admin tool does not use
  normal sign-up's six-character slug generation.
- [ ] Before every live write session, read the authenticated store and
  match its ID and slug to this clothing shop. Stop on any mismatch.
- [ ] Pause ordering during setup. Populate using existing seller APIs and
  Save actions; do not reuse Oak Phone's login or alter its products,
  orders, settings, launch assets or shared links.
- [ ] Use only founder-confirmed demo KHQR details. A valid demo QR can
  transfer real money; filming needs no transfer. Ask at that step if
  payment details or an account action are missing.
- [ ] If the trial later needs extending, use the existing plan controls
  with a reason, not fake subscription revenue.

### 3. Capture locally and preserve both asset sets

- [ ] Read the new live storefront into a local marketing copy. Generate
  fictional orders there using the existing demo seeder.
- [ ] The capture resets its shared local marketing DB. Confirm that DB is
  disposable and the reset is authorized before running. Never target
  Neon or any database with work the founder wants to keep.
- [ ] Use the existing `shots.py --out` option with a separate output path:
  `backend/marketing/out/clothing/` (relative to the repo root).
- [ ] Select the clothing slug with a process-scoped `DEMO_SHOP_SLUG`
  override, which already takes priority over `.env`. Restore the previous
  environment afterwards; keep the root `.env` default unchanged.
- [ ] Run one capture at a time: the local database and ports are shared.
  No new selector, per-shop database or service is necessary.
- [ ] Save existing screenshots and clips in Khmer and English UI, plus
  the separate multi-item/free-delivery scenes. Report skipped scenes.
- [ ] Confirm the saved files show clothing and the old Oak Phone footage
  remains available. Do not rewrite completed films automatically.

### 4. Verify and document

- [ ] Check 360, 390 and 414 px, Khmer/English UI, light/dark. Review text
  fit, product photos and options on phones.
- [ ] Verify $24.50 and $31 examples with the app's real pricing logic,
  delivery/pickup and refusal of sold-out options locally.
- [ ] Verify low stock at 5 and order/payment/delivery states independently.
- [ ] Check KHQR amount and account with the founder. Never describe
  "I've paid" as automatic bank verification.
- [ ] No real customer names, phone numbers or addresses in recorded demos.
- [ ] Pause live ordering after setup/filming unless the founder chooses to
  offer this second shop for public test orders.
- [ ] Record the real shop URL and asset locations in marketing docs;
  update MARKETING_FACTS, video plan and STATUS. Update CODEBASE if the
  documented capture workflow changes.

Complete implementation in reviewable chunks: catalogue/assets, live
setup record, then captures/marketing docs. Commit each completed task
with files staged by name. Apply AGENTS.md's CI checks and required tests
if code changes; this planning-only task needs a documentation diff check.
Do not push or deploy.

## First marketing use

Keep Oak Phone in current launch clips. Introduce clothing in video 011
(stock by option), video 016 (offers/free delivery), or the next unmade
matching feature video. Add a clothing shop/cart scene in a later general
introduction so another kind of seller can recognise their workflow.

Next step: review this plan, then prepare the catalogue copy and image
contact sheet before creating the live shop. Content review, existing
admin access and any payment/Telegram confirmation are the founder's
remaining inputs; no new paid account is required.
