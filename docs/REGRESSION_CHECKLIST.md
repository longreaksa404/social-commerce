# Manual Regression Checklist

Run on the **live site** before onboarding a new seller, and after a risky
change (03 §7). Part A takes about 15 minutes; run the Part B lines for
the areas a change touched.

You need two screens: the **seller** (logged in to the dashboard) and the
**customer** (another phone, or a private window). Use a test shop, or your
own shop and reject the test orders afterwards.

If a step fails, note what you saw and where (seller or customer screen,
phone or laptop) before going on.

---

## Part A: the full loop (01 §42)

**Seller: product and link**

- [ ] Products → New product with two options (e.g. S and M), a price, stock 3, and a photo. Save. The photo shows in the list.
- [ ] On the product, tap Share → TikTok → name "Regression test". The link's page opens with Copy / Share / Open.
- [ ] Paste the link in a Telegram or Messenger chat. The preview shows the product's name and photo (if Render was asleep, wait a minute and paste again).

**Customer: order**

- [ ] Open the link on the customer screen. The product page shows the photo, both options, the price.
- [ ] Choose M, Buy now: the cart opens with the items at the top and the order form below (one page).
- [ ] On the shop, + on a product without options adds one (the number shows on the photo); the bar at the bottom shows the count and total and opens the cart. A product with options has no +.
- [ ] Order a second time on the same phone: name and phone show as one line with Change. Place order shows the total.
- [ ] Name, phone, delivery by the shop, "Pin my location on the map" → move the map → Confirm. Choose KHQR. The breakdown shows items, delivery, total.
- [ ] Place order. The order page shows the KHQR code with the exact total; "Save QR code" works.
- [ ] Tap "I've paid: send receipt": the shop's Telegram opens with "I've paid order #…" typed in, and the order page says "You told <shop> you paid".

**Seller: alerts and the order**

- [ ] A Telegram alert (in Khmer) arrives with the order number, items, total, customer and the Open order button; then "<name> says they paid #…".
- [ ] The bell shows a red count; the notification opens the order.
- [ ] The order says "Came through your TikTok link". "Open in Google Maps" shows the pinned spot.
- [ ] The Payment card shows "Customer says paid · <time>"; the bell has "<name> says they paid".
- [ ] Accept → the customer's order page (reload) shows it accepted.
- [ ] Payment: Mark paid with a note. The customer's page no longer shows the QR.
- [ ] Delivery card: Send to driver opens the share list (copies on a laptop) with the address, map link and "Paid already".
- [ ] To do card: "Next: deliver it" → Delivered. The customer's page shows it delivered.
- [ ] To do card: Complete. It moves to the Delivered filter.

**Seller: the numbers**

- [ ] Links → "Regression test" shows 1 view and 1 order.
- [ ] Customers → the customer shows 1 order and the total spent; their page lists the order.
- [ ] The product's M option has 2 left.

---

## Part B: other paths (run what a change touched)

**Payments**

- [ ] Cash on delivery: New → Accept → "Delivered, cash received" → Complete is 3 taps, and the payment shows paid.
- [ ] Cash on delivery: Delivered alone, then Complete without marking it paid. Works.
- [ ] A paid payment: "Not paid after all" (asks first) puts it back to not paid; the customer sees how to pay again.
- [ ] Bank transfer: the customer sees the bank, name and account number with copy buttons.
- [ ] Bank transfer, delivered but not paid: Complete is blocked with a hint.
- [ ] Payment failed (asks first) shows "Payment failed" in the order list.

**Delivery**

- [ ] Pickup: the customer sees the pickup address; the seller taps Customer collected; the order completes.
- [ ] Courier: choose one of the shop's couriers at checkout; the seller sees "Send with <courier>".
- [ ] Delivery failed → Try again → Assign works.
- [ ] The optional steps (Preparing, Ready, Shipped; Picked up, On the way) still work and show on the customer's page.

**Orders and stock**

- [ ] Reject an order (asks first): its stock comes back.
- [ ] Orders → New order: a phone that ordered before fills in the name and address; add a product with options; Save. The order is accepted, says "Added by you from a chat", has "Copy link for the customer", and took the stock. No new-order alert.
- [ ] Stock 1 → order it → the shop shows "Sold out"; a low-stock alert arrives (Telegram and bell).
- [ ] Change a product's price while a customer is on checkout: placing the order says the total changed.

**Prices**

- [ ] With a discount rule and free delivery from an amount: the cart shows "Add $X more to get $Y off" and "Add $Z more for free delivery", each with a bar that fills as items are added; reaching them shows the discount and "Your delivery is free.", and free delivery in the checkout total.

**Look and effects**

- [ ] Add to cart: the photo flies into the cart button and its count goes up. Placing an order shows a tick and confetti; reloading the order page doesn't play it again. Completing an order in the dashboard plays confetti.
- [ ] On a phone, cards and lists run to the screen edges (no gap at the sides) and rows line up with the page titles; on a laptop they are rounded cards, and the Save / Place order / order action bars stay at the bottom while scrolling.
- [ ] With the phone set to reduce motion (iPhone: Settings → Accessibility → Motion; Android: Remove animations), nothing moves and everything still works.

**Accounts and devices**

- [ ] Log out, log in. Open the dashboard on a second device: notifications read on one are read on the other.
- [ ] Open the customer's order link on another device: it asks for the phone; the wrong phone is refused.
- [ ] After ordering, go back to the shop: the order (photo, status) drops in under the header for a few seconds, then shrinks into the box button in the header, which rocks now and then; the box opens the order. Opening a product doesn't drop it in again. With the cart empty, the cart page's Your orders lists it.
- [ ] Leave the order page open and accept the order from the dashboard: within 30 s the page shows the new step without reloading.

**New shop**

- [ ] Register a new shop with a phone number: "Verify with Telegram" opens the bot, "Share my phone number" there, and the page shows the number as verified within a few seconds; a number that already has a shop says so with a Log in link. After creating the store, Telegram alerts are already on (Settings → Alerts), and you can log in with the number written as `+855 …`.
- [ ] Continue with Google (once the client ID is set) on a phone: a new Google account goes to "Set up your shop", verifies a phone in Telegram and lands in the new shop; next time the same button logs straight in. Settings → Your account shows the Google email and "Add a password"; after adding one, the phone number and password log in too. A phone seller connects Google there and then logs in with it.
- [ ] Continue with Facebook and Continue with TikTok (once their apps are set up and approved), on a phone: a new account goes to "Set up your shop" and on to the new shop; next time it logs straight in. Cancelling on Facebook's or TikTok's page comes back to "Couldn't log you in". Settings → Your account → Other ways to log in connects each one and shows its email or name.
- [ ] Register a new shop: the Orders tab says "Add your first product" and that delivery is free until a fee is set; Settings has "Set up your shop" and the Settings tab a dot, gone once a product, the delivery fee and the ways to pay are saved.

**Settings**

- [ ] Settings → your shop → Add logo. It shows in the shop header and the dashboard header; Remove logo takes it away.
- [ ] Settings → Delivery: change the fee, Save. The Settings row and the shop's delivery line show the new fee. Leaving with unsaved changes asks first.
- [ ] The shop page and a product page show delivery, pickup, ways to pay and discounts as set.
- [ ] Telegram: Disconnect, then Connect again; a test order alerts the new chat.
- [ ] "Ask seller on Telegram" on a product opens the seller's chat with the product typed in.
