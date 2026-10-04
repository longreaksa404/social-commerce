import type { Tree } from '../core.ts'

/** Shared buttons, form pieces and page states. */
export const common = {
  back: { en: 'Back', km: 'ត្រឡប់ក្រោយ' },
  cancel: { en: 'Cancel', km: 'បោះបង់' },
  confirm: { en: 'Confirm', km: 'បញ្ជាក់' },
  save: { en: 'Save', km: 'រក្សាទុក' },
  saving: { en: 'Saving…', km: 'កំពុងរក្សាទុក…' },
  copied: { en: 'Copied', km: 'បានចម្លង' },
  share: { en: 'Share', km: 'ចែករំលែក' },
  open: { en: 'Open', km: 'បើក' },
  delete: { en: 'Delete', km: 'លុប' },
  remove: { en: 'Remove', km: 'ដកចេញ' },
  add: { en: 'Add', km: 'បន្ថែម' },
  loading: { en: 'Loading', km: 'កំពុងផ្ទុក' },
  // After a few seconds of loading: the free server sleeps when nobody has
  // visited for a while, and waking it takes up to a minute.
  slow: {
    en: 'Still loading. The first visit in a while can take up to a minute.',
    km: 'កំពុងផ្ទុក… ការចូលលើកដំបូងក្រោយពេលយូរ អាចចំណាយពេលរហូតដល់មួយនាទី។',
  },
  showPassword: { en: 'Show password', km: 'បង្ហាញពាក្យសម្ងាត់' },
  hidePassword: { en: 'Hide password', km: 'លាក់ពាក្យសម្ងាត់' },
  couldNotLoad: { en: "Couldn't load this page", km: 'មិនអាចបើកទំព័រនេះបានទេ' },
  tryAgain: { en: 'Try again', km: 'ព្យាយាមម្ដងទៀត' },
  somethingWrong: {
    en: 'Something went wrong. Please try again.',
    km: 'មានបញ្ហាអ្វីមួយ។ សូមព្យាយាមម្ដងទៀត។',
  },
  language: { en: 'Language', km: 'ភាសា' },
  // The label of the shop header's one-button switch, read in the language it switches to.
  switchLanguage: { en: 'ប្ដូរទៅភាសាខ្មែរ', km: 'Switch to English' },
  // "e.g. Sokha Fashion": an example of what to type.
  example: { en: (text: string) => `e.g. ${text}`, km: (text: string) => `ឧ. ${text}` },
} satisfies Tree
