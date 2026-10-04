import type { Tree } from '../core.ts'

/** The dashboard's frame: tabs, sidebar, bell. */
export const dashboard = {
  // Bottom tabs on phones: five must fit a 320px screen, so keep them short.
  tab: {
    orders: { en: 'Orders', km: 'កុម្ម៉ង់' },
    customers: { en: 'Customers', km: 'អតិថិជន' },
    products: { en: 'Products', km: 'ទំនិញ' },
    links: { en: 'Links', km: 'តំណ' },
    settings: { en: 'Settings', km: 'ការកំណត់' },
    categories: { en: 'Categories', km: 'ប្រភេទ' },
  },
  mainNav: { en: 'Main', km: 'ម៉ឺនុយ' },
  notifications: { en: 'Notifications', km: 'ការជូនដំណឹង' },
  notificationsUnread: {
    en: (n: number) => `Notifications, ${n} unread`,
    km: (n: number) => `ការជូនដំណឹង, ${n} មិនទាន់អាន`,
  },
} satisfies Tree
