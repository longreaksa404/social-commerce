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
  closeNotifications: { en: 'Close notifications', km: 'បិទការជូនដំណឹង' },
  // The share button beside the bell (UX check #10, 2026-10-17).
  shareShop: { en: 'Share your shop link', km: 'ចែករំលែកតំណហាងរបស់អ្នក' },
  shopLinkCopied: { en: 'Shop link copied', km: 'បានចម្លងតំណហាង' },
  shopLinkCopyFailed: {
    en: "Couldn't copy. Press and hold the link to copy it.",
    km: 'មិនអាចចម្លងបានទេ។ សូមចុចឱ្យជាប់លើតំណ ដើម្បីចម្លង។',
  },
} satisfies Tree
