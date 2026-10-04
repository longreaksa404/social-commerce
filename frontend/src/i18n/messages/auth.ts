import type { Tree } from '../core.ts'

/** Landing page, log in, create store. */
export const auth = {
  home: {
    title: {
      en: 'Turn social media chats into real orders',
      km: 'ប្រែការឆាតលើបណ្ដាញសង្គម ទៅជាការកុម្ម៉ង់ពិតៗ',
    },
    subtitle: {
      en: 'A simple online shop for sellers who sell through social media.',
      km: 'ហាងអនឡាញងាយស្រួល សម្រាប់អ្នកលក់តាមបណ្ដាញសង្គម។',
    },
    pointLinkTitle: { en: 'One link for your shop', km: 'តំណតែមួយសម្រាប់ហាងរបស់អ្នក' },
    pointLinkText: {
      en: 'Share it on Facebook, TikTok, or Instagram.',
      km: 'ចែករំលែកវានៅលើ Facebook, TikTok ឬ Instagram។',
    },
    pointChatsTitle: { en: 'Fewer back-and-forth chats', km: 'ឆាតឆ្លើយឆ្លងគ្នាតិចជាងមុន' },
    pointChatsText: {
      en: 'Customers see prices, photos, and stock themselves.',
      km: 'អតិថិជនមើលតម្លៃ រូបថត និងស្តុកដោយខ្លួនឯង។',
    },
    pointPhoneTitle: { en: 'Run it from your phone', km: 'គ្រប់គ្រងពីទូរស័ព្ទរបស់អ្នក' },
    pointPhoneText: {
      en: 'Add products and update stock anywhere.',
      km: 'បន្ថែមទំនិញ និងកែស្តុកបាននៅគ្រប់ទីកន្លែង។',
    },
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
