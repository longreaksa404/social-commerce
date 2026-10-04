import type { Tree } from '../core.ts'

/** The customer's shop: browsing, product page, cart. */
export const shop = {
  shopNotFound: { en: 'Shop not found', km: 'រកមិនឃើញហាង' },
  shopNotFoundText: {
    en: 'Check the link, or ask the seller to send it again.',
    km: 'សូមពិនិត្យតំណ ឬសុំឱ្យអ្នកលក់ផ្ញើវាម្ដងទៀត។',
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

  cartPage: {
    tab: { en: (shop: string) => `Your cart · ${shop}`, km: (shop: string) => `កន្ត្រករបស់អ្នក · ${shop}` },
    title: { en: 'Your cart', km: 'កន្ត្រករបស់អ្នក' },
    emptyTitle: { en: 'Your cart is empty', km: 'កន្ត្រករបស់អ្នកនៅទទេ' },
    emptyText: {
      en: 'Add products from the shop, then come back here to order.',
      km: 'សូមដាក់ទំនិញពីហាងចូលកន្ត្រក រួចត្រឡប់មកទីនេះដើម្បីកុម្ម៉ង់។',
    },
    browse: { en: 'Browse products', km: 'មើលទំនិញ' },
    feeAtCheckout: { en: 'Delivery fee is added at checkout.', km: 'ថ្លៃដឹកនឹងបូកបញ្ចូលនៅពេលកុម្ម៉ង់។' },
    addMoreForDiscount: {
      en: (missing: string, off: string) => `Add ${missing} more to get ${off} off.`,
      km: (missing: string, off: string) => `ទិញបន្ថែម ${missing} ទៀត ដើម្បីទទួលបានការបញ្ចុះតម្លៃ ${off}។`,
    },
    fixItems: { en: 'Fix the items marked in red to continue.', km: 'សូមកែទំនិញដែលមានសញ្ញាក្រហម ដើម្បីបន្ត។' },
    checkout: { en: 'Checkout', km: 'បន្តទៅកុម្ម៉ង់' },
    continueShopping: { en: 'Continue shopping', km: 'ទិញបន្តទៀត' },
    remove: { en: (name: string) => `Remove ${name}`, km: (name: string) => `ដក ${name} ចេញ` },
    yourOrders: { en: 'Your orders', km: 'ការកុម្ម៉ង់របស់អ្នក' },
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
} satisfies Tree
