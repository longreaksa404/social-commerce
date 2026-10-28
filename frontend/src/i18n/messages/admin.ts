import type { Tree } from '../core.ts'

/** Oak Order's admin page (/admin, English only since 2026-10-28: AdminRoot
 * gives it the English texts): checking an "I've paid" and Mark paid. */
export const admin = {
  claim: {
    en: (amount: string, period: string, when: string) => `Says paid ${amount} for ${period} on ${when}`,
    km: (amount: string, period: string, when: string) => `និយាយថាបានបង់ ${amount} សម្រាប់${period} នៅ ${when}`,
  },
  checkClaim: {
    en: 'Find a transfer with this code in your bank app:',
    km: 'រកការផ្ទេរប្រាក់ដែលមានលេខកូដនេះ ក្នុងកម្មវិធីធនាគារ៖',
  },
  found: { en: 'Found it: mark paid', km: 'រកឃើញ៖ កត់ថាបានបង់' },
  notFound: { en: 'Not found', km: 'រកមិនឃើញ' },
  notFoundTitle: { en: 'Tell the seller it wasn’t found?', km: 'ប្រាប់អ្នកលក់ថារកមិនឃើញ?' },
  notFoundDefault: { en: 'No transfer with your code yet', km: 'មិនទាន់មានការផ្ទេរប្រាក់ដែលមានលេខកូដរបស់អ្នកទេ' },
  foundTitle: { en: (shop: string) => `Mark ${shop} paid?`, km: (shop: string) => `កត់ថា ${shop} បានបង់?` },
  checked: { en: 'Done', km: 'រួចរាល់' },
  payments: { en: 'Payments', km: 'ការបង់ប្រាក់' },
  noPayments: { en: 'No payments yet.', km: 'មិនទាន់មានការបង់ប្រាក់ទេ។' },
  status: {
    pending: { en: 'Said paid', km: 'និយាយថាបានបង់' },
    paid: { en: 'Paid', km: 'បានបង់' },
    failed: { en: 'Not found', km: 'រកមិនឃើញ' },
  },
  covers: {
    en: (from: string, until: string) => `${from} to ${until}`,
    km: (from: string, until: string) => `${from} ដល់ ${until}`,
  },
  markPaid: { en: 'Mark paid', km: 'កត់ថាបានបង់' },
  markPaidHint: {
    en: 'A payment made by hand. It covers the next month or year. 0 gives free time.',
    km: 'ការបង់ដោយដៃ។ វាគ្របដណ្ដប់ខែ ឬឆ្នាំបន្ទាប់។ 0 ផ្ដល់ពេលឥតគិតថ្លៃ។',
  },
  period: { en: 'For', km: 'សម្រាប់' },
  month: { en: 'A month', km: 'មួយខែ' },
  year: { en: 'A year', km: 'មួយឆ្នាំ' },
  amount: { en: 'Amount (US dollars)', km: 'ចំនួន (ដុល្លារអាមេរិក)' },
  note: { en: 'Note (optional)', km: 'កំណត់ចំណាំ (មិនចាំបាច់)' },
  notePlaceholder: { en: 'ABA transfer, ref 4821', km: 'ផ្ទេរ ABA លេខយោង 4821' },
  confirmTitle: { en: (shop: string) => `Mark ${shop} paid?`, km: (shop: string) => `កត់ថា ${shop} បានបង់?` },
  confirmMessage: {
    en: (amount: string, period: string) => `${amount} for ${period}. This can't be undone here.`,
    km: (amount: string, period: string) => `${amount} សម្រាប់${period}។ មិនអាចត្រឡប់វិញនៅទីនេះបានទេ។`,
  },
  marked: { en: (day: string) => `Recorded. Paid until ${day}.`, km: (day: string) => `បានកត់ត្រា។ បានបង់រហូតដល់ ${day}។` },
} satisfies Tree
