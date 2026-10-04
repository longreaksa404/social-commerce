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
- [ ] Choose M, Add to cart, open the cart, Checkout.
- [ ] Name, phone, delivery by the shop, "Pin my location on the map" → move the map → Confirm. Choose KHQR. The breakdown shows items, delivery, total.
- [ ] Place order. The order page shows the KHQR code with the exact total; "Save QR code" works.

**Seller: alerts and the order**

- [ ] A Telegram alert arrives with the order number, items, total, customer and "Open order".
- [ ] The bell shows a red count; the notification opens the order.
- [ ] The order says "Came through your TikTok link". "Open in Google Maps" shows the pinned spot.
- [ ] Accept → the customer's order page (reload) shows it accepted.
- [ ] Payment: Mark paid with a note. The customer's page no longer shows the QR.
- [ ] Delivery: Assign → Picked up → On the way → Delivered. The customer's page follows each step.
- [ ] Order: move it on to Completed. It moves to the Delivered filter.

**Seller: the numbers**

- [ ] Links → "Regression test" shows 1 view and 1 order.
- [ ] Customers → the customer shows 1 order and the total spent; their page lists the order.
- [ ] The product's M option has 2 left.

---

## Part B: other paths (run what a change touched)

**Payments**

- [ ] Cash on delivery: deliver the order, then Complete without marking it paid. Works.
- [ ] Bank transfer: the customer sees the bank, name and account number with copy buttons.
- [ ] Bank transfer, delivered but not paid: Complete is blocked with a hint.
- [ ] Payment failed (asks first) shows "Payment failed" in the order list.

**Delivery**

- [ ] Pickup: the customer sees the pickup address; the seller taps Customer collected; the order completes.
- [ ] Courier: choose one of the shop's couriers at checkout; the seller sees "Send with <courier>".
- [ ] Delivery failed → Try again → Assign works.

**Orders and stock**

- [ ] Reject an order (asks first): its stock comes back.
- [ ] Stock 1 → order it → the shop shows "Sold out"; a low-stock alert arrives (Telegram and bell).
- [ ] Change a product's price while a customer is on checkout: placing the order says the total changed.

**Prices**

- [ ] With a discount rule and free delivery from an amount: the cart shows "Add $X more to get $Y off"; reaching it shows the discount and free delivery in the total.

**Accounts and devices**

- [ ] Log out, log in. Open the dashboard on a second device: notifications read on one are read on the other.
- [ ] Open the customer's order link on another device: it asks for the phone; the wrong phone is refused.

**Settings**

- [ ] Telegram: Disconnect, then Connect again; a test order alerts the new chat.
- [ ] "Ask seller on Telegram" on a product opens the seller's chat with the product typed in.
