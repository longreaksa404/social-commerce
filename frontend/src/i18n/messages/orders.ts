import type { Tree } from '../core.ts'

/** The seller's Orders tab and an order's page. */
export const orders = {
  title: { en: 'Orders', km: 'ការកុម្ម៉ង់' },
  order: { en: 'Order', km: 'ការកុម្ម៉ង់' },
  // The shop isn't taking orders (Settings → Orders).
  paused: {
    en: "Your shop isn't taking orders. Tap to turn them back on.",
    km: 'ហាងរបស់អ្នកមិនទទួលការកុម្ម៉ង់ទេ។ ចុចដើម្បីបើកវិញ។',
  },
  // Staff can't turn it back on (Settings is the owner's).
  pausedStaff: { en: "The shop isn't taking orders right now.", km: 'ហាងមិនទទួលការកុម្ម៉ង់នៅពេលនេះទេ។' },
  pausedUntil: {
    en: (day: string) => `Your shop isn't taking orders until ${day}.`,
    km: (day: string) => `ហាងរបស់អ្នកមិនទទួលការកុម្ម៉ង់រហូតដល់ ${day}។`,
  },
  // Settings → Delivery never saved: the shop delivers for free.
  deliveryNotSet: {
    en: 'Delivery is free for customers until you set your delivery fee. Tap to set it.',
    km: 'ការដឹកគឺឥតគិតថ្លៃសម្រាប់អតិថិជន រហូតដល់អ្នកកំណត់ថ្លៃដឹក។ ចុចដើម្បីកំណត់។',
  },
  deliveryNotSetStaff: {
    en: "Delivery is free for customers: the shop's owner hasn't set a delivery fee yet.",
    km: 'ការដឹកគឺឥតគិតថ្លៃសម្រាប់អតិថិជន៖ ម្ចាស់ហាងមិនទាន់កំណត់ថ្លៃដឹកនៅឡើយ។',
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
      en: 'You rejected this order. Its items went back into stock.',
      km: 'អ្នកបានបដិសេធការកុម្ម៉ង់នេះ។ ទំនិញបានត្រឡប់ចូលស្តុកវិញ។',
    },
    cancelled: {
      en: 'This order was cancelled. Its items went back into stock.',
      km: 'ការកុម្ម៉ង់នេះត្រូវបានលុបចោល។ ទំនិញបានត្រឡប់ចូលស្តុកវិញ។',
    },
  },
  // The card at the top of an order: what to do next.
  todo: {
    label: { en: 'To do', km: 'ត្រូវធ្វើ' },
    accept: { en: 'New order: accept or reject', km: 'ការកុម្ម៉ង់ថ្មី៖ ទទួល ឬបដិសេធ' },
    next: { en: 'Next step', km: 'ជំហានបន្ទាប់' },
    payment: { en: 'Check the payment, then mark it paid', km: 'ពិនិត្យការបង់ប្រាក់ រួចកត់ថាបានបង់' },
    cash: { en: 'Mark the cash as received when you get it', km: 'កត់ថាបានទទួលសាច់ប្រាក់ ពេលអ្នកទទួលបាន' },
    driver: { en: 'Assign a driver', km: 'ចាត់អ្នកដឹក' },
    delivery: { en: 'Update the delivery', km: 'ធ្វើបច្ចុប្បន្នភាពការដឹកជញ្ជូន' },
    // The short path (founder's pick 1C, 2026-10-09).
    ready: { en: 'Ready to complete', km: 'រួចរាល់សម្រាប់បញ្ចប់' },
    deliver: { en: 'Next: deliver it', km: 'បន្ទាប់៖ ដឹកជូនអតិថិជន' },
    collect: { en: 'Next: the customer collects it', km: 'បន្ទាប់៖ អតិថិជនមកយក' },
    optional: {
      en: 'Steps customers can follow (optional)',
      km: 'ជំហានដែលអតិថិជនអាចតាមដាន (មិនចាំបាច់)',
    },
  },
  // One tap on a cash-on-delivery order: delivered (or collected) and the
  // cash in hand, recorded together.
  cashHandover: { en: 'Delivered, cash received', km: 'បានដល់ដៃ និងបានទទួលសាច់ប្រាក់' },
  collectedCash: { en: 'Collected, cash received', km: 'បានមកយក និងបានទទួលសាច់ប្រាក់' },
  // Delivery card: the steps in between, for those who use them.
  moreSteps: { en: 'More steps (optional)', km: 'ជំហានបន្ថែម (មិនចាំបាច់)' },
  filterLabel: { en: 'Filter orders', km: 'ច្រោះការកុម្ម៉ង់' },
  filter: {
    all: { en: 'All', km: 'ទាំងអស់' },
    new: { en: 'New', km: 'ថ្មី' },
    active: { en: 'In progress', km: 'កំពុងដំណើរការ' },
    done: { en: 'Delivered', km: 'បានដល់ដៃ' },
    closed: { en: 'Cancelled', km: 'បានលុបចោល' },
  },
  emptyTitle: { en: 'No orders yet', km: 'មិនទាន់មានការកុម្ម៉ង់នៅឡើយ' },
  emptyText: {
    en: 'Share your shop link on Facebook, TikTok, or Telegram. Orders customers place show up here.',
    km: 'ចែករំលែកតំណហាងរបស់អ្នកនៅលើ Facebook, TikTok ឬ Telegram។ ការកុម្ម៉ង់ពីអតិថិជននឹងបង្ហាញនៅទីនេះ។',
  },
  openShop: { en: 'Open your shop', km: 'បើកហាងរបស់អ្នក' },
  // No orders and no products yet: products come first.
  noProductsTitle: { en: 'Add your first product', km: 'បន្ថែមទំនិញដំបូងរបស់អ្នក' },
  noProductsText: {
    en: 'Customers can order once your shop has products. Then share your shop link on Facebook, TikTok, or Telegram, and orders show up here.',
    km: 'អតិថិជនអាចកុម្ម៉ង់បាន នៅពេលហាងរបស់អ្នកមានទំនិញ។ បន្ទាប់មក ចែករំលែកតំណហាងរបស់អ្នកនៅលើ Facebook, TikTok ឬ Telegram ហើយការកុម្ម៉ង់នឹងបង្ហាញនៅទីនេះ។',
  },
  noneHereTitle: { en: 'No orders here', km: 'គ្មានការកុម្ម៉ង់នៅទីនេះទេ' },
  noneHereText: {
    en: 'Orders move between these lists as you update them.',
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
    en: "Its items go back into stock, and the customer sees it was not accepted on their order page. This can't be undone.",
    km: 'ទំនិញនឹងត្រឡប់ចូលស្តុកវិញ ហើយអតិថិជននឹងឃើញថាការកុម្ម៉ង់មិនត្រូវបានទទួល នៅលើទំព័រការកុម្ម៉ង់របស់គេ។ មិនអាចត្រឡប់វិញបានទេ។',
  },
  cancelMessage: {
    en: "Its items go back into stock, and the customer sees it was cancelled on their order page. This can't be undone.",
    km: 'ទំនិញនឹងត្រឡប់ចូលស្តុកវិញ ហើយអតិថិជននឹងឃើញថាការកុម្ម៉ង់ត្រូវបានលុបចោល នៅលើទំព័រការកុម្ម៉ង់របស់គេ។ មិនអាចត្រឡប់វិញបានទេ។',
  },
  rejectConfirm: { en: 'Reject order', km: 'បដិសេធការកុម្ម៉ង់' },
  cancelConfirm: { en: 'Cancel order', km: 'លុបចោលការកុម្ម៉ង់' },
  // Toast after a change: "Order #1001: Accepted".
  changed: {
    en: (n: number, what: string) => `Order #${n}: ${what}`,
    km: (n: number, what: string) => `ការកុម្ម៉ង់ #${n}៖ ${what}`,
  },
  placed: { en: (time: string) => `Placed ${time}`, km: (time: string) => `កុម្ម៉ង់នៅ ${time}` },
  cameThrough: {
    en: (source: string) => `Came through your ${source} link`,
    km: (source: string) => `មកតាមតំណ ${source} របស់អ្នក`,
  },
  noteFromCustomer: { en: 'Note from the customer: ', km: 'ចំណាំពីអតិថិជន៖ ' },
  customer: { en: 'Customer', km: 'អតិថិជន' },
  viewCustomer: { en: 'View customer', km: 'មើលអតិថិជន' },
  deliverTo: { en: 'Deliver to', km: 'ដឹកទៅ' },
  note: { en: 'Note: ', km: 'ចំណាំ៖ ' },
  openMaps: { en: 'Open in Google Maps', km: 'បើកក្នុង Google Maps' },

  payment: { en: 'Payment', km: 'ការបង់ប្រាក់' },
  markedPaid: { en: (time: string) => `Marked paid ${time}`, km: (time: string) => `បានកត់ថាបង់ ${time}` },
  waitsForPayment: {
    en: 'Mark it paid to complete this order.',
    km: 'សូមកត់ថាបានបង់ ដើម្បីបញ្ចប់ការកុម្ម៉ង់នេះ។',
  },
  failTitle: { en: 'Mark the payment as failed?', km: 'កត់ថាការបង់ប្រាក់មិនបានសម្រេច?' },
  failMessage: {
    en: "Use this when the customer didn't pay, or the transfer never arrived. You can put it back to not paid later.",
    km: 'ប្រើវានៅពេលអតិថិជនមិនបានបង់ ឬប្រាក់ផ្ទេរមិនដែលមកដល់។ អ្នកអាចប្ដូរវាទៅជាមិនទាន់បង់វិញនៅពេលក្រោយ។',
  },
  paymentFailed: { en: 'Payment failed', km: 'បង់ប្រាក់មិនបាន' },
  // A recorded payment back to not paid, at any time (founder's pick 2C).
  notPaidAfterAll: { en: 'Not paid after all', km: 'តាមពិតមិនទាន់បង់ទេ' },
  backToNotPaid: { en: 'Back to not paid', km: 'ប្ដូរទៅមិនទាន់បង់វិញ' },
  unpayTitle: { en: (n: number) => `Mark order #${n} as not paid?`, km: (n: number) => `កត់ការកុម្ម៉ង់ #${n} ថាមិនទាន់បង់?` },
  unpayMessage: {
    en: 'Use this if you marked it by mistake, or the money never arrived. The customer is shown how to pay again; the order and its delivery stay as they are.',
    km: 'ប្រើវាប្រសិនបើអ្នកកត់ខុស ឬប្រាក់មិនដែលមកដល់។ អតិថិជននឹងឃើញរបៀបបង់ម្ដងទៀត ហើយការកុម្ម៉ង់ និងការដឹកជញ្ជូននៅដដែល។',
  },
  unpayConfirm: { en: 'Mark not paid', km: 'កត់ថាមិនទាន់បង់' },
  unpaidToast: { en: 'not paid', km: 'មិនទាន់បង់' },
  paidToast: { en: 'paid', km: 'បានបង់' },
  failedToast: { en: 'payment failed', km: 'បង់ប្រាក់មិនបាន' },
  noteOptional: { en: 'Note (optional)', km: 'ចំណាំ (មិនចាំបាច់)' },
  noteHintCod: { en: 'For example, who collected the cash.', km: 'ឧទាហរណ៍ អ្នកណាជាអ្នកទទួលសាច់ប្រាក់។' },
  noteHintTransfer: {
    en: 'For example: ABA, 2:05 PM, last digits 123.',
    km: 'ឧទាហរណ៍៖ ABA, ម៉ោង 2:05 PM, លេខខាងចុង 123។',
  },
  confirmCash: { en: 'Confirm cash received', km: 'បញ្ជាក់ថាបានទទួលសាច់ប្រាក់' },
  confirmPaid: { en: 'Confirm paid', km: 'បញ្ជាក់ថាបានបង់' },
  cashReceived: { en: 'Cash received', km: 'បានទទួលសាច់ប្រាក់' },
  markPaid: { en: 'Mark paid', km: 'កត់ថាបានបង់' },

  delivery: { en: 'Delivery', km: 'ការដឹកជញ្ជូន' },
  customerCollects: { en: 'The customer collects it', km: 'អតិថិជនមកយកដោយខ្លួនឯង' },
  sendWith: { en: (courier: string) => `Send with ${courier}`, km: (courier: string) => `ផ្ញើតាម ${courier}` },
  ownDelivery: { en: 'Your own delivery', km: 'ដឹកដោយខ្លួនឯង' },
  delivering: { en: 'Delivering: ', km: 'អ្នកដឹក៖ ' },
  waitsCollected: {
    en: 'Mark it collected to complete this order.',
    km: 'សូមកត់ថាអតិថិជនបានមកយក ដើម្បីបញ្ចប់ការកុម្ម៉ង់នេះ។',
  },
  waitsDelivered: {
    en: 'Mark the delivery delivered to complete this order.',
    km: 'សូមកត់ថាការដឹកបានដល់ដៃ ដើម្បីបញ្ចប់ការកុម្ម៉ង់នេះ។',
  },
  courierNote: {
    en: 'Courier branch or tracking number (optional)',
    km: 'សាខាក្រុមហ៊ុនដឹក ឬលេខតាមដាន (មិនចាំបាច់)',
  },
  driverNote: { en: "Who's delivering? (optional)", km: 'អ្នកណាជាអ្នកដឹក? (មិនចាំបាច់)' },
  courierNoteHint: {
    en: (courier: string) => `For example: ${courier} Takeo branch, no. 123456. Only you see this.`,
    km: (courier: string) => `ឧទាហរណ៍៖ ${courier} សាខាតាកែវ លេខ 123456។ មានតែអ្នកទេដែលឃើញ។`,
  },
  driverNoteHint: {
    en: 'For example: Sokha, 012 999 888. Only you see this.',
    km: 'ឧទាហរណ៍៖ សុខា, 012 999 888។ មានតែអ្នកទេដែលឃើញ។',
  },
} satisfies Tree
