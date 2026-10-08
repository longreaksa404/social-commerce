import type { Tree } from '../core.ts'

/** Landing page, log in, create store. */
export const auth = {
  home: {
    title: {
      en: 'Turn social media chats into real orders',
      km: 'ប្រែការឆាតលើបណ្ដាញសង្គម ទៅជាការកុម្ម៉ង់ពិតៗ',
    },
    // Under the big Oak Order on the start page.
    tagline: {
      en: 'Easy orders for sellers on Facebook, TikTok and Instagram.',
      km: 'ការកុម្ម៉ង់ងាយស្រួល សម្រាប់អ្នកលក់លើ Facebook, TikTok និង Instagram។',
    },
  },
  // The navy half beside the login and register forms on laptops.
  pitch: {
    text: {
      en: 'One link for your shop on Facebook, TikTok and Instagram. Every order in one place.',
      km: 'តំណតែមួយសម្រាប់ហាងរបស់អ្នក លើ Facebook, TikTok និង Instagram។ ការកុម្ម៉ង់ទាំងអស់នៅកន្លែងតែមួយ។',
    },
    example: { en: 'Example', km: 'ឧទាហរណ៍' },
    sampleTitle: { en: 'New order #1042', km: 'ការកុម្ម៉ង់ថ្មី #1042' },
    sampleText: { en: 'Sokunthea, 2 items, $17.00', km: 'Sokunthea, ទំនិញ 2, $17.00' },
    sampleTag: { en: 'New', km: 'ថ្មី' },
  },
  createYourStore: { en: 'Create your store', km: 'បង្កើតហាងរបស់អ្នក' },
  logIn: { en: 'Log in', km: 'ចូលគណនី' },
  email: { en: 'Email', km: 'អ៊ីមែល' },
  password: { en: 'Password', km: 'ពាក្យសម្ងាត់' },
  login: {
    title: { en: 'Welcome back', km: 'សូមស្វាគមន៍ការត្រឡប់មកវិញ' },
    subtitle: { en: 'Log in to manage your shop.', km: 'ចូលគណនី ដើម្បីគ្រប់គ្រងហាងរបស់អ្នក។' },
    newHere: { en: 'New here?', km: 'ទើបមកលើកដំបូង?' },
  },
  // Forgot password? A link to the shop's Telegram; else Oak Order resets it.
  forgot: {
    link: { en: 'Forgot password?', km: 'ភ្លេចពាក្យសម្ងាត់?' },
    title: { en: 'Forgot your password?', km: 'ភ្លេចពាក្យសម្ងាត់?' },
    subtitle: {
      en: "We'll send a link to your shop's Telegram, where your order alerts go.",
      km: 'យើងនឹងផ្ញើតំណមួយទៅ Telegram របស់ហាងអ្នក ជាកន្លែងដែលអ្នកទទួលការជូនដំណឹងការកុម្ម៉ង់។',
    },
    send: { en: 'Send link', km: 'ផ្ញើតំណ' },
    sentTitle: { en: 'Check Telegram', km: 'សូមពិនិត្យ Telegram' },
    sent: {
      en: (email: string) =>
        `If ${email} has a shop with Telegram connected, a message from our bot is on its way. Open the link in it within 30 minutes.`,
      km: (email: string) =>
        `បើ ${email} មានហាងដែលបានភ្ជាប់ Telegram សារពី bot របស់យើងកំពុងផ្ញើទៅ។ សូមបើកតំណក្នុងសារនោះក្នុងរយៈពេល 30 នាទី។`,
    },
    noTelegram: {
      en: 'No message, or Telegram not connected? Oak Order can reset your password for you.',
      km: 'មិនទទួលបានសារ ឬមិនបានភ្ជាប់ Telegram? Oak Order អាចកំណត់ពាក្យសម្ងាត់ឡើងវិញឱ្យអ្នកបាន។',
    },
    askSupport: { en: 'Message Oak Order', km: 'ផ្ញើសារទៅ Oak Order' },
    supportText: {
      en: (email: string) => `Hi Oak Order, I forgot the password for ${email}.`,
      km: (email: string) => `សួស្ដី Oak Order ខ្ញុំភ្លេចពាក្យសម្ងាត់សម្រាប់ ${email}។`,
    },
    staff: {
      en: "Staff: ask the shop's owner to set a new password for you in Settings → Staff.",
      km: 'បុគ្គលិក៖ សូមឱ្យម្ចាស់ហាងកំណត់ពាក្យសម្ងាត់ថ្មីឱ្យអ្នក ក្នុង ការកំណត់ → បុគ្គលិក។',
    },
    backToLogin: { en: 'Back to log in', km: 'ត្រឡប់ទៅចូលគណនី' },
  },
  reset: {
    title: { en: 'Choose a new password', km: 'ជ្រើសពាក្យសម្ងាត់ថ្មី' },
    subtitle: {
      en: "You'll be logged in, and logged out on every other phone.",
      km: 'អ្នកនឹងបានចូលគណនី ហើយចាកចេញពីទូរស័ព្ទផ្សេងទៀតទាំងអស់។',
    },
    save: { en: 'Save and log in', km: 'រក្សាទុក ហើយចូលគណនី' },
    noLink: {
      en: 'This page needs the link from Telegram. Ask for a new one.',
      km: 'ទំព័រនេះត្រូវការតំណពី Telegram។ សូមស្នើតំណថ្មី។',
    },
    askAgain: { en: 'Ask for a new link', km: 'ស្នើតំណថ្មី' },
  },
  register: {
    subtitle: { en: 'It takes about a minute.', km: 'ចំណាយពេលប្រហែលមួយនាទី។' },
    haveAccount: { en: 'Already have an account?', km: 'មានគណនីរួចហើយ?' },
    storeName: { en: 'Store name', km: 'ឈ្មោះហាង' },
    storeNameHint: {
      en: 'What customers will see. You can change it later.',
      km: 'ឈ្មោះដែលអតិថិជននឹងឃើញ។ អ្នកអាចប្ដូរវានៅពេលក្រោយបាន។',
    },
    yourName: { en: 'Your name', km: 'ឈ្មោះរបស់អ្នក' },
    phone: { en: 'Phone number', km: 'លេខទូរស័ព្ទ' },
    emailHint: { en: "You'll use this to log in.", km: 'អ្នកនឹងប្រើវាដើម្បីចូលគណនី។' },
    passwordHint: { en: 'At least 8 characters.', km: 'យ៉ាងតិច 8 តួអក្សរ។' },
    submit: { en: 'Create store', km: 'បង្កើតហាង' },
  },
} satisfies Tree
