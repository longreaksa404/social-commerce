import type { Tree } from '../core.ts'

/** The seller's Orders tab and an order's page. */
export const orders = {
  title: { en: 'Orders', km: 'ការកុម្ម៉ង់' },
  order: { en: 'Order', km: 'ការកុម្ម៉ង់' },
  // The shop isn't taking orders (Settings → Orders).
  paused: {
    en: 'Not taking orders. Tap to turn them back on.',
    km: 'មិនទទួលការកុម្ម៉ង់ទេ។ ចុចដើម្បីបើកវិញ។',
  },
  // Staff can't turn it back on (Settings is the owner's).
  pausedStaff: { en: "The shop isn't taking orders right now.", km: 'ហាងមិនទទួលការកុម្ម៉ង់នៅពេលនេះទេ។' },
  pausedUntil: {
    en: (day: string) => `Your shop isn't taking orders until ${day}.`,
    km: (day: string) => `ហាងរបស់អ្នកមិនទទួលការកុម្ម៉ង់រហូតដល់ ${day}។`,
  },
  // A new shop in setup: nothing can be ordered until the owner opens it,
  // which starts the 30-day free trial (dashboard/OpenShop.tsx).
  // No orders yet, with the setup list above (UX check #3).
  emptyInSetup: {
    en: 'Orders show up here once your shop is open.',
    km: 'ការកុម្ម៉ង់នឹងបង្ហាញនៅទីនេះ ពេលហាងបើក។',
  },
  opening: {
    button: { en: 'Open shop', km: 'បើកហាង' },
    title: { en: "Your shop isn't open yet", km: 'ហាងរបស់អ្នកមិនទាន់បើកនៅឡើយទេ' },
    text: {
      en: "Customers can look but can't order yet. Your 30-day free trial starts when you open.",
      km: 'អតិថិជនអាចមើលបាន ប៉ុន្តែមិនទាន់អាចកុម្ម៉ង់ទេ។ ការសាកល្បងឥតគិតថ្លៃ 30 ថ្ងៃចាប់ផ្ដើមពេលអ្នកបើក។',
    },
    staff: {
      en: "The owner hasn't opened the shop yet.",
      km: 'ម្ចាស់ហាងមិនទាន់បើកហាងនៅឡើយទេ។',
    },
    // New order while in setup.
    newOrderTitle: { en: 'Open your shop first', km: 'សូមបើកហាងរបស់អ្នកជាមុនសិន' },
    newOrderText: {
      en: 'Orders start once your shop is open. Your 30-day free trial starts then.',
      km: 'ការកុម្ម៉ង់ចាប់ផ្ដើមពេលហាងបើក។ ការសាកល្បងឥតគិតថ្លៃ 30 ថ្ងៃចាប់ផ្ដើមពេលនោះ។',
    },
    // The pop-up.
    confirmTitle: { en: 'Start your 30-day free trial', km: 'ចាប់ផ្ដើមការសាកល្បងឥតគិតថ្លៃ 30 ថ្ងៃ' },
    confirmMessage: {
      en: (day: string, month: string, year: string) =>
        `Customers can order from today. Free until ${day}, then ${month} a month or ${year} a year. No card, no automatic charges.`,
      km: (day: string, month: string, year: string) =>
        `អតិថិជនអាចកុម្ម៉ង់បានចាប់ពីថ្ងៃនេះ។ ឥតគិតថ្លៃរហូតដល់ ${day} បន្ទាប់មក ${month} ក្នុងមួយខែ ឬ ${year} ក្នុងមួយឆ្នាំ។ មិនត្រូវការកាត មិនកាត់ប្រាក់ដោយស្វ័យប្រវត្តិ។`,
    },
    confirm: { en: 'Start free trial and open shop', km: 'ចាប់ផ្ដើមសាកល្បង ហើយបើកហាង' },
    opened: { en: 'Your shop is open. Customers can order now.', km: 'ហាងរបស់អ្នកបានបើកហើយ។ អតិថិជនអាចកុម្ម៉ង់បានឥឡូវនេះ។' },
    failed: { en: "Couldn't open your shop. Try again.", km: 'មិនអាចបើកហាងរបស់អ្នកបានទេ។ សូមព្យាយាមម្ដងទៀត។' },
  },
  // The shop's plan with Oak Order running out (Settings → Plan).
  planEndingTrial: {
    en: (day: string) => `Your free trial ends on ${day}. Tap to see how to pay.`,
    km: (day: string) => `ការសាកល្បងឥតគិតថ្លៃរបស់អ្នកបញ្ចប់នៅ ${day}។ ចុចដើម្បីមើលរបៀបបង់។`,
  },
  planEnding: {
    en: (day: string) => `Your plan ends on ${day}. Tap to see how to pay.`,
    km: (day: string) => `គម្រោងរបស់អ្នកបញ្ចប់នៅ ${day}។ ចុចដើម្បីមើលរបៀបបង់។`,
  },
  planOverdueTrial: {
    en: (day: string) => `Your free trial has ended. Pay by ${day} to keep taking orders.`,
    km: (day: string) => `ការសាកល្បងឥតគិតថ្លៃរបស់អ្នកបានបញ្ចប់។ សូមបង់ត្រឹម ${day} ដើម្បីបន្តទទួលការកុម្ម៉ង់។`,
  },
  planOverdue: {
    en: (day: string) => `Your plan has ended. Pay by ${day} to keep taking orders.`,
    km: (day: string) => `គម្រោងរបស់អ្នកបានបញ្ចប់។ សូមបង់ត្រឹម ${day} ដើម្បីបន្តទទួលការកុម្ម៉ង់។`,
  },
  planStopped: {
    en: 'Not taking new orders. Tap to pay and reopen.',
    km: 'មិនទទួលការកុម្ម៉ង់ថ្មីទេ។ ចុចដើម្បីបង់ ហើយបើកវិញ។',
  },
  // The seller said "I've paid": Oak Order checks.
  planClaimed: {
    en: 'Oak Order is checking your payment.',
    km: 'Oak Order កំពុងពិនិត្យការបង់ប្រាក់របស់អ្នក។',
  },
  // Paying is the owner's.
  planStoppedStaff: {
    en: 'No new orders until the owner pays for Oak Order.',
    km: 'មិនទទួលការកុម្ម៉ង់ថ្មី រហូតដល់ម្ចាស់ហាងបង់ឱ្យ Oak Order។',
  },
  // Settings → Delivery never saved: the shop delivers for free.
  deliveryNotSet: {
    en: 'Delivery is free until you set a fee. Tap to set it.',
    km: 'ការដឹកឥតគិតថ្លៃ រហូតដល់អ្នកកំណត់ថ្លៃដឹក។ ចុចដើម្បីកំណត់។',
  },
  deliveryNotSetStaff: {
    en: "Delivery is free: the owner hasn't set a fee yet.",
    km: 'ការដឹកឥតគិតថ្លៃ៖ ម្ចាស់ហាងមិនទាន់កំណត់ថ្លៃដឹក។',
  },
  // The list's days.
  today: { en: 'Today', km: 'ថ្ងៃនេះ' },
  yesterday: { en: 'Yesterday', km: 'ម្សិលមិញ' },
  // A row's second line, after what was bought.
  rowNumberTime: { en: (n: number, time: string) => `#${n} · ${time}`, km: (n: number, time: string) => `#${n} · ${time}` },
  // Laptops: the list beside an empty space for the order.
  pickOrder: { en: 'Choose an order to see it here.', km: 'ជ្រើសរើសការកុម្ម៉ង់ ដើម្បីមើលវានៅទីនេះ។' },
  // At the top of a closed order, in place of the To do card.
  closedNote: {
    rejected: {
      en: 'You rejected this order. Items went back to stock.',
      km: 'អ្នកបានបដិសេធការកុម្ម៉ង់នេះ។ ទំនិញបានត្រឡប់ចូលស្តុកវិញ។',
    },
    cancelled: {
      en: 'Order cancelled. Items went back to stock.',
      km: 'ការកុម្ម៉ង់នេះត្រូវបានលុបចោល។ ទំនិញបានត្រឡប់ចូលស្តុកវិញ។',
    },
  },
  // The card at the top of an order: a row per status, each with its own
  // buttons (founder's pick 1A, 2026-10-15).
  statuses: { en: 'Where the order stands', km: 'ស្ថានភាពការកុម្ម៉ង់' },
  // The order's own steps between Accept and Complete.
  // The optional steps, folded behind one link (UX check #14, 2026-10-17).
  tellStep: { en: 'Tell the customer a step', km: 'ប្រាប់អតិថិជនពីជំហាន' },
  // The ⋯ menu at the top: cancel, failed, not paid after all.
  more: { en: (n: number) => `More for order #${n}`, km: (n: number) => `ផ្សេងទៀតសម្រាប់ការកុម្ម៉ង់ #${n}` },
  // One tap on a cash-on-delivery order: delivered (or collected) and the
  // cash in hand, recorded together.
  cashHandover: { en: 'Delivered, cash received', km: 'បានដល់ដៃ និងបានទទួលសាច់ប្រាក់' },
  collectedCash: { en: 'Collected, cash received', km: 'បានមកយក និងបានទទួលសាច់ប្រាក់' },
  // An order that came by chat, added by the seller (founder's pick 3A).
  newOrder: {
    button: { en: 'New order', km: 'ការកុម្ម៉ង់ថ្មី' },
    title: { en: 'New order from a chat', km: 'ការកុម្ម៉ង់ថ្មីពីឆាត' },
    customer: { en: 'Customer', km: 'អតិថិជន' },
    phone: { en: 'Phone number', km: 'លេខទូរស័ព្ទ' },
    name: { en: 'Name', km: 'ឈ្មោះ' },
    known: {
      en: (n: number) => (n === 1 ? 'Ordered once before' : `Ordered ${n} times before`),
      km: (n: number) => `ធ្លាប់កុម្ម៉ង់ ${n} ដង`,
    },
    items: { en: 'Items', km: 'ទំនិញ' },
    findProduct: { en: 'Find a product', km: 'ស្វែងរកទំនិញ' },
    noProducts: { en: 'No products match.', km: 'គ្មានទំនិញដែលត្រូវគ្នាទេ។' },
    pickOption: { en: 'Choose an option:', km: 'ជ្រើសរើសជម្រើស៖' },
    left: { en: (n: number) => `${n} left`, km: (n: number) => `នៅសល់ ${n}` },
    soldOut: { en: 'Sold out', km: 'អស់ស្តុក' },
    noItems: { en: 'Add at least one product.', km: 'សូមបន្ថែមទំនិញយ៉ាងហោចណាស់មួយ។' },
    remove: { en: (name: string) => `Remove ${name}`, km: (name: string) => `ដក ${name} ចេញ` },
    fewer: { en: 'One fewer', km: 'តិចមួយ' },
    more: { en: 'One more', km: 'ច្រើនមួយ' },
    delivery: { en: 'Delivery', km: 'ការដឹកជញ្ជូន' },
    address: { en: 'Address', km: 'អាសយដ្ឋាន' },
    addressNote: { en: 'Note for the driver (optional)', km: 'ចំណាំសម្រាប់អ្នកដឹក (មិនចាំបាច់)' },
    payment: { en: 'Payment', km: 'ការបង់ប្រាក់' },
    note: { en: 'Note (optional)', km: 'ចំណាំ (មិនចាំបាច់)' },
    save: { en: 'Save order', km: 'រក្សាទុកការកុម្ម៉ង់' },
    saved: { en: (n: number) => `Order #${n} saved`, km: (n: number) => `បានរក្សាទុកការកុម្ម៉ង់ #${n}` },
  },
  // On an order the seller added from a chat.
  fromChat: { en: 'Added by you from a chat', km: 'អ្នកបានបន្ថែមពីឆាត' },
  copyOrderLink: { en: 'Copy link for the customer', km: 'ចម្លងតំណសម្រាប់អតិថិជន' },
  orderLinkCopied: {
    en: 'Link copied. Send it to the customer to follow and pay.',
    km: 'បានចម្លងតំណ។ ផ្ញើវាទៅអតិថិជន ដើម្បីតាមដាន និងបង់ប្រាក់។',
  },
  // Delivery card: the order typed out for the driver (founder's pick 5B).
  sendToDriver: { en: 'Send to driver', km: 'ផ្ញើទៅអ្នកដឹក' },
  driverCopied: {
    en: "Copied. Paste it in the driver's chat.",
    km: 'បានចម្លង។ សូមបិទភ្ជាប់ក្នុងឆាតរបស់អ្នកដឹក។',
  },
  driverCopyFailed: { en: "Couldn't copy the message.", km: 'ចម្លងសារមិនបាន។' },
  // Send to driver also records who's delivering (founder's pick 4A).
  send: { en: 'Send', km: 'ផ្ញើ' },
  saveWithoutSending: { en: 'Save without sending', km: 'រក្សាទុកដោយមិនផ្ញើ' },
  sendAgain: { en: 'Send again', km: 'ផ្ញើម្ដងទៀត' },
  driver: {
    title: {
      en: (number: number, shop: string | null) => `🛵 Delivery${shop ? ` for ${shop}` : ''} · Order #${number}`,
      km: (number: number, shop: string | null) => `🛵 ដឹកជូន${shop ? `ហាង ${shop}` : ''} · ការកុម្ម៉ង់ #${number}`,
    },
    customer: { en: '👤 Customer: ', km: '👤 អតិថិជន៖ ' },
    phone: { en: '📞 Phone: ', km: '📞 លេខទូរស័ព្ទ៖ ' },
    address: { en: '📍 Address: ', km: '📍 អាសយដ្ឋាន៖ ' },
    noAddress: {
      en: '📍 Address: none given, call the customer',
      km: '📍 អាសយដ្ឋាន៖ មិនមាន សូមហៅទូរស័ព្ទទៅអតិថិជន',
    },
    map: { en: '🗺️ Map: ', km: '🗺️ ផែនទី៖ ' },
    note: { en: '📝 Note: ', km: '📝 ចំណាំ៖ ' },
    items: {
      en: (n: number) => `📦 ${n} ${n === 1 ? 'item' : 'items'}:`,
      km: (n: number) => `📦 ទំនិញ ${n}៖`,
    },
    collect: {
      en: (amount: string) => `💵 COLLECT ${amount} CASH`,
      km: (amount: string) => `💵 ប្រមូលសាច់ប្រាក់ ${amount}`,
    },
    /** How the cash adds up, so the driver can explain it at the door. */
    breakdown: {
      en: (items: string, discount: string | null, delivery: string) =>
        `(items ${items}${discount ? ` − discount ${discount}` : ''} + delivery ${delivery})`,
      km: (items: string, discount: string | null, delivery: string) =>
        `(ទំនិញ ${items}${discount ? ` − បញ្ចុះតម្លៃ ${discount}` : ''} + ថ្លៃដឹក ${delivery})`,
    },
    paid: { en: '✅ PAID ALREADY: collect nothing', km: '✅ បានបង់រួចហើយ៖ មិនត្រូវប្រមូលប្រាក់ទេ' },
    payingBy: {
      en: (method: string) => `✅ Paying by ${method}: collect nothing`,
      km: (method: string) => `✅ បង់តាម ${method}៖ មិនត្រូវប្រមូលប្រាក់ទេ`,
    },
    shopPhone: {
      en: (phone: string) => `A problem? Call the shop: ${phone}`,
      km: (phone: string) => `មានបញ្ហា? ហៅទូរស័ព្ទមកហាង៖ ${phone}`,
    },
  },
  // Delivery card: the steps in between, for those who use them.
  filterLabel: { en: 'Filter orders', km: 'ច្រោះការកុម្ម៉ង់' },
  filter: {
    all: { en: 'All', km: 'ទាំងអស់' },
    new: { en: 'New', km: 'ថ្មី' },
    active: { en: 'In progress', km: 'កំពុងដំណើរការ' },
    // Names that fit what's inside: delivered and completed; rejected and
    // cancelled (UX check #25, 2026-10-17).
    done: { en: 'Done', km: 'រួចរាល់' },
    closed: { en: 'Closed', km: 'បានបិទ' },
  },
  emptyTitle: { en: 'No orders yet', km: 'មិនទាន់មានការកុម្ម៉ង់នៅឡើយ' },
  emptyText: {
    en: 'Share your shop link. New orders show up here.',
    km: 'ចែករំលែកតំណហាងរបស់អ្នក។ ការកុម្ម៉ង់ថ្មីនឹងបង្ហាញនៅទីនេះ។',
  },
  viewShop: { en: 'View your shop', km: 'មើលហាងរបស់អ្នក' },
  // No orders and no products yet: products come first.
  noProductsTitle: { en: 'Add your first product', km: 'បន្ថែមទំនិញដំបូងរបស់អ្នក' },
  noProductsText: {
    en: 'Add products, then share your shop link.',
    km: 'បន្ថែមទំនិញ រួចចែករំលែកតំណហាងរបស់អ្នក។',
  },
  noneHereTitle: { en: 'No orders here', km: 'គ្មានការកុម្ម៉ង់នៅទីនេះទេ' },
  noneHereText: {
    en: 'Orders move between lists as you update them.',
    km: 'ការកុម្ម៉ង់ផ្លាស់ពីបញ្ជីមួយទៅបញ្ជីមួយ នៅពេលអ្នកប្ដូរស្ថានភាពវា។',
  },
  showMore: { en: 'Show more', km: 'បង្ហាញបន្ថែម' },
  items: {
    en: (n: number) => `${n} ${n === 1 ? 'item' : 'items'}`,
    km: (n: number) => `ទំនិញ ${n}`,
  },

  // The buttons for moving an order to each status.
  action: {
    accepted: { en: 'Accept', km: 'ទទួល' },
    processing: { en: 'Start preparing', km: 'ចាប់ផ្ដើមរៀបចំ' },
    ready: { en: 'Mark ready', km: 'រៀបចំរួចរាល់' },
    shipped: { en: 'Mark shipped', km: 'បានបញ្ចេញ' },
    delivered: { en: 'Mark delivered', km: 'បានដល់ដៃ' },
    completed: { en: 'Complete', km: 'បញ្ចប់' },
    rejected: { en: 'Reject', km: 'បដិសេធ' },
    cancelled: { en: 'Cancel order', km: 'លុបចោលការកុម្ម៉ង់' },
  },
  rejectTitle: { en: (n: number) => `Reject order #${n}?`, km: (n: number) => `បដិសេធការកុម្ម៉ង់ #${n}?` },
  cancelTitle: { en: (n: number) => `Cancel order #${n}?`, km: (n: number) => `លុបចោលការកុម្ម៉ង់ #${n}?` },
  rejectMessage: {
    en: "Items go back to stock. The customer sees it wasn't accepted. Can't be undone.",
    km: 'ទំនិញត្រឡប់ចូលស្តុកវិញ។ អតិថិជននឹងឃើញថាមិនត្រូវបានទទួល។ មិនអាចត្រឡប់វិញបានទេ។',
  },
  // Added to the Reject / Cancel question when money came in (UX check #21).
  sendMoneyBack: {
    en: (amount: string) => `It's paid (${amount}): send the money back.`,
    km: (amount: string) => `បានបង់រួចហើយ (${amount})៖ សូមផ្ញើប្រាក់ត្រឡប់វិញ។`,
  },
  saysPaidMoneyBack: {
    en: (name: string, amount: string) => `${name} says they paid ${amount}: if it came, send it back.`,
    km: (name: string, amount: string) =>
      `${name} ថាបានបង់ ${amount}៖ បើបានទទួល សូមផ្ញើប្រាក់ត្រឡប់វិញ។`,
  },
  cancelMessage: {
    en: "Items go back to stock. The customer sees it was cancelled. Can't be undone.",
    km: 'ទំនិញត្រឡប់ចូលស្តុកវិញ។ អតិថិជននឹងឃើញថាត្រូវបានលុបចោល។ មិនអាចត្រឡប់វិញបានទេ។',
  },
  rejectConfirm: { en: 'Reject order', km: 'បដិសេធការកុម្ម៉ង់' },
  cancelConfirm: { en: 'Cancel order', km: 'លុបចោលការកុម្ម៉ង់' },
  // Toast after a change: "Order #1001: Accepted".
  // After Accept the order stays open, with a way on to the next new one
  // (UX check #6, 2026-10-17).
  acceptedMore: {
    en: (n: number) => (n === 1 ? 'Accepted. 1 more new order' : `Accepted. ${n} more new orders`),
    km: (n: number) => `បានទទួល។ នៅមានការកុម្ម៉ង់ថ្មី ${n} ទៀត`,
  },
  nextOrder: { en: 'Next', km: 'បន្ទាប់' },
  changed: {
    en: (n: number, what: string) => `Order #${n}: ${what}`,
    km: (n: number, what: string) => `ការកុម្ម៉ង់ #${n}៖ ${what}`,
  },
  placed: { en: (time: string) => `Placed ${time}`, km: (time: string) => `កុម្ម៉ង់នៅ ${time}` },
  cameThrough: {
    en: (source: string) => `Came through your ${source} link`,
    km: (source: string) => `មកតាមតំណ ${source} របស់អ្នក`,
  },
  // Above the items: the customer's note as a message from them (founder's
  // pick 7A, with this label), or the seller's own on an order from a chat.
  customerNote: { en: 'Note from the customer', km: 'ចំណាំពីអតិថិជន' },
  yourNote: { en: 'Your note', km: 'ចំណាំរបស់អ្នក' },
  customer: { en: 'Customer', km: 'អតិថិជន' },
  viewCustomer: { en: 'View customer', km: 'មើលអតិថិជន' },
  // The customer shared their Telegram number for updates (2026-10-15).
  phoneConfirmed: { en: 'Phone confirmed in Telegram', km: 'លេខនេះបានផ្ទៀងផ្ទាត់ក្នុង Telegram' },
  telegramPhone: {
    en: "Their Telegram number, not the order's",
    km: 'លេខ Telegram របស់គាត់ មិនមែនលេខក្នុងការកុម្ម៉ង់ទេ',
  },
  // "Message on Telegram" (founder's pick 2026-10-20): Oak's bot sends it to
  // a customer who gets updates there, with a button to reply to the shop's
  // own Telegram (or Messenger). Ready messages fill the box, to change.
  messageOnTelegram: { en: 'Message on Telegram', km: 'ផ្ញើសារតាម Telegram' },
  messageTitle: { en: (name: string) => `Message ${name}`, km: (name: string) => `ផ្ញើសារទៅ ${name}` },
  messageLabel: { en: 'Message', km: 'សារ' },
  readyMessages: { en: 'Ready messages', km: 'សារស្រាប់' },
  ready: {
    cantReach: {
      label: { en: "Can't reach you", km: 'ទាក់ទងមិនបាន' },
      text: {
        en: (phone: string) => `We couldn't reach you on ${phone}. Please send us your right number.`,
        km: (phone: string) => `យើងទាក់ទងអ្នកតាមលេខ ${phone} មិនបានទេ។ សូមផ្ញើលេខត្រឹមត្រូវរបស់អ្នកមកយើង។`,
      },
    },
    driverNear: {
      label: { en: 'Driver is near', km: 'អ្នកដឹកជិតដល់' },
      text: {
        en: 'The driver is near your address. Please answer your phone.',
        km: 'អ្នកដឹកជិតដល់អាសយដ្ឋានរបស់អ្នកហើយ។ សូមលើកទូរស័ព្ទ។',
      },
    },
  },
  // Without the shop's Telegram or Messenger the customer can't answer.
  noReplyWay: {
    en: 'Add your Telegram in Settings → Contact so they can reply.',
    km: 'បញ្ចូល Telegram របស់អ្នកក្នុង ការកំណត់ → ទំនាក់ទំនង ដើម្បីឱ្យគាត់ឆ្លើយតបបាន។',
  },
  messageSent: { en: 'Sent on Telegram', km: 'បានផ្ញើតាម Telegram' },
  deliverTo: { en: 'Deliver to', km: 'ដឹកទៅ' },
  note: { en: 'Note: ', km: 'ចំណាំ៖ ' },
  openMaps: { en: 'Open in Google Maps', km: 'បើកក្នុង Google Maps' },

  payment: { en: 'Payment', km: 'ការបង់ប្រាក់' },
  markedPaid: { en: (time: string) => `Marked paid ${time}`, km: (time: string) => `បានកត់ថាបង់ ${time}` },
  failTitle: { en: 'Mark the payment as failed?', km: 'កត់ថាការបង់ប្រាក់មិនបានសម្រេច?' },
  failMessage: {
    en: "If the customer didn't pay or the money never came. You can undo this later.",
    km: 'បើអតិថិជនមិនបានបង់ ឬប្រាក់មិនបានមកដល់។ អ្នកអាចប្ដូរវាវិញនៅពេលក្រោយ។',
  },
  paymentFailed: { en: 'Payment failed', km: 'បង់ប្រាក់មិនបាន' },
  // A recorded payment back to not paid, at any time (founder's pick 2C).
  notPaidAfterAll: { en: 'Not paid after all', km: 'តាមពិតមិនទាន់បង់ទេ' },
  // The payment's status line once the customer tapped "I've paid", in
  // place of "Unpaid" (UX check #5, 2026-10-17).
  saysPaidAt: {
    en: (time: string) => `Says paid at ${time}`,
    km: (time: string) => `អតិថិជនថាបានបង់នៅ ${time}`,
  },
  checkBankFor: {
    en: (amount: string) => `Check your bank app for ${amount}.`,
    km: (amount: string) => `សូមពិនិត្យកម្មវិធីធនាគាររបស់អ្នក រក ${amount}។`,
  },
  backToNotPaid: { en: 'Back to not paid', km: 'ប្ដូរទៅមិនទាន់បង់វិញ' },
  // "Not paid after 24 h" (founder's pick 2026-10-20): Cancel order is the
  // next step, after a look in the bank app.
  unpaidLongHint: {
    en: 'Check your bank app before you cancel.',
    km: 'សូមពិនិត្យកម្មវិធីធនាគាររបស់អ្នក មុនពេលលុបចោល។',
  },
  // A failed payment is the order's next step (UX check #7, 2026-10-17).
  paymentFailedHint: {
    en: 'Ask the customer to pay again, or cancel the order.',
    km: 'សុំឱ្យអតិថិជនបង់ម្ដងទៀត ឬលុបចោលការកុម្ម៉ង់។',
  },
  // Under the delivery's buttons while a KHQR or bank payment is still due.
  notPaidYet: { en: 'Not paid yet', km: 'មិនទាន់បង់' },
  unpayTitle: { en: (n: number) => `Mark order #${n} as not paid?`, km: (n: number) => `កត់ការកុម្ម៉ង់ #${n} ថាមិនទាន់បង់?` },
  unpayMessage: {
    en: 'If you marked it by mistake or the money never came. The customer is asked to pay again.',
    km: 'បើអ្នកកត់ខុស ឬប្រាក់មិនបានមកដល់។ អតិថិជននឹងត្រូវបង់ម្ដងទៀត។',
  },
  unpayConfirm: { en: 'Mark not paid', km: 'កត់ថាមិនទាន់បង់' },
  unpaidToast: { en: 'not paid', km: 'មិនទាន់បង់' },
  paidToast: { en: 'paid', km: 'បានបង់' },
  failedToast: { en: 'payment failed', km: 'បង់ប្រាក់មិនបាន' },
  noteOptional: { en: 'Note (optional)', km: 'ចំណាំ (មិនចាំបាច់)' },
  noteHintTransfer: {
    en: 'E.g. ABA, 2:05 PM, last digits 123.',
    km: 'ឧ. ABA, ម៉ោង 2:05 PM, លេខខាងចុង 123។',
  },
  confirmPaid: { en: 'Confirm paid', km: 'បញ្ជាក់ថាបានបង់' },
  cashReceived: { en: 'Cash received', km: 'បានទទួលសាច់ប្រាក់' },
  // A delivered cash order: record the cash and complete in one tap (UX
  // check #8, 2026-10-17); without the cash is in the ⋯ menu.
  cashAndComplete: { en: 'Cash received, complete', km: 'បានទទួលសាច់ប្រាក់ ហើយបញ្ចប់' },
  // A paid order: delivered (or collected) and complete in one tap (UX
  // check #15, 2026-10-17).
  deliveredComplete: { en: 'Delivered, complete', km: 'បានដល់ដៃ ហើយបញ្ចប់' },
  collectedComplete: { en: 'Collected, complete', km: 'បានមកយក ហើយបញ្ចប់' },
  completeWithoutCash: { en: 'Complete without the cash', km: 'បញ្ចប់ ដោយមិនទាន់ទទួលសាច់ប្រាក់' },
  markPaid: { en: 'Mark paid', km: 'កត់ថាបានបង់' },

  delivery: { en: 'Delivery', km: 'ការដឹកជញ្ជូន' },
  customerCollects: { en: 'The customer collects it', km: 'អតិថិជនមកយកដោយខ្លួនឯង' },
  sendWith: { en: (courier: string) => `Send with ${courier}`, km: (courier: string) => `ផ្ញើតាម ${courier}` },
  ownDelivery: { en: 'Your own delivery', km: 'ដឹកដោយខ្លួនឯង' },
  // The customer left the courier to the shop (founder, 2026-10-18).
  driverOrCourier: { en: 'Your driver or a courier', km: 'អ្នកដឹករបស់អ្នក ឬក្រុមហ៊ុនដឹក' },
  sendWithLabel: { en: 'Send with', km: 'ផ្ញើតាម' },
  yourDriver: { en: 'Your driver', km: 'អ្នកដឹករបស់អ្នក' },
  // Before who has it: one label each (UX check #13).
  delivering: { en: 'Driver: ', km: 'អ្នកដឹក៖ ' },
  tracking: { en: 'Tracking: ', km: 'លេខតាមដាន៖ ' },
  // A courier's sheet: the tracking number, Save first, sharing second.
  trackingNumber: { en: 'Tracking number (optional)', km: 'លេខតាមដាន (មិនចាំបាច់)' },
  trackingHint: {
    en: (courier: string) => `From ${courier}'s receipt. Only you see this.`,
    km: (courier: string) => `ពីបង្កាន់ដៃរបស់ ${courier}។ មានតែអ្នកទេដែលឃើញ។`,
  },
  saveSentWith: {
    en: (courier: string) => `Save: sent with ${courier}`,
    km: (courier: string) => `រក្សាទុក៖ បានផ្ញើតាម ${courier}`,
  },
  shareDetails: { en: 'Share the details', km: 'ចែករំលែកព័ត៌មាន' },
  driverNote: {
    en: "Driver's name and phone number (optional)",
    km: 'ឈ្មោះ និងលេខទូរស័ព្ទអ្នកដឹក (មិនចាំបាច់)',
  },
  driverNoteHint: {
    en: 'E.g. Sokha, 012 999 888. Only you see this.',
    km: 'ឧ. សុខា, 012 999 888។ មានតែអ្នកទេដែលឃើញ។',
  },
} satisfies Tree
