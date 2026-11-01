# 01_PRODUCT.md

# Social Commerce SaaS — Project Definition

> **Status:** Draft — Product Definition and Validation Phase
> 
> 
> This document defines what the product is, why it exists, who it serves, what the complete product may become, and what belongs in the MVP.
> 
> Technical implementation details belong in `02_TECHNICAL.md`.
> 
> Development tasks and timelines belong in `03_DEVELOPMENT.md`.
> 

---

# 1. Project Overview

## 1.1 Project Name

Company: **Oak Solutions**, the founder's startup. Its domain is
**oaksolve.com** (bought 2026-10-09).

Brand: **Oak**, the name people say. One brand for all of the founder's
projects; each product is "Oak + a plain word" (later, for example, Oak
Pay) on its own subdomain of oaksolve.com.

This product: **Oak Order**, at `order.oaksolve.com`. A shop link reads
`order.oaksolve.com/shop/<code>`, e.g. `order.oaksolve.com/shop/k7m2qx`
(a code made at sign-up, 2026-10-18). Oak Shop was considered and not
picked: "shop" twice in every link, and the seller's shop should be
the only shop a customer sees. `oaksolve.com` itself forwards to Oak
Order until Oak Solutions has a home page.

The app shows the name in English letters, in Khmer and in English.
Its mark is an oak leaf on navy: the leaf from the Oak Solutions logo
(2026-10-10; before that, a stock tree icon).

---

## 1.2 Product Category

Social-commerce ordering and business-operations platform.

The product is designed for businesses that acquire customers through social-media channels and need a structured way to manage product information, customer orders, inventory, payments, delivery, and customer information.

The platform is not intended to replace social-media platforms.

Social media remains an important customer-acquisition channel.

The platform acts as the operational and transaction layer between social-media discovery and order completion.

---

## 1.3 Product Concept

The basic concept is: ```

```
Social Media
    ↓
Store / Product / Category Link
    ↓
Customer Product Page
    ↓
Optional Seller Communication
    ↓
Checkout
    ↓
Order
    ↓
Payment
    ↓
Delivery
    ↓
Order Completion
```

Seller-side:

```
Seller
    ↓
Manage Store
    ↓
Manage Products
    ↓
Receive Orders
    ↓
Confirm / Process Orders
    ↓
Manage Payment
    ↓
Manage Delivery
    ↓
Complete Order
```

The long-term objective is to turn repeated seller requirements into a reusable SaaS platform.

# 2. Business Objective

## 2.1 Primary Objective

Build a proprietary software business that can generate recurring revenue from social-commerce sellers.

The product should eventually support:

- Seller subscriptions
- Hosting
- Recurring software fees
- Optional implementation/onboarding fees
- Optional premium features
- Additional integrations

## 2.2 Business Strategy

The business should follow this general progression:

```
Problem Validation
        ↓
MVP
        ↓
First Real Seller
        ↓
Customer Feedback
        ↓
Repeated Requirements
        ↓
Reusable Features
        ↓
Several Sellers
        ↓
Standardized Product
        ↓
Recurring SaaS Revenue
        ↓
Expansion
```

The goal is not simply to build software.

The goal is to determine whether the software solves a sufficiently valuable business problem that customers will pay for it repeatedly.

## 2.3 Development Constraint

The project is being developed while the founder continues working full-time.

Therefore the project must prioritize:

- Narrow initial scope
- Low infrastructure complexity
- Low operating cost
- Fast validation
- Reusable implementation
- Low support burden
- Incremental development
- Automation where useful

The project should avoid requiring a full software company from the beginning.

# 3. Target Market

## 3.1 Initial Geographic Market

Initial market:

**Cambodia**

The product should be designed so that it can eventually expand to other Southeast Asian or international markets.

Cambodia is the initial validation market, not necessarily the permanent market boundary.

## 3.2 Initial Customer Type

Primary target:

**Small and medium-sized businesses that sell products through social media.**

Potential examples include:

- Clothing sellers
- Fashion stores
- Beauty/cosmetics sellers
- Accessories sellers
- Electronics/accessory sellers
- Home-product sellers
- Small retail businesses
- Other social-commerce businesses

The exact initial vertical should be validated through customer research.

## 3.3 Customer Characteristics

The initial target customer may have some or many of the following characteristics:

- Uses Facebook, TikTok, Instagram, or similar platforms to acquire customers
- Receives customer questions through messaging platforms
- Manually records orders
- Uses Excel, paper, spreadsheets, or messaging history to track orders
- Manually checks inventory
- Uses QR/payment methods
- Manually coordinates delivery
- Does not have a dedicated e-commerce system
- Has limited technical resources
- Needs a simple system rather than a complex enterprise platform

These are currently **market hypotheses**, not confirmed facts.

They must be validated with real sellers.

# 4. Problem Definition

## 4.1 Current Problem Hypothesis

Social-commerce sellers can acquire customers through social-media platforms, but the transaction and operational workflow may remain fragmented.

A typical workflow may look like:

```
Customer sees product
        ↓
Customer sends message
        ↓
Seller answers questions
        ↓
Customer asks about:
- Price
- Size
- Color
- Availability
- Location
- Delivery
        ↓
Customer decides to buy
        ↓
Seller records order manually
        ↓
Seller checks inventory
        ↓
Seller collects payment
        ↓
Seller arranges delivery
        ↓
Seller manually updates order/customer information
```

This may create problems such as:

- Repeated customer questions
- Slow responses
- Manual order entry
- Inventory mistakes
- Difficulty tracking orders
- Difficulty tracking customers
- Fragmented information
- Difficulty knowing order status
- Manual payment confirmation
- Manual delivery coordination
- Increasing workload as order volume grows

These problems are hypotheses until validated with real customers.

# 5. Core Product Hypothesis

The core hypothesis is:

> Social-commerce sellers may benefit from a lightweight system that converts social-media traffic into structured product browsing, ordering, payment, delivery, and customer management without requiring them to abandon their existing social-media channels.
> 

The product should therefore work **with** social media rather than attempting to replace it.

# 6. Product Vision

## 6.1 Long-Term Vision

Create a simple commerce operating system for social-commerce businesses.

A seller should be able to:

```
Create Store
    ↓
Add Products
    ↓
Share Product Links
    ↓
Receive Customer Orders
    ↓
Manage Inventory
    ↓
Manage Payment
    ↓
Manage Delivery
    ↓
Track Customers
    ↓
Analyze Business
```

Customers should be able to:

```
Discover Product
    ↓
Open Link
    ↓
View Product
    ↓
Ask Seller if Needed
    ↓
Order
    ↓
Pay
    ↓
Track Order
    ↓
Receive Product
```

# 7. Product Positioning

The product should NOT initially be positioned as:

- A replacement for Facebook
- A replacement for TikTok
- A social network
- A general marketplace
- A large enterprise ERP
- A complex CRM
- A delivery company
- A payment company

The initial positioning should be closer to:

**A simple ordering and business-management system for social-commerce sellers.**

The exact marketing positioning must be validated with potential customers.

# 8. Core Product Principles

## 8.1 Social Media Remains the Acquisition Channel

The seller can continue using:

- Facebook
- TikTok
- Instagram
- Telegram
- Other channels

The product provides shareable links that lead customers into the seller's commerce workflow.

## 8.2 The Platform Is the Source of Truth

Telegram and social-media platforms are communication/acquisition channels.

They should not become the primary source of structured order data.

The platform should be the source of truth for:

- Products
- Inventory
- Customers
- Orders
- Payments
- Delivery
- Order status

## 8.3 Customer Communication Is Optional

Customers may want additional information before purchasing.

The customer may communicate with the seller through Telegram or another supported communication channel.

However:

```
Customer Question
       ↓
Seller Communication
       ↓
Customer Returns to Platform
       ↓
Customer Completes Order
```

The system should not require the entire ordering workflow to happen inside Telegram.

## 8.4 Simple Seller Experience

The target customer may not be technically sophisticated.

Therefore the product should prioritize:

- Simple navigation
- Clear terminology
- Minimal configuration
- Simple checkout
- Simple order management
- Simple inventory management
- Useful notifications

# 9. Customer Journey

## 9.1 Discovery

Customer discovers a product through social media.

Example:

```
TikTok Post
     ↓
Product Link
```

or:

```
Facebook Post
     ↓
Category Link
```

or:

```
Instagram Profile
     ↓
Store Link
```

## 9.2 Landing Page Types

The system should support three main types of shareable destinations.

### Store

```
Store
 ↓
All available products
```

### Product

```
Product Link
 ↓
Specific Product
```

### Category / Collection

```
Category Link
 ↓
Products belonging to that category
```

The seller should be able to choose which type of link to share.

# 10. Product Browsing

A customer should be able to see information such as:

- Product name
- Product images
- Description
- Price
- Variants
- Available stock
- Category
- Seller/store information

Depending on the final MVP, additional information may include:

- Discounts
- Delivery information
- Payment methods
- Product specifications

# 11. Optional Seller Communication

The product may provide an:

**Ask Seller**

action.

Potential flow:

```
Product Page
      ↓
Ask Seller
      ↓
Telegram / Supported Channel
      ↓
Seller Answers
      ↓
Customer Returns
      ↓
Product Page
      ↓
Checkout
```

Telegram should initially be treated as an optional integration.

**Decided (2026-10-03):** "Ask seller on Telegram" on the product page opens a chat with the seller's own Telegram account (the username they enter in Settings), with the product's name and link already typed. The seller answers from their own Telegram; the platform's bot isn't involved and the conversation isn't stored. No username, no button.

**Decided (2026-10-08):** the seller can also show Messenger (their Facebook page) and a phone to call, set in Settings → Contact; each button shows only when filled in. Messenger can't have the question typed in, so it is copied for the customer to paste.

It should not become a mandatory dependency for ordering.

# 12. Customer Ordering

The basic ordering workflow is:

```
Product
   ↓
Select Variant
   ↓
Quantity
   ↓
Add to Cart
   ↓
Checkout
   ↓
Customer Information
   ↓
Delivery Information
   ↓
Payment
   ↓
Order Created
```

The exact checkout requirements will be defined during MVP design and validation.

# 13. Order Confirmation

The platform should eventually support seller-configurable order confirmation behavior.

Potential modes:

### Automatic

```
Customer places order
        ↓
Order automatically accepted
```

### Manual

```
Customer places order
        ↓
Order = PENDING
        ↓
Seller reviews order
        ↓
Accept
or
Reject
```

The appropriate default and available options should be validated with real sellers.

# 14. Payment Model

Payment should be treated separately from order status.

## 14.1 Payment Methods

Potential methods include:

- KHQR
- Cash on Delivery
- Bank transfer/manual payment
- Other supported payment methods

The exact payment integrations will depend on market validation, technical feasibility, provider requirements, and business requirements.

## 14.2 Payment Timing

Potential payment timing:

### Pay Immediately

```
Customer
 ↓
Order
 ↓
Payment
 ↓
Seller processing
```

### Pay After Seller Confirmation

```
Customer
 ↓
Order
 ↓
Seller confirms
 ↓
Customer pays
 ↓
Seller processes
```

### Pay on Delivery

```
Customer
 ↓
Order
 ↓
Seller confirms
 ↓
Delivery
 ↓
Customer pays
```

The seller may eventually configure the appropriate payment workflow.

However, the MVP should not implement every possible combination unless customer validation demonstrates that they are necessary.

# 15. Delivery

The platform should eventually support delivery management.

Potential workflow:

```
Order Accepted
      ↓
Delivery Assigned
      ↓
Picked Up
      ↓
In Transit
      ↓
Delivered
```

Potential delivery models:

- Seller delivery
- External delivery service
- Customer pickup
- Other supported delivery methods

The platform should initially manage delivery information and status rather than attempting to become a delivery company.

# 16. Customer Management

The seller should eventually be able to see:

- Customer name
- Phone/contact information
- Address
- Order history
- Total orders
- Order status history
- Relevant customer notes

Customer management should remain lightweight initially.

The product is not intended to become a complex enterprise CRM in the MVP.

**Decided (2026-10-03):** the customer list shows each customer's orders, last order and what they spent: every order except rejected and cancelled ones, including orders still on their way. Only the seller sees it.

# 17. Inventory Management

The product should eventually provide basic inventory management.

Potential capabilities:

- Stock quantity
- Variant stock
- Stock availability
- Inventory adjustments
- Inventory movement history
- Low-stock notification

The MVP should focus on the minimum inventory functionality required to prevent selling unavailable products.

# 18. Seller Dashboard

The seller dashboard should eventually provide access to:

```
Dashboard
Products
Categories
Orders
Customers
Inventory
Payments
Delivery
Notifications
Settings
Analytics
```

Not all sections belong in the MVP.

# 19. Seller Notifications

The system should notify sellers when important events occur.

Potential events:

- New order
- Order cancellation
- Payment received
- Payment failed
- Delivery update
- Low stock

Potential notification channels:

- Web notification
- Telegram notification
- Future notification channels

Telegram notifications should be optional.

Example:

```
New Order #1024

Customer: Dara
Product: Black T-Shirt
Quantity: 2
Total: $20

[View Order]
```

The application remains the source of truth.

**Decided (2026-10-03):** Telegram alerts only for events the seller didn't cause: each new order, and low stock (an order takes a product or option to 5 or fewer, or sells it out). Cancellation, payment, and delivery changes are the seller's own actions in the MVP, so they get no alert.

**Decided (2026-10-03):** the same two events also appear in the dashboard: a bell with the unread count, and a list that opens the order or product. Read on one device is read on all. No push notifications in the MVP.

# 20. Shareable Links

The seller should be able to generate links for:

- Store
- Product
- Category / Collection

Example conceptual URLs:

```
/shop/{store}
/shop/{store}/product/{product}
/shop/{store}/category/{category}
```

The final URL structure will be defined in the technical design.

## 20.1 Link Tracking

The platform may eventually track:

- Source
- Campaign
- Link
- Target
- Views
- Orders

Example conceptual data:

```
source = tiktok
target_type = product
target_id = 123
campaign = september_sale
```

Advanced marketing analytics are not required for the first MVP unless validation shows a strong need.

**Decided (2026-10-03):** the MVP counts views and orders per link. The seller makes a link for each place they post (the shop, a product or a category; where it's posted; an optional name) and sees each link's views, orders and the orders themselves. An order counts for the last link the customer opened on that phone in the last 7 days. Shared links preview with the shop's or product's name and photo.

# 21. Multi-Tenancy

The product should be designed as a multi-tenant SaaS.

Conceptually:

```
Platform
│
├── Seller A
│   ├── Store
│   ├── Products
│   ├── Customers
│   └── Orders
│
├── Seller B
│   ├── Store
│   ├── Products
│   ├── Customers
│   └── Orders
│
└── Seller C
    ├── Store
    ├── Products
    ├── Customers
    └── Orders
```

Each seller's data must be isolated from other sellers.

The first development deployment may have only one seller.

The architecture should not require separate infrastructure for each seller.

# 22. Complete Product Scope

The following represents the potential full product rather than the initial MVP.

## 22.1 Seller Management

- Seller registration
- Login
- Profile
- Store setup
- Store customization
- Store settings
- Business information
- Payment settings
- Delivery settings

## 22.2 Product Management

- Products
- Product images
- Product descriptions
- Categories
- Variants
- Prices
- Discounts
- Stock
- Product status
- Product sharing

## 22.3 Customer Experience

- Store browsing
- Product browsing
- Category browsing
- Search
- Product details
- Cart
- Checkout
- Guest ordering
- Customer account
- Order tracking
- Seller communication

## 22.4 Order Management

- Create order
- View order
- Accept order
- Reject order
- Process order
- Prepare order
- Ship order
- Deliver order
- Complete order
- Cancel order
- Order history

## 22.5 Inventory

- Stock management
- Variant stock
- Inventory adjustment
- Inventory movements
- Low-stock alerts
- Stock reservation
- Stock history

## 22.6 Payments

- Payment methods
- Payment status
- Payment confirmation
- Payment records
- Refunds
- Payment history
- Payment provider integrations

## 22.7 Delivery

- Delivery method
- Delivery address
- Delivery fee
- Delivery status
- Delivery assignment
- Tracking information
- Delivery provider integration

## 22.8 Customer Management

- Customer profiles
- Order history
- Customer notes
- Customer segmentation
- Customer activity

## 22.9 Notifications

- Web notifications
- Telegram notifications
- Email
- SMS
- Future notification channels

## 22.10 Analytics

Potential future analytics:

- Orders
- Revenue
- Product performance
- Inventory
- Customer activity
- Link performance
- Marketing source
- Conversion

## 22.11 Platform Administration

Decided 2026-10-28 (the founder's picks from the admin plan: D1A D2B D3A
D4B D5A; every part built except 7, later, and 32, skipped): Oak Order's
admin panel, its own area of the app at `/admin` with its own menu, in
English only (the two admin pages built before keep their Khmer). The
same app and API, with no second site or server. Before that, the admin
page only checked plan payments (§33.1), from a seller login.

- **Its own account** (founder, 2026-10-28: "im the system owner if i
  also want to have shop in my system i can create shop like other
  seller"): the admin is the system owner's own login, with no shop.
  Logging in at `/admin` takes two steps, the password then a
  confirmation in Telegram (sharing the phone with Oak's bot, as sellers
  do). Only a number in `ADMIN_PHONES` (set on Render, not in the app)
  can have an admin account; the first time, it logs in with Telegram and
  sets its password. It stays logged in on that phone like a seller, and
  can be logged in beside a seller's shop on the same phone. The
  founder's own shop (Oak Fashion) is an ordinary shop with its own
  login. "I've paid" alerts go to the admin's own Telegram chat with
  Oak's bot.

- **Home:** what needs the founder ("I've paid" to check, shops ending
  soon or unpaid, shops not opened 7 days after sign-up, failed Telegram
  messages, a daily job that didn't run), and the numbers (shops by
  stage, money this month and year, monthly income if every paying shop
  renews, orders in all shops today and this week, sign-ups and orders
  per day for 30 days).
- **Shops:** the list (search, filters by stage, sort) and a shop's page
  (owner, dates, link, currency, Telegram, payment and delivery set up,
  counts, last order, last time the owner used the app, plan and
  payments, the shop's activity). Close with a reason and reopen; erase a
  closed shop after typing its link name (the nightly backup still holds
  it 30 days).
- **Open as seller:** the founder uses the shop's whole seller app as its
  owner, with a bar on top and Exit, for 30 minutes. Everything the owner
  can do, except the owner's password, login phone and logins, Close shop
  and "I've paid". Each time is logged with what was saved, the shop's
  Telegram is told ("Oak Order opened your shop to help you"), and the
  Privacy page says it can happen. Admin screens don't edit a shop's
  orders, products or settings themselves: they go through this.
- **People:** every owner and staff login, searchable by phone; reset a
  password (shown once), log out every phone, change the login phone,
  remove a Google or Facebook login.
- **Money:** "I've paid" checks and Mark paid (as before), change a
  shop's paid-until date with a reason, undo a payment (kept as Undone),
  every payment with month and year totals and an Excel download, send a
  plan reminder now.
- **Orders and customers:** find an order (shop and number, or the
  customer's phone) or a customer in every shop, look only; remove a
  customer's details from one shop or every shop; the newest products of
  every shop with photos, and hiding one.
- **Settings:** the riel rate, the prices and the trial length, set in
  the app instead of Render or the code (Settings → Plan, the Terms' Fees
  and sign-up read them; a new price applies from the next payment); a
  check of which services are set up (never showing a key).
- **System** (founder 2026-10-28: track on the platforms, show what
  matters here): six tiles, speed and errors in the last hour (counted
  by the app itself, starting again when the server restarts), the daily
  jobs (with Run now), the Telegram bot's state and failed sends, the
  database's size and speed, which services are set up, and the live
  version; then "Look deeper", what Sentry, Render, Neon, Cloudflare and
  cron-job.org each show, with links. The detail (graphs over days,
  which part of a request was slow) stays on those platforms; Sentry
  also records the speed of a small share of requests. A down alert
  comes from cron-job.org's failure email, since the admin is on the
  same server.
- **Asking for the password again** (founder 2026-10-28: "for doing
  criticle thing on some place should require to put password again"):
  Open as seller, a seller's new password, changing a login phone,
  removing a Google or Facebook login, changing prices, the trial or the
  riel rate, a message to every shop, and the bot's words going live or
  its profile ask for the admin's password,
  then not again for 10 minutes; Erase shop and removing a customer's
  details ask for it every time, as well as the typed name. Each of
  these also sends the admin a Telegram line. Everything else that
  changes something asks first.
- **Design** (the founder's picks 2026-10-28, laptop first: "for admin
  mostly i will use on laptop"): 1A 2A 3B 4B 5D 6A 7A 8A 9B 10C 11A 12B
  13A 14A 15A from the design page. A menu on the left on a laptop and
  the bottom bar on a phone; Home with the numbers first; the shop list
  as a table with each shop's photo; a shop's page beside the list; the
  Open-as-seller bar across the top; asks first in a sheet (a box on a
  laptop); a login's own page; payments with the waiting ones first;
  search from every page (`/`); one Settings page with one Save; the
  activity log a day at a time; products as a photo grid; a message to
  every shop sent to the admin first.
- **Log and tools:** a log of every admin action; a test shop in one tap;
  a Telegram message to every shop (sent to the founder first);
  sign-ups that didn't finish (numbers checked in Telegram that never
  made a shop), to help them finish.
- **Bot** (founder, 2026-10-31: "i want feature to control telegram bot
  on admin panel. e.g. can change every message text in telegram bot and
  others"; picks B1B and turning a message off, design 1A 2A 3A 4B 5A 6A
  7A 8A 9B 10A 11A): its own item in the admin menu. Every message the
  bot sends is in a list (to sellers, to customers, to the founder),
  the open one beside it, its whole text in one box with tags that fill
  in by themselves ({shop}, {total}, {items}…) and **bold**. A line
  whose tags are all empty is left out (no discount, no discount line).
  The small words inside tags (how they pay, the order status headlines,
  button labels) are under each message that uses them; one change
  reaches every message. A preview under the box shows an example
  order. Save sends the new words to the founder's own Telegram first;
  Go live, with the password again, makes them the bot's. Back to
  original puts the first words back. A message the bot sends by itself
  (new order, receipt, reminders…) can be turned off for everyone;
  replies to someone's own tap, and "Oak Order opened your shop"
  (promised on the Privacy page), stay on. The bot's profile (its name,
  the text before Start, About) is one text for everyone; its photo and
  the OPEN app stay in BotFather. Each change is logged. Messages stay
  in Khmer only. If Telegram refuses a changed message, the bot sends
  the original words instead. System has "Connect the bot again" for
  when Telegram has stopped reaching the server.
- Stays a command: moving photos to a new address (`docs/ADMIN.md`).
- Later: a shop's orders, products and customers as look-only lists in
  the admin (Open as seller shows them).

# 23. MVP Scope

The MVP exists to answer one question:

> Can a social-commerce seller use this system to convert social-media customers into structured orders and manage those orders more effectively?
> 

The MVP should therefore focus on the smallest complete transaction loop.

## 23.1 MVP Seller Features

### Authentication

- Seller registration
- Seller login
- Basic account management

### Store

- Create store
- Store name
- Basic store information

### Products

- Create product
- Edit product
- Delete/deactivate product
- Product image
- Product price
- Product description
- Basic category
- Basic variants where necessary
- Stock quantity

### Shareable Links

- Product link
- Store link
- Category link if necessary for the initial workflow

### Orders

- View orders
- View order details
- Accept order
- Reject/cancel order
- Update order status

### Customers

- View customer information associated with orders
- View basic order history

### Notifications

- Web notification
- Telegram seller notification if Telegram integration is included in the MVP

### Settings

- Basic payment configuration
- Basic delivery configuration
- Order confirmation configuration

**Decided (2026-10-08), added to the MVP at the founder's request:**

- Pause orders for a while, with an optional day they open again by themselves
- Contact buttons for customers: Telegram, Messenger (a Facebook page), Instagram (2026-10-24), a phone to call
- Low-stock alert level
- Account: name, phone number (the login, changed through Telegram), password; a forgotten password is reset through the shop's Telegram chat (or by Oak Order). Owners can also "Log in with Telegram" (2026-10-24); staff log in with their phone and password
- Staff logins: helpers with their own phone number who can do everything except Settings
- Export orders to Excel
- Close shop: the link and logins stop, nothing is erased; Oak Order reopens it or erases it for good on request

**Decided (2026-10-09):** orders that came by chat, added by the seller at the shop's prices; a short path (Accept, Delivered, Complete; the steps between optional; "Delivered, cash received" for cash on delivery); "Not paid after all"; Send to driver; a setup checklist for new shops. The shop's numbers wait for a seller dashboard.

**Decided (2026-10-25):** a receipt for each order: a parcel slip for an 80 mm receipt printer (the shop, the customer and address, the items and totals, and what the driver collects), shared as a picture (to a Bluetooth printer's app, or to the customer) or printed.

**Decided (2026-10-09, updated 2026-10-27):** sellers sign up with a phone number proved through the Telegram bot (free; one shop per number) and a password, or start with Google and then prove the phone the same way. Since 2026-10-24 Log in starts with "Log in with Telegram" for shop owners (the number shared with the bot, as at sign-up); owners keep their password, and staff log in only with phone and password. Facebook sign-up and log-in are built but off until Meta's business verification and App Review. TikTok's was removed on 2026-10-27, after TikTok turned the app down; Log in with Telegram covers it. The purpose is ease of use; after signing up, sellers still pay a subscription to use the platform (pricing: §33.1). A privacy policy, terms of service and data deletion instructions are public pages.

# 24. MVP Customer Features

The customer should be able to:

- Open a shared link
- View the seller/store
- View products
- View product details
- Select product variants
- Select quantity
- Add to cart
- Enter customer information
- Enter delivery information
- Select available payment method
- Place order
- View order confirmation
- Track basic order status
- Tell the shop they've paid ("I've paid"), with the receipt in chat (2026-10-09)

A customer account should not automatically be required for the first MVP.

Guest checkout should be considered because reducing checkout friction is important for social-commerce traffic.

**Decided (2026-10-02): guest checkout, no customer accounts in the MVP.** The customer gives a name, phone, and address at checkout. They track the order with its link plus the phone they ordered with. Sellers and customers refer to orders by a per-store number (#1001, #1002, …).

# 25. MVP Payment Scope

The MVP should support only the payment workflows that are actually needed by the first target sellers.

Potential initial options:

```
Cash on Delivery
KHQR
Manual Bank Transfer
```

The exact implementation depends on validation and integration feasibility.

**Decided (2026-10-24):** bank transfer was removed: KHQR does the same with nothing to type wrong. The MVP offers cash on delivery and KHQR. Orders placed with bank transfer before still show the account to pay.

**Decided (2026-10-02):** the MVP offers all three, each turned on or off by the seller. The customer chooses one at checkout and sees how to pay right after ordering, before the seller accepts. KHQR codes are made from the seller's Bakong ID with the exact amount, without a payment provider. The seller confirms every payment by hand.

Do not implement multiple payment providers simply to make the product appear complete.

# 26. MVP Delivery Scope

The MVP should support basic delivery information.

Potential capabilities:

- Delivery address
- Delivery fee
- Delivery method
- Delivery status
- Seller-managed delivery status

Complex logistics functionality should be postponed.

**Decided (2026-10-03):** the seller turns on delivery, pickup, or both; under delivery they list the couriers they send with, if any (e.g. J&T Express, VET Express; one Delivery switch since 2026-10-18, before that own delivery and couriers were separate). The customer chooses delivery or pickup at checkout; under delivery they can pick one of the shop's couriers or leave it to the shop, and the seller chooses their own driver or a courier when sending (founder, 2026-10-18; before that each courier was its own choice next to the shop's delivery). Delivery costs one fee set by the seller, the same for every address and every courier (per-area fees were dropped because a customer could pick the cheaper area); the seller can make it free from an amount or from a number of items, and pickup is always free. A new shop starts at $2 a delivery (8,000៛ in a riel shop) until the seller changes it (founder, 2026-10-18); shops from before keep their fee. For delivery the customer gives a typed address, a pin they place on a map (it can jump to the phone's location), or both, plus an optional note for the driver; the seller opens the location in Google Maps. The seller books the courier and moves each delivery along by hand; no courier integration in the MVP.

**Decided (2026-10-03):** simple bill discounts are in the MVP: the seller sets a fixed amount off once the items reach a total (e.g. $5 off from $40). If an order reaches more than one, the biggest applies; they never add up. No discount codes.

**Decided (2026-10-24):** sales on chosen products: the seller picks products and takes a percentage or an amount off each one's price (every option of it), until a last day or until removed. A product in two sales gets the lower price; sales never add up. The bill discounts then count on the sale prices. The shop shows the sale price with the old one crossed out. (Until then: no percentages or per-product discounts.)

# 27. MVP Telegram Scope

Telegram should be optional.

Potential MVP functions:

### Seller Notification

```
New Order
     ↓
Telegram Bot
     ↓
Seller
```

### Customer Communication

```
Customer
     ↓
Ask Seller
     ↓
Telegram
     ↓
Seller
```

The actual Telegram interaction must be validated and technically confirmed before committing to a specific implementation.

Telegram should not store the authoritative order state.

**Decided (2026-10-03):** Telegram is in the MVP and optional per store. Seller notification: the seller connects their chat to the platform's bot from Settings; alerts as in §19. Customer communication: "Ask seller" opens the seller's own Telegram (§11).

# 28. Features Explicitly Deferred

The following should not be part of the initial MVP unless validation demonstrates a strong requirement.

## Customer Features

- Native mobile application
- Advanced customer accounts
- Loyalty program
- Reviews
- Wishlist
- Social features

## Seller Features

- Advanced CRM
- Advanced analytics
- Accounting
- Payroll
- Complex reporting
- Advanced promotion engine (simple bill discounts and sales on chosen products are in the MVP, §26)
- Advanced marketing automation

## Platform Features

- Marketplace
- Seller-to-seller marketplace
- Multi-vendor public marketplace
- Advanced subscription management
- Complex platform billing

## Technology

- Microservices
- Kubernetes
- Kafka
- Complex event-driven architecture
- Multiple databases
- Complex infrastructure orchestration

The product should remain a modular and maintainable application until real requirements justify greater complexity.

# 29. Order State Model

Order state must remain separate from payment and delivery state.

### Order

Potential states:

```
PENDING
    ↓
ACCEPTED
    ↓
PROCESSING
    ↓
READY
    ↓
SHIPPED
    ↓
DELIVERED
    ↓
COMPLETED
```

Cancellation may occur from appropriate states.

**Decided (2026-10-24):** the order's own steps are PENDING → ACCEPTED → COMPLETED (or REJECTED / CANCELLED); a pickup order may also be READY ("Ready to collect") before it completes. PROCESSING, SHIPPED and DELIVERED were retired: the delivery's own status says where the parcel is. An order completes by itself once its delivery is delivered and its payment paid (cash on delivery: once the cash is received); the seller can still complete a cash order without recording the cash.

# 30. Payment State Model

Potential states:

```
PENDING
    ↓
PAID
```

or:

```
PENDING
    ↓
FAILED
```

Potential future state:

```
PAID
 ↓
REFUNDED
```

The exact state machine will be finalized in `02_TECHNICAL.md`.

# 31. Delivery State Model

Potential states:

```
NOT_ASSIGNED
      ↓
ASSIGNED
      ↓
PICKED_UP
      ↓
IN_TRANSIT
      ↓
DELIVERED
```

Failed delivery may be handled separately.

# 32. Business Rules

The following are initial business rules.

## Rule 1 — Platform Source of Truth

Orders, payments, inventory, and delivery information must be stored in the platform.

External communication channels are not the source of truth.

## Rule 2 — Tenant Isolation

A seller must only be able to access data belonging to their tenant.

## Rule 3 — Product Availability

Customers should not be able to purchase unavailable products or variants.

The exact stock reservation behavior must be defined during technical design.

## Rule 4 — Payment and Order Are Separate

An order can exist independently from payment state.

For example:

```
Order = ACCEPTED
Payment = PENDING
```

may be valid for certain seller configurations.

## Rule 5 — Delivery and Payment Are Separate

For example:

```
Order = SHIPPED
Payment = PENDING
Delivery = IN_TRANSIT
```

may be valid for Cash on Delivery.

## Rule 6 — Seller Configuration

Seller-specific workflows should be configurable where there is a demonstrated business need.

However, excessive configuration should be avoided in the MVP.

## Rule 7 — Telegram Is Optional

A seller should still be able to use the platform without connecting Telegram.

# 33. Business Model

Potential revenue sources:

## 33.1 Subscription

Recurring monthly or annual fee for software access.

Decided 2026-10-14 (founder's picks 1B 3A 4B 5A 6A from a pricing plan
the founder brought; no early-seller offer):

- **One plan at launch, Oak Order Standard: $9.99 a month, or $99 a
  year** ($8.25 a month, $20.88 less than 12 monthly payments). Per
  shop, in US dollars. It includes every feature built, up to 10 staff
  logins, and hosting (§33.3). "Made with Oak Order" shows on every
  Standard shop.
- **A 1-month free trial** (30 days) for every new shop, starting when
  the seller opens the shop, not at sign-up (founder, 2026-10-16). Until
  then the shop is in setup, with no time limit: the seller can add
  products and settings and preview the shop; customers see "Opening
  soon" and can't order, and the seller can't add orders from a chat.
  Tapping Open shop (on the Orders tab, New order, Settings → Plan or the
  setup checklist) shows the trial (its end date and the price after it)
  and starts it. There is no free plan and no early-seller discount.
- **When the trial ends** (day 1 is the day the seller opens the shop):
  - Day 25: the seller sees a reminder in the dashboard with the price
    (monthly and yearly) and the day the trial ends. The founder also
    messages the first sellers on Telegram.
  - Day 31: the trial has ended. The seller sees a clear notice and has
    7 days to pay (days 31–37); the shop still takes orders.
  - Day 38, still unpaid: the shop takes **no new orders**. Customers
    can still open the shop and see the same "not taking orders right
    now" notice as when a seller pauses orders, never anything about
    payment. The seller can still finish the orders already placed, see
    everything and export; only new orders stop, orders added from a
    chat too. Paying opens the shop again at once.
  - A paid month or year that runs out works the same way: a reminder 6
    days before, 7 days to pay, then no new orders.
  - Nothing is cancelled or deleted. The Terms say all of this, and
    Settings → Plan shows the price (the sign-up page no longer does,
    2026-10-18).
- **How sellers pay Oak Order.** Decided (2026-10-14): sellers pay
  monthly by hand until Oak Solutions qualifies for ABA PayWay (MOC
  registration, ABA account, 6 months of business). Then PayWay: Pay now
  (ABA PAY, KHQR, card) and auto-charge from a linked ABA account or card
  on each shop's start day, with 7 days to pay.
  - **By hand, now:** Settings → Plan shows the shop's code (e.g.
    OAK-K7Q2MX) and Oak's KHQR (the code as its bill number) and/or bank
    account. The seller pays, puts the code in the transfer's note, and
    taps "I've paid": the founder gets a Telegram alert, finds the money,
    and marks it paid on the admin page (or "not found", with a note the
    seller sees).
  - **Reminders:** on the shop's start day (the day after its paid time
    ends) and on day 5, a Telegram message says to pay by hand and that
    new orders stop on day 8. Shops without Telegram (it's optional, Rule
    7) see it on the Orders tab.
- **The founder's admin page** (web, only for the founder's login): every
  shop's plan, code and status, the "I've paid" to check, and "mark paid"
  for any payment made by hand (an amount of 0 gives free time). From the
  admin panel (§22.11, decided 2026-10-28) the founder also sets the
  prices and the trial length there (a new price applies from each shop's
  next payment, and the Terms' Fees follow), moves a shop's paid-until
  date with a reason, and undoes a payment marked by mistake.
- **Later plans, not built:** Growth ($15–19 a month: more staff,
  advanced reports, automation) and Business ($29+ a month: several
  shops, more complex operations), when sellers show they need them.
  Hiding "Made with Oak Order" could come with them.

## 33.2 Implementation / Onboarding

Potential one-time fee for:

- Store setup
- Product migration
- Configuration
- Training
- Custom setup

Decided 2026-10-14: creating the shop and guiding the seller through
setup are always included. Adding products and training are free for
the first 3–5 sellers; the founder writes down how long each takes and
sets the prices from that (starting ideas, not published: $10–15 for up
to 50 products, $20–30 for up to 100, $10–20 for training).

## 33.3 Hosting

Included in the subscription: no separate hosting fee (decided
2026-10-14).

## 33.4 Premium Features

Potential future paid features:

- Advanced analytics
- Additional integrations
- Automation
- Additional users
- Advanced reporting
- Marketing features
- Removing the "Made with Oak Order" line (§33.1)

The launch price is set (§33.1) but not yet tested with real sellers
(§35, Critical Assumption 5). Measure how many trials become paying
shops before changing it.

# 34. Customer Acquisition Strategy

Initial acquisition should prioritize low-cost methods.

Potential channels:

- Direct outreach
- Local business networking
- Seller communities
- Facebook groups
- Telegram communities
- LinkedIn
- Referrals
- Demonstrations
- Direct seller visits
- Industry-specific landing pages

Paid advertising should not be a major early investment before the product and offer are validated.

# 35. Market Validation

The following assumptions must be tested.

## Critical Assumption 1

Sellers experience enough operational pain to seek a solution.

## Critical Assumption 2

Customers are willing to leave a social-media platform temporarily and use an external product/order page.

## Critical Assumption 3

Sellers are willing to send customers to product/store links.

## Critical Assumption 4

The ordering workflow is sufficiently better than manually handling orders through messaging.

## Critical Assumption 5

Sellers are willing to pay for the solution.

## Critical Assumption 6

The operational savings or additional sales justify the subscription price.

## Critical Assumption 7

Sellers are willing to configure products and inventory in another system.

# 36. Validation Questions

Before significant development, investigate:

## Seller Workflow

- How do you currently receive orders?
- Where do you record orders?
- How do you know which orders are pending?
- How do you track inventory?
- How do you confirm payments?
- How do you manage delivery?
- How do you remember previous customers?

## Customer Acquisition

- Where do most customers discover your products?
- Do you currently send customers links?
- Do customers normally order through chat?
- Would customers use a dedicated product page?
- What makes customers abandon an order?

## Payment

- Which payment methods do customers normally use?
- Do customers pay before or after confirmation?
- Do you accept Cash on Delivery?
- How do you currently verify payments?

## Willingness to Pay

- What software do you currently pay for?
- What business tools do you use?
- What would make a system worth paying for?
- Would you prefer monthly pricing or another model?

The answers should be recorded and used to update this document.

# 37. Success Criteria

The project should not initially measure success by the number of features built.

Initial success should be measured by real usage.

## Validation Success

- Multiple relevant sellers interviewed
- Repeated pain points identified
- Clear workflow pattern identified
- At least some sellers express willingness to test the product
- Evidence of willingness to pay

## MVP Success

- Real seller can create products
- Seller can share product links
- Real customer can place an order
- Seller can receive and manage the order
- Payment workflow works for the selected method
- Delivery workflow works for the selected model

## Early Product Success

- First real seller uses the system
- Multiple real orders are processed
- Seller continues using the product after initial testing
- Repeated problems are identified
- Seller is willing to pay

## SaaS Validation

- Multiple sellers use similar workflows
- Similar feature requests appear repeatedly
- Sellers accept recurring pricing
- Manual onboarding can be standardized
- Support burden remains manageable

# 38. Risks

## 38.1 Customers May Prefer Chat

### Risk

Customers may prefer completing the entire transaction through Facebook Messenger, Telegram, or another chat channel.

### Impact

The external checkout workflow may have low adoption.

### Mitigation

Validate customer behavior before building a large checkout system.

## 38.2 Sellers May Not Pay

### Risk

Sellers may acknowledge the problem but not consider it worth paying for.

### Impact

The product may have usage but no viable business model.

### Mitigation

Test willingness to pay early.

## 38.3 Seller Setup May Be Too Much Work

### Risk

Sellers may not want to enter products, inventory, and prices into another system.

### Impact

Poor adoption.

### Mitigation

Keep onboarding simple and investigate product import mechanisms later.

## 38.4 Payment Integration Complexity

### Risk

Payment integrations may require provider onboarding, technical integration, reconciliation, and operational handling.

### Impact

Increased development and support complexity.

### Mitigation

Start with the simplest validated payment workflow.

## 38.5 Delivery Complexity

### Risk

Delivery workflows vary significantly between sellers.

### Impact

Large support burden.

### Mitigation

Start with basic seller-managed delivery information and status.

## 38.6 Excessive Customization

### Risk

Each seller requests a different workflow.

### Impact

The product becomes a collection of custom projects instead of a SaaS.

### Mitigation

Track repeated requirements and distinguish common product requirements from individual custom requests.

## 38.7 Building Too Much Before Validation

### Risk

Large development investment before knowing whether sellers will use/pay for the system.

### Impact

Wasted time and money.

### Mitigation

Validate critical assumptions before implementing advanced functionality.

## 38.8 Full-Time Job Constraint

### Risk

The product requires more operational time than available.

### Impact

Slow development or excessive customer-support burden.

### Mitigation

Prefer standardized onboarding, simple architecture, automation, and limited initial customers. ``

# 39. SaaS Transition Strategy

The product should not become a large SaaS immediately.

The transition should follow evidence.

Example:

```
Seller A
   ↓
Requirement X

Seller B
   ↓
Requirement X

Seller C
   ↓
Requirement X
```

Repeated requirements indicate potential product functionality.

The process should be:

```
Custom Request
      ↓
Track
      ↓
Compare Across Customers
      ↓
Repeated Pattern?
      ↓
Yes
      ↓
Generalize
      ↓
Reusable Product Feature
```

This prevents individual customer customization from controlling the product architecture.

# 40. Future Product Direction

Possible future capabilities include:

- Advanced analytics
- Marketing attribution
- Automated customer follow-up
- Customer segmentation
- Promotions
- Discount codes
- Loyalty
- Advanced inventory
- Delivery-provider integrations
- Multiple payment providers
- Mobile applications
- AI-assisted customer support
- Automated seller workflows
- Accounting integrations
- Multi-country support
- More languages beyond Khmer and English (Khmer / English was built in Phase 9, Khmer by default; see 03_DEVELOPMENT.md)

These are possibilities, not commitments.

They should only be prioritized when supported by customer demand.

# 41. Product Expansion Strategy

Expansion should generally follow:

```
Core Ordering
      ↓
Inventory
      ↓
Payments
      ↓
Delivery
      ↓
Customer Management
      ↓
Analytics
      ↓
Automation
      ↓
Integrations
      ↓
Advanced SaaS Features
```

The actual sequence may change based on customer evidence.

# 42. MVP Definition of Done

The MVP should not be considered complete merely because the code runs.

The MVP is complete when a real seller can perform the complete workflow:

```
Seller creates store
        ↓
Seller creates product
        ↓
Seller shares product link
        ↓
Customer opens link
        ↓
Customer views product
        ↓
Customer places order
        ↓
Seller receives notification
        ↓
Seller manages order
        ↓
Payment is handled
        ↓
Delivery is handled
        ↓
Order reaches completion
```

The complete workflow should be tested using real-world usage before considering the MVP validated.

# 43. Non-Goals

The initial project is **NOT** intended to:

- Replace social media
- Build a new social network
- Become a general marketplace
- Become a full ERP
- Become a full CRM
- Become a delivery company
- Become a payment processor
- Build native mobile applications immediately
- Support every payment provider
- Support every delivery provider
- Build advanced AI functionality before validating the core product
- Build complex infrastructure without a demonstrated requirement

# 44. Decision Framework

When considering a new feature or major product change, evaluate:

## Goal

What problem are we trying to solve?

## Evidence

Do customers actually have this problem?

## Assumption

What are we assuming?

## Business Value

Could solving it increase:

- Customer acquisition?
- Customer retention?
- Revenue?
- Operational efficiency?
- Recurring revenue?

## Development Cost

How much development time is required?

## Support Cost

Will this create ongoing operational work?

## Reusability

Can the feature be reused across multiple sellers?

## SaaS Value

Could this eventually become part of the standardized SaaS?

## Decision

Choose one:

```
Build Now
Build Later
Validate First
Reject
```

# 45. Current Project Status

Current status:

**Product definition and validation**

Not yet in full development.

Current known decisions:

- Build the product from scratch
- Do not depend on a CodeCanyon foundation
- Cambodia is the initial target market
- Product should be SaaS-capable
- Multi-tenancy should be considered from the beginning
- Social media remains the acquisition channel
- Platform is the source of truth
- Telegram is optional
- Customer communication and ordering are separate
- Store/product/category links should be supported
- Order/payment/delivery states should remain separate
- MVP should be narrow
- Customer validation must happen before significant development

# 46. Open Decisions

The following are intentionally not finalized.

## Product

- Exact initial seller vertical
- Exact target seller size

## Payment

- Payment provider requirements (e.g. one-tap pay in the customer's bank app and automatic confirmation; see the Requirements Log)

## Delivery

- Courier integration (automatic booking and tracking with J&T, VET, etc.). Decided for the MVP (2026-10-03): seller-managed delivery, one fee per shop, couriers chosen and booked by hand (§26).

## Telegram

- Alerts for more events (cancellation, payment, delivery) if sellers ask for them. Decided for the MVP (2026-10-03): Telegram is in, alerts for new orders and low stock (§19), "Ask seller" opens the seller's own Telegram (§11, §27).

## Business

- Setup fee amounts: set after timing the first 3–5 sellers' setups (§33.2)
- Registering Oak Solutions with MOC: type (sole proprietorship or PLC) and date. Needed for ABA PayWay and before charging sellers.

## Market

- Exact initial customer segment
- Willingness to pay
- Customer acquisition channel
- Main differentiating value proposition

These decisions should be resolved through validation and technical investigation rather than assumptions.

Decided so far (details in §24, §25 and `02_TECHNICAL.md`):

- Guest checkout, no customer accounts in the MVP (2026-10-02)
- Order tracking: the order link plus the phone used at checkout (2026-10-02)
- Payment methods: cash on delivery and KHQR, each turned on by the seller (2026-10-02; bank transfer removed 2026-10-24)
- KHQR: generated from the seller's Bakong ID, no payment provider (2026-10-02)
- Payment timing: the customer sees how to pay right after ordering (2026-10-02)
- Payment confirmation: by hand by the seller, for every method (2026-10-02)
- Product name: Oak Order, under the brand Oak (2026-10-08; replaces Sroul Order from 2026-10-06)
- Company Oak Solutions, domain oaksolve.com, this product at `order.oaksolve.com` (2026-10-09; Oak Shop considered and not picked)
- Oak's mark: the oak leaf from the Oak Solutions logo (2026-10-10; replaces a stock tree icon)
- Every shop credits Oak: "Made with Oak Order" with Privacy · Terms at the bottom of the shop's pages and the order page, and shared links end in "· Oak Order" with Oak's mark small on the picture (2026-10-10). The line stays on the Standard plan (2026-10-14); hiding it may come with a later plan.
- Pricing (2026-10-14, §33): one plan, Standard, $9.99 a month or $99 a year per shop, hosting included; a 1-month free trial from the day the seller opens the shop (setup before that has no time limit and takes no orders, 2026-10-16), no free plan, no early-seller discount; unpaid 7 days after the trial (or a paid period), the shop takes no new orders and nothing is deleted; sellers pay by hand (KHQR or transfer with the shop's code, "I've paid", the founder confirms on an admin page; Telegram reminders on day 1 and day 5) until Oak Solutions qualifies for ABA PayWay; setup free for the first 3–5 sellers. Growth and Business plans are for later.

# 47. Relationship With Other Project Documents

This document defines:

**WHAT we are building and WHY.**

`02_TECHNICAL.md` defines:

**HOW the system will work technically.**

`03_DEVELOPMENT.md` defines:

**HOW and WHEN we will build it.**

Changes to product scope should be reflected in the technical and development documents when necessary.

# 48. Guiding Principle

The ultimate objective is not to build the largest possible commerce platform.

The objective is:

> **Build the smallest useful product that solves a real problem for social-commerce sellers, get real users, learn from their behavior, and gradually turn repeated needs into a sustainable SaaS product.**
> 

The product should grow from evidence rather than from assumptions.

---

This is the **master product document**.

Market validation, scope, MVP, workflows, business rules, risks, and future roadmap are intentionally kept together to avoid maintaining multiple overlapping files.

The next document,

**`02_TECHNICAL.md`**

, should be written

**from this document**

, especially the MVP scope and the defined order, payment, and delivery concepts.