import type { Tree } from '../core.ts'

/** The customer's shop: browsing, product page, cart. */
export const shop = {
  shopNotFound: { en: 'Shop not found', km: 'រកមិនឃើញហាង' },
  shopNotFoundText: {
    en: 'Check the link, or ask the seller to send it again.',
    km: 'សូមពិនិត្យតំណ ឬសុំឱ្យអ្នកលក់ផ្ញើវាម្ដងទៀត។',
  },
  // The seller turned orders off for a while (Settings → Orders).
  paused: {
    title: {
      en: "This shop isn't taking orders right now",
      km: 'ហាងនេះមិនទទួលការកុម្ម៉ង់នៅពេលនេះទេ',
    },
    until: {
      en: (day: string) => `Orders open again on ${day}. You can still look around.`,
      km: (day: string) => `នឹងទទួលការកុម្ម៉ង់វិញនៅថ្ងៃ ${day}។ អ្នកនៅតែអាចមើលទំនិញបាន។`,
    },
    noDate: {
      en: 'You can still look around, and ask the shop when it opens again.',
      km: 'អ្នកនៅតែអាចមើលទំនិញ ហើយសួរហាងថាពេលណាបើកវិញ។',
    },
  },
  // Asking the seller: Telegram, Messenger, a call (Settings → Contact).
  contact: {
    askTheSeller: { en: 'Ask the seller', km: 'សួរអ្នកលក់' },
    askOnMessenger: { en: 'Ask seller on Messenger', km: 'សួរអ្នកលក់តាម Messenger' },
    call: { en: (phone: string) => `Call ${phone}`, km: (phone: string) => `ហៅ ${phone}` },
    short: {
      telegram: { en: 'Telegram', km: 'Telegram' },
      messenger: { en: 'Messenger', km: 'Messenger' },
      phone: { en: 'Call', km: 'ហៅទូរស័ព្ទ' },
    },
    copied: {
      en: 'Your question is copied. Paste it in the chat.',
      km: 'បានចម្លងសំណួររបស់អ្នក។ សូមបិទភ្ជាប់វាក្នុងការជជែក។',
    },
  },
  cart: { en: 'Cart', km: 'កន្ត្រក' },
  cartWithCount: {
    en: (n: number) => `Cart, ${n} ${n === 1 ? 'item' : 'items'}`,
    km: (n: number) => `កន្ត្រក, ទំនិញ ${n}`,
  },
  categories: { en: 'Categories', km: 'ប្រភេទ' },
  all: { en: 'All', km: 'ទាំងអស់' },
  soldOut: { en: 'Sold out', km: 'អស់ស្តុក' },
  inStock: { en: 'In stock', km: 'មានស្តុក' },
  onlyLeft: { en: (n: number) => `Only ${n} left`, km: (n: number) => `នៅសល់តែ ${n} ទៀត` },
  noLongerAvailable: { en: 'No longer available', km: 'មិនមានទៀតទេ' },
  quantity: { en: 'Quantity', km: 'ចំនួន' },
  quantityOf: { en: (name: string) => `Quantity of ${name}`, km: (name: string) => `ចំនួន ${name}` },
  oneLess: { en: 'One less', km: 'បន្ថយមួយ' },
  oneMore: { en: 'One more', km: 'បន្ថែមមួយ' },
  seeAllProducts: { en: 'See all products', km: 'មើលទំនិញទាំងអស់' },
  // The + on a product photo in the grid (products without options).
  quickAdd: {
    en: (name: string, inCart: number) => (inCart ? `${name}: ${inCart} in cart. Add one more` : `Add ${name} to cart`),
    km: (name: string, inCart: number) =>
      inCart ? `${name}៖ មាន ${inCart} ក្នុងកន្ត្រក។ បន្ថែមមួយទៀត` : `ដាក់ ${name} ចូលកន្ត្រក`,
  },
  // The bar at the bottom of the shop while the cart has something in it.
  cartBar: {
    items: { en: (n: number) => (n === 1 ? '1 item' : `${n} items`), km: (n: number) => `ទំនិញ ${n}` },
    view: { en: 'View cart', km: 'មើលកន្ត្រក' },
  },

  home: {
    emptyTitle: { en: 'No products yet', km: 'មិនទាន់មានទំនិញនៅឡើយ' },
    emptyText: {
      en: "This shop hasn't added any products. Check back soon.",
      km: 'ហាងនេះមិនទាន់បានដាក់ទំនិញនៅឡើយទេ។ សូមត្រឡប់មកមើលម្ដងទៀតនៅពេលក្រោយ។',
    },
    showMore: { en: 'Show more', km: 'មើលបន្ថែម' },
    showLess: { en: 'Show less', km: 'បង្រួមវិញ' },
  },

  category: {
    notFoundTab: { en: (shop: string) => `Category not found · ${shop}`, km: (shop: string) => `រកមិនឃើញប្រភេទ · ${shop}` },
    notFoundTitle: { en: "This category doesn't exist", km: 'មិនមានប្រភេទនេះទេ' },
    notFoundText: { en: 'The shop may have renamed or removed it.', km: 'ហាងប្រហែលជាបានប្ដូរឈ្មោះ ឬលុបវាចោល។' },
    emptyTitle: { en: 'Nothing here right now', km: 'ពេលនេះមិនទាន់មានអ្វីនៅទីនេះទេ' },
    emptyText: {
      en: 'There are no products in this category at the moment.',
      km: 'ពេលនេះមិនមានទំនិញនៅក្នុងប្រភេទនេះទេ។',
    },
  },

  product: {
    notFoundTab: { en: (shop: string) => `Product not available · ${shop}`, km: (shop: string) => `ទំនិញមិនមាន · ${shop}` },
    notFoundTitle: { en: "This product isn't available", km: 'ទំនិញនេះមិនមានទៀតទេ' },
    notFoundText: {
      en: 'It may have been sold or removed. The shop may have something similar.',
      km: 'វាប្រហែលជាលក់អស់ ឬត្រូវបានដកចេញ។ ហាងប្រហែលជាមានទំនិញស្រដៀងគ្នា។',
    },
    details: { en: 'Details', km: 'ព័ត៌មានលម្អិត' },
    // The heading over the option buttons (size, colour, ...).
    chooseOption: { en: 'Choose an option', km: 'ជ្រើសរើស' },
    // On the Add to cart button until an option is chosen.
    chooseOptionFirst: { en: 'Choose an option', km: 'សូមជ្រើសរើសជាមុនសិន' },
    optionSoldOut: { en: ' (sold out)', km: ' (អស់ស្តុក)' },
    allInCart: { en: 'All in your cart', km: 'មានក្នុងកន្ត្រកអស់ហើយ' },
    addToCart: { en: 'Add to cart', km: 'ដាក់កន្ត្រក' },
    buyNow: { en: 'Buy now', km: 'ទិញឥឡូវនេះ' },
    added: { en: 'Added to your cart', km: 'បានដាក់កន្ត្រកហើយ' },
    viewCart: { en: (n: number) => `View cart (${n})`, km: (n: number) => `មើលកន្ត្រក (${n})` },
    askSeller: { en: 'Ask seller on Telegram', km: 'សួរអ្នកលក់តាម Telegram' },
    // Typed into the customer's Telegram chat with the seller.
    askSellerText: {
      en: (name: string, url: string) => `Hi! I'd like to ask about ${name}: ${url}`,
      km: (name: string, url: string) => `សួស្តី! ខ្ញុំចង់សួរអំពី ${name}៖ ${url}`,
    },
    photos: { en: 'Product photos', km: 'រូបថតទំនិញ' },
    photoOf: {
      en: (name: string, i: number, n: number) => `${name}, photo ${i} of ${n}`,
      km: (name: string, i: number, n: number) => `${name}, រូបទី ${i} នៃ ${n}`,
    },
    showPhoto: { en: (i: number) => `Show photo ${i}`, km: (i: number) => `បង្ហាញរូបទី ${i}` },
    previousPhoto: { en: 'Previous photo', km: 'រូបមុន' },
    nextPhoto: { en: 'Next photo', km: 'រូបបន្ទាប់' },
  },

  // How buying from the shop works, as tags on the shop and product pages:
  // what customers would otherwise ask in chat before ordering.
  info: {
    title: { en: 'Delivery and payment', km: 'ការដឹកជញ្ជូន និងការបង់ប្រាក់' },
    deliveryFee: { en: (fee: string) => `Delivery ${fee}`, km: (fee: string) => `ថ្លៃដឹក ${fee}` },
    freeDelivery: { en: 'Free delivery', km: 'ដឹកជូនឥតគិតថ្លៃ' },
    // A tag of its own beside "Delivery $1.50".
    freeOn: {
      en: (rules: string[]) => `Free delivery on ${rules.join(' or ')}`,
      km: (rules: string[]) => `ដឹកឥតគិតថ្លៃ សម្រាប់${rules.join(' ឬ ')}`,
    },
    pickup: { en: 'Free pickup', km: 'មកយកផ្ទាល់ ឥតគិតថ្លៃ' },
    discount: {
      en: (off: string, from: string) => `${off} off orders from ${from}`,
      km: (off: string, from: string) => `បញ្ចុះ ${off} សម្រាប់ការកុម្ម៉ង់ចាប់ពី ${from}`,
    },
  },

  cartPage: {
    tab: { en: (shop: string) => `Your cart · ${shop}`, km: (shop: string) => `កន្ត្រករបស់អ្នក · ${shop}` },
    emptyTitle: { en: 'Your cart is empty', km: 'កន្ត្រករបស់អ្នកនៅទទេ' },
    emptyText: {
      en: 'Add products from the shop, then come back here to order.',
      km: 'សូមដាក់ទំនិញពីហាងចូលកន្ត្រក រួចត្រឡប់មកទីនេះដើម្បីកុម្ម៉ង់។',
    },
    browse: { en: 'Browse products', km: 'មើលទំនិញ' },
    addMoreForDiscount: {
      en: (missing: string, off: string) => `Add ${missing} more to get ${off} off.`,
      km: (missing: string, off: string) => `ទិញបន្ថែម ${missing} ទៀត ដើម្បីទទួលបានការបញ្ចុះតម្លៃ ${off}។`,
    },
    addMoreForFreeDelivery: {
      en: (missing: string) => `Add ${missing} more for free delivery.`,
      km: (missing: string) => `ទិញបន្ថែម ${missing} ទៀត ដើម្បីបានដឹកជូនឥតគិតថ្លៃ។`,
    },
    addItemsForFreeDelivery: {
      en: (n: number) => (n === 1 ? 'Add 1 more item for free delivery.' : `Add ${n} more items for free delivery.`),
      km: (n: number) => `ទិញទំនិញ ${n} ទៀត ដើម្បីបានដឹកជូនឥតគិតថ្លៃ។`,
    },
    deliveryIsFree: { en: 'Your delivery is free.', km: 'ការដឹករបស់អ្នកឥតគិតថ្លៃ។' },
    fixItems: { en: 'Fix the items marked in red to continue.', km: 'សូមកែទំនិញដែលមានសញ្ញាក្រហម ដើម្បីបន្ត។' },
    remove: { en: (name: string) => `Remove ${name}`, km: (name: string) => `ដក ${name} ចេញ` },
    yourOrders: { en: 'Your orders', km: 'ការកុម្ម៉ង់របស់អ្នក' },
  },

  // The order button in the shop's header while an order is on its way,
  // and the list of the orders placed on this phone.
  myOrders: {
    tab: { en: (shop: string) => `Your orders · ${shop}`, km: (shop: string) => `ការកុម្ម៉ង់របស់អ្នក · ${shop}` },
    title: { en: 'Your orders', km: 'ការកុម្ម៉ង់របស់អ្នក' },
    inProgressCount: {
      en: (n: number) => `${n} orders in progress`,
      km: (n: number) => `ការកុម្ម៉ង់ ${n} កំពុងដំណើរការ`,
    },
    seeThem: { en: 'See them', km: 'មើល' },
    notPaidCount: {
      en: (n: number) => `${n} not paid yet`,
      km: (n: number) => `ការកុម្ម៉ង់ ${n} មិនទាន់បង់`,
    },
    inProgress: { en: 'In progress', km: 'កំពុងដំណើរការ' },
    past: { en: 'Past orders', km: 'ការកុម្ម៉ង់មុនៗ' },
    emptyTitle: { en: 'No orders on this phone yet', km: 'មិនទាន់មានការកុម្ម៉ង់នៅលើទូរស័ព្ទនេះទេ' },
    emptyText: {
      en: 'Orders you place in this shop on this phone show here.',
      km: 'ការកុម្ម៉ង់ដែលអ្នកធ្វើនៅហាងនេះ លើទូរស័ព្ទនេះ នឹងបង្ហាញនៅទីនេះ។',
    },
    otherPhone: {
      en: 'Ordered on another phone? Open the order link here and enter the phone number you ordered with.',
      km: 'បានកុម្ម៉ង់លើទូរស័ព្ទផ្សេង? សូមបើកតំណការកុម្ម៉ង់នៅទីនេះ ហើយបញ្ចូលលេខទូរស័ព្ទដែលអ្នកបានប្រើពេលកុម្ម៉ង់។',
    },
    cantOpen: { en: "Can't show this order", km: 'មិនអាចបង្ហាញការកុម្ម៉ង់នេះបានទេ' },
  },

  // The money lines on the cart, checkout and order pages.
  summary: {
    items: { en: 'Items', km: 'ទំនិញ' },
    discount: { en: 'Discount', km: 'បញ្ចុះតម្លៃ' },
    delivery: { en: 'Delivery', km: 'ថ្លៃដឹក' },
    free: { en: 'Free', km: 'ឥតគិតថ្លៃ' },
    total: { en: 'Total', km: 'សរុប' },
  },
  orderNumber: { en: (n: number) => `Order #${n}`, km: (n: number) => `ការកុម្ម៉ង់ #${n}` },

  // The line at the bottom of the shop's grid pages and the order page:
  // "Made with Oak Order", then Privacy · Terms (founder's pick 1A 2A,
  // 2026-10-10). "Oak Order" stays in English letters in both.
  credit: {
    madeWith: { en: 'Made with', km: 'ហាងនេះប្រើ' },
    privacy: { en: 'Privacy', km: 'គោលការណ៍ឯកជនភាព' },
    terms: { en: 'Terms', km: 'លក្ខខណ្ឌប្រើប្រាស់' },
  },
} satisfies Tree
