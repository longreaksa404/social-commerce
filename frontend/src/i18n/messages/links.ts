import type { Tree } from '../core.ts'

/** The seller's Links tab, a new link, a link's page. */
export const links = {
  title: { en: 'Links', km: 'តំណ' },
  link: { en: 'Link', km: 'តំណ' },
  newLink: { en: 'New link', km: 'តំណថ្មី' },
  emptyTitle: { en: 'See which posts bring orders', km: 'មើលថាប៉ុស្តិ៍ណាខ្លះនាំមកការកុម្ម៉ង់' },
  emptyText: {
    en: 'Make a link for each place you post, like your TikTok video or a Facebook group. Each one counts its own views and orders.',
    km: 'បង្កើតតំណមួយសម្រាប់កន្លែងនីមួយៗដែលអ្នកប៉ុស្តិ៍ ដូចជាវីដេអូ TikTok ឬក្រុម Facebook។ តំណនីមួយៗរាប់ចំនួនអ្នកមើល និងការកុម្ម៉ង់ដាច់ដោយឡែក។',
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
  products: { en: 'Products', km: 'ទំនិញ' },
  categories: { en: 'Categories', km: 'ប្រភេទ' },
  wherePost: { en: "Where you'll post it", km: 'កន្លែងដែលអ្នកនឹងប៉ុស្តិ៍' },
  other: { en: 'Other', km: 'ផ្សេងទៀត' },
  where: { en: 'Where?', km: 'នៅកន្លែងណា?' },
  wherePlaceholder: { en: 'e.g. YouTube, my Facebook group', km: 'ឧ. YouTube, ក្រុម Facebook របស់ខ្ញុំ' },
  name: { en: 'Name (optional)', km: 'ឈ្មោះ (មិនចាំបាច់)' },
  nameHint: {
    en: 'To tell your links apart, like “Video 3 Oct” or “September sale”.',
    km: 'ដើម្បីងាយស្គាល់តំណរបស់អ្នក ដូចជា “វីដេអូ 3 តុលា” ឬ “បញ្ចុះតម្លៃខែកញ្ញា”។',
  },
  make: { en: 'Make link', km: 'បង្កើតតំណ' },

  made: { en: (date: string) => `Made ${date}`, km: (date: string) => `បង្កើតនៅ ${date}` },
  viewsLabel: { en: 'Views', km: 'អ្នកមើល' },
  ordersLabel: { en: 'Orders', km: 'ការកុម្ម៉ង់' },
  howCounted: {
    en: "A view counts once per phone every 30 minutes. An order counts if it's placed on the same phone within 7 days of opening this link.",
    km: 'ការមើលរាប់ម្ដងក្នុងមួយទូរស័ព្ទ រៀងរាល់ 30 នាទី។ ការកុម្ម៉ង់ត្រូវបានរាប់ ប្រសិនបើកុម្ម៉ង់លើទូរស័ព្ទដដែល ក្នុងរយៈពេល 7 ថ្ងៃក្រោយបើកតំណនេះ។',
  },
  noOrders: { en: 'No orders from this link yet.', km: 'មិនទាន់មានការកុម្ម៉ង់ពីតំណនេះនៅឡើយ។' },
  latestOrders: {
    en: (shown: number, total: number) => `The latest ${shown} of ${total} orders.`,
    km: (shown: number, total: number) => `ការកុម្ម៉ង់ចុងក្រោយ ${shown} ក្នុងចំណោម ${total}។`,
  },
  copyLink: { en: 'Copy link', km: 'ចម្លងតំណ' },
  linkCopied: { en: 'Link copied', km: 'បានចម្លងតំណ' },
  copyFailed: {
    en: "Couldn't copy. Press and hold the link to copy it.",
    km: 'ចម្លងមិនបាន។ សូមចុចឱ្យជាប់លើតំណ ដើម្បីចម្លងវា។',
  },
  categoryDeleted: {
    en: 'This category was deleted, so the link shows “not found”.',
    km: 'ប្រភេទនេះត្រូវបានលុប ដូច្នេះតំណបង្ហាញថា “រកមិនឃើញ”។',
  },
  productHidden: {
    en: 'This product is hidden from your shop, so the link shows “not found”. Show the product again and the link works again.',
    km: 'ទំនិញនេះត្រូវបានលាក់ពីហាងរបស់អ្នក ដូច្នេះតំណបង្ហាញថា “រកមិនឃើញ”។ បង្ហាញទំនិញវិញ នោះតំណនឹងដំណើរការវិញ។',
  },
} satisfies Tree
