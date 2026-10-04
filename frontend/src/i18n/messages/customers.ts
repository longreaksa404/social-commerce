import type { Tree } from '../core.ts'

/** The seller's Customers tab, a customer's page, and notifications. */
export const customers = {
  title: { en: 'Customers', km: 'អតិថិជន' },
  customer: { en: 'Customer', km: 'អតិថិជន' },
  emptyTitle: { en: 'No customers yet', km: 'មិនទាន់មានអតិថិជននៅឡើយ' },
  emptyText: {
    en: 'Everyone who orders from your shop shows up here, with their phone number and orders.',
    km: 'អ្នកដែលកុម្ម៉ង់ពីហាងរបស់អ្នក នឹងបង្ហាញនៅទីនេះ ជាមួយលេខទូរស័ព្ទ និងការកុម្ម៉ង់របស់គេ។',
  },
  search: { en: 'Search customers', km: 'ស្វែងរកអតិថិជន' },
  searchPlaceholder: { en: 'Name or phone number', km: 'ឈ្មោះ ឬលេខទូរស័ព្ទ' },
  found: { en: (n: number) => `${n} found`, km: (n: number) => `រកឃើញ ${n}` },
  count: {
    en: (n: number) => `${n} ${n === 1 ? 'customer' : 'customers'}`,
    km: (n: number) => `អតិថិជន ${n} នាក់`,
  },
  notFoundTitle: { en: 'No customers found', km: 'រកមិនឃើញអតិថិជនទេ' },
  notFoundText: {
    en: (q: string) => `No name or phone number matches “${q}”.`,
    km: (q: string) => `គ្មានឈ្មោះ ឬលេខទូរស័ព្ទណាដែលត្រូវនឹង “${q}” ទេ។`,
  },
  orderCount: {
    en: (n: number) => `${n} ${n === 1 ? 'order' : 'orders'}`,
    km: (n: number) => `កុម្ម៉ង់ ${n} ដង`,
  },
  lastOrder: { en: (time: string) => ` · last ${time}`, km: (time: string) => ` · ចុងក្រោយ ${time}` },
  latestAddress: { en: 'Latest address', km: 'អាសយដ្ឋានចុងក្រោយ' },
  since: { en: (date: string) => `Customer since ${date}`, km: (date: string) => `ជាអតិថិជនតាំងពី ${date}` },
  orders: { en: 'Orders', km: 'ការកុម្ម៉ង់' },
  spent: { en: 'Spent', km: 'ចំណាយសរុប' },
  leftOut: {
    en: "Rejected and cancelled orders don't count toward what they spent.",
    km: 'ការកុម្ម៉ង់ដែលបានបដិសេធ ឬលុបចោល មិនត្រូវបានរាប់ក្នុងចំណាយសរុបទេ។',
  },
  latestOrders: {
    en: (shown: number, total: number) => `Their latest ${shown} of ${total} orders. The older ones are in Orders.`,
    km: (shown: number, total: number) =>
      `ការកុម្ម៉ង់ចុងក្រោយ ${shown} ក្នុងចំណោម ${total}។ ការកុម្ម៉ង់ចាស់ៗមាននៅក្នុងផ្ទាំងកុម្ម៉ង់។`,
  },

  notifications: {
    emptyTitle: { en: 'No notifications yet', km: 'មិនទាន់មានការជូនដំណឹងនៅឡើយ' },
    emptyText: {
      en: 'New orders show up here, and products running low or sold out.',
      km: 'ការកុម្ម៉ង់ថ្មី និងទំនិញដែលជិតអស់ ឬអស់ស្តុក នឹងបង្ហាញនៅទីនេះ។',
    },
    newOrder: { en: (n: number) => `New order #${n}`, km: (n: number) => `ការកុម្ម៉ង់ថ្មី #${n}` },
    acceptedAutomatically: { en: 'Accepted automatically', km: 'បានទទួលដោយស្វ័យប្រវត្តិ' },
    soldOut: { en: 'Sold out', km: 'អស់ស្តុក' },
    runningLow: { en: 'Running low', km: 'ជិតអស់ស្តុក' },
    itemSoldOut: { en: (name: string) => `${name}: sold out`, km: (name: string) => `${name}៖ អស់ស្តុក` },
    itemLeft: {
      en: (name: string, n: number) => `${name}: ${n} left`,
      km: (name: string, n: number) => `${name}៖ នៅសល់ ${n}`,
    },
    unread: { en: 'Unread: ', km: 'មិនទាន់អាន៖ ' },
  },
} satisfies Tree
