import type { Tree } from '../core.ts'

/** The seller's Links tab, a new link, a link's page. */
export const links = {
  title: { en: 'Links', km: 'តំណ' },
  link: { en: 'Link', km: 'តំណ' },
  newLink: { en: 'New link', km: 'តំណថ្មី' },
  // The shop's plain link, first on the page (settings check, 2026-10-19).
  yourShopLink: { en: 'Your shop link', km: 'តំណហាងរបស់អ្នក' },
  // The Links tab's first part (pick 11A, 2026-10-25).
  yourShop: { en: 'Your shop', km: 'ហាងរបស់អ្នក' },
  emptyTitle: { en: 'See which posts bring orders', km: 'មើលថាប៉ុស្តិ៍ណាខ្លះនាំមកការកុម្ម៉ង់' },
  emptyText: {
    en: 'Make a link for each post to count its views and orders.',
    km: 'បង្កើតតំណមួយសម្រាប់ប៉ុស្តិ៍នីមួយៗ ដើម្បីរាប់អ្នកមើល និងការកុម្ម៉ង់។',
  },
  views: {
    en: (n: number) => `${n} ${n === 1 ? 'view' : 'views'}`,
    km: (n: number) => `មើល ${n} ដង`,
  },
  orders: {
    en: (n: number) => `${n} ${n === 1 ? 'order' : 'orders'}`,
    km: (n: number) => `កុម្ម៉ង់ ${n}`,
  },
  notWorkingTag: { en: ' · not working', km: ' · មិនដំណើរការ' },
  wholeShop: { en: 'Whole shop', km: 'ហាងទាំងមូល' },
  deletedCategory: { en: 'Deleted category', km: 'ប្រភេទដែលបានលុប' },
  product: { en: 'Product', km: 'ទំនិញ' },

  ready: { en: 'Link ready. Copy it or share it.', km: 'តំណរួចរាល់។ ចម្លង ឬចែករំលែកវា។' },
  whatItOpens: { en: 'What it opens', km: 'អ្វីដែលតំណនឹងបើក' },
  chooseWhat: { en: 'Choose…', km: 'ជ្រើសរើស…' },
  products: { en: 'Products', km: 'ទំនិញ' },
  categories: { en: 'Categories', km: 'ប្រភេទ' },
  wherePost: { en: "Where you'll post it", km: 'កន្លែងដែលអ្នកនឹងប៉ុស្តិ៍' },
  // Share on a product or category (test list #9, 2026-10-24).
  shareTitle: { en: (name: string) => `Share ${name}`, km: (name: string) => `ចែករំលែក ${name}` },
  other: { en: 'Other', km: 'ផ្សេងទៀត' },
  where: { en: 'Where?', km: 'នៅកន្លែងណា?' },
  wherePlaceholder: { en: 'e.g. YouTube, my Facebook group', km: 'ឧ. YouTube, ក្រុម Facebook របស់ខ្ញុំ' },
  name: { en: 'Name (optional)', km: 'ឈ្មោះ (មិនចាំបាច់)' },
  nameHint: {
    en: 'E.g. “Video 3 Oct” or “September sale”.',
    km: 'ឧ. “វីដេអូ 3 តុលា” ឬ “បញ្ចុះតម្លៃខែកញ្ញា”។',
  },
  make: { en: 'Make link', km: 'បង្កើតតំណ' },

  made: { en: (date: string) => `Made ${date}`, km: (date: string) => `បង្កើតនៅ ${date}` },
  viewsLabel: { en: 'Views', km: 'អ្នកមើល' },
  ordersLabel: { en: 'Orders', km: 'ការកុម្ម៉ង់' },
  noOrders: { en: 'No orders from this link yet.', km: 'មិនទាន់មានការកុម្ម៉ង់ពីតំណនេះនៅឡើយ។' },
  latestOrders: {
    en: (shown: number, total: number) => `The latest ${shown} of ${total} orders.`,
    km: (shown: number, total: number) => `ការកុម្ម៉ង់ចុងក្រោយ ${shown} ក្នុងចំណោម ${total}។`,
  },
  copyLink: { en: 'Copy link', km: 'ចម្លងតំណ' },
  copy: { en: 'Copy', km: 'ចម្លង' },
  // On a link's card.
  ordered: { en: (pct: number) => `${pct}% ordered`, km: (pct: number) => `${pct}% បានកុម្ម៉ង់` },
  linkCopied: { en: 'Link copied', km: 'បានចម្លងតំណ' },
  copyFailed: {
    en: "Couldn't copy. Press and hold the link instead.",
    km: 'ចម្លងមិនបាន។ សូមចុចឱ្យជាប់លើតំណជំនួសវិញ។',
  },
  categoryDeleted: {
    en: 'The category was deleted, so this link shows “not found”.',
    km: 'ប្រភេទត្រូវបានលុប ដូច្នេះតំណបង្ហាញ “រកមិនឃើញ”។',
  },
  productHidden: {
    en: 'The product is hidden, so this link shows “not found”. Show it to fix the link.',
    km: 'ទំនិញត្រូវបានលាក់ ដូច្នេះតំណបង្ហាញ “រកមិនឃើញ”។ បង្ហាញទំនិញវិញ ដើម្បីឱ្យតំណដំណើរការ។',
  },
} satisfies Tree
