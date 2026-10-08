import type { Tree } from '../core.ts'

/** Landing page, log in, create store. */
export const auth = {
  home: {
    title: {
      en: 'Turn social media chats into real orders',
      km: 'ប្រែការឆាតលើបណ្ដាញសង្គម ទៅជាការកុម្ម៉ង់ពិតៗ',
    },
    // Under the big ស្រួល on the start page.
    tagline: {
      en: 'Easy orders for sellers on Facebook, TikTok and Instagram.',
      km: 'ការកុម្ម៉ង់ងាយស្រួល សម្រាប់អ្នកលក់លើ Facebook, TikTok និង Instagram។',
    },
    // For English readers: what the big word says.
    meaning: { en: '“Sroul” means easy.', km: '' },
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
