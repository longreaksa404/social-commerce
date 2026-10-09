import type { Tree } from '../core.ts'

/** Around the privacy, terms and data deletion pages (their text is in
 * src/pages/legal/content.ts), and the links to them. */
export const legal = {
  privacy: { en: 'Privacy Policy', km: 'គោលការណ៍ឯកជនភាព' },
  terms: { en: 'Terms of Service', km: 'លក្ខខណ្ឌប្រើប្រាស់' },
  dataDeletion: { en: 'Data deletion', km: 'ការលុបទិន្នន័យ' },
  updated: {
    en: (date: string) => `Last updated ${date}`,
    km: (date: string) => `កែប្រែចុងក្រោយ ${date}`,
  },
  contact: { en: 'Contact', km: 'ទំនាក់ទំនង' },
  contactTelegram: {
    en: 'Message Oak Order on Telegram:',
    km: 'ផ្ញើសារទៅ Oak Order តាម Telegram៖',
  },
  contactInApp: {
    en: 'Message Oak Order through Settings → Get help in the app.',
    km: 'ផ្ញើសារទៅ Oak Order តាម ការកំណត់ → សុំជំនួយ ក្នុងកម្មវិធី។',
  },
  // "By creating a store, you accept our [Terms of Service] and [Privacy Policy]."
  agreeStart: { en: 'By creating a store, you accept our', km: 'ការបង្កើតហាង មានន័យថាអ្នកយល់ព្រមនឹង' },
  agreeAnd: { en: 'and', km: 'និង' },
  // Khmer puts “our” after the links, so its ending starts with a space.
  agreeEnd: { en: '.', km: ' របស់យើង។' },
  home: { en: 'Oak Order home', km: 'ទំព័រដើម Oak Order' },
} satisfies Tree
