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
  createYourStore: { en: 'Create your shop', km: 'បង្កើតហាងរបស់អ្នក' },
  logIn: { en: 'Log in', km: 'ចូលគណនី' },
  email: { en: 'Email', km: 'អ៊ីមែល' },
  phone: { en: 'Phone number', km: 'លេខទូរស័ព្ទ' },
  password: { en: 'Password', km: 'ពាក្យសម្ងាត់' },
  // Accounts from before 2026-10-09 (and their staff) log in with an email.
  useEmail: { en: 'Log in with email instead', km: 'ចូលដោយអ៊ីមែលជំនួសវិញ' },
  usePhone: { en: 'Log in with phone number', km: 'ចូលដោយលេខទូរស័ព្ទ' },
  // "Continue with Google / Facebook / TikTok". Google draws its own
  // button, in the app's language; Facebook's and TikTok's are ours.
  social: {
    continueWith: {
      en: (provider: string) => `Continue with ${provider}`,
      km: (provider: string) => `បន្តជាមួយ ${provider}`,
    },
    // Over the row of logos under the phone form.
    orSignUp: { en: 'or sign up with', km: 'ឬចុះឈ្មោះជាមួយ' },
    orLogIn: { en: 'or log in with', km: 'ឬចូលគណនីជាមួយ' },
    unavailable: {
      en: "Google sign-in didn't load. Use your phone number instead.",
      km: 'ការចូលដោយ Google មិនដំណើរការ។ សូមប្រើលេខទូរស័ព្ទជំនួសវិញ។',
    },
    finishTitle: { en: 'Set up your shop', km: 'រៀបចំហាងរបស់អ្នក' },
    signedInAs: {
      en: (provider: string, who: string) => `Signed in with ${provider} as ${who}.`,
      km: (provider: string, who: string) => `បានចូលដោយ ${provider} ជា ${who}។`,
    },
    phoneWhy: {
      en: 'For customers to reach you, and to log in.',
      km: 'សម្រាប់អតិថិជនទាក់ទងអ្នក និងសម្រាប់ចូលគណនី។',
    },
    phoneHasShop: {
      en: (provider: string) =>
        `This number already has a shop. Log in with it, then connect ${provider} in Settings → Your account.`,
      km: (provider: string) =>
        `លេខនេះមានហាងរួចហើយ។ សូមចូលគណនីដោយលេខនោះ រួចភ្ជាប់ ${provider} ក្នុង ការកំណត់ → គណនីរបស់អ្នក។`,
    },
    expired: {
      en: 'This took too long. Please start again.',
      km: 'ចំណាយពេលយូរពេក។ សូមចាប់ផ្ដើមម្ដងទៀត។',
    },
    // /auth/<provider>/callback: back from Facebook or TikTok.
    working: { en: 'Logging you in…', km: 'កំពុងចូលគណនី…' },
    failedTitle: { en: "Couldn't log you in", km: 'មិនអាចចូលគណនីបាន' },
    cancelled: {
      en: (provider: string) => `${provider} didn't log you in (it was cancelled or refused).`,
      km: (provider: string) => `${provider} មិនបានឱ្យអ្នកចូលទេ (បានបោះបង់ ឬត្រូវបានបដិសេធ)។`,
    },
    stale: {
      en: 'This sign-in expired. Please try again.',
      km: 'ការចូលនេះផុតកំណត់។ សូមព្យាយាមម្ដងទៀត។',
    },
    tryAgain: { en: 'Back to log in', km: 'ត្រឡប់ទៅចូលគណនី' },
    backToAccount: { en: 'Back to Your account', km: 'ត្រឡប់ទៅគណនីរបស់អ្នក' },
  },
  // Proving the phone number through the Telegram bot. The bot's button is
  // “ចែករំលែកលេខទូរស័ព្ទ” (backend/app/services/telegram.py).
  phoneCheck: {
    verify: { en: 'Verify with Telegram', km: 'ផ្ទៀងផ្ទាត់ជាមួយ Telegram' },
    hint: {
      en: 'Tap it, then “Share my phone number” in our Telegram bot.',
      km: 'ចុចប៊ូតុងនេះ រួចចុច “ចែករំលែកលេខទូរស័ព្ទ” ក្នុង bot Telegram របស់យើង។',
    },
    waiting: {
      en: 'Waiting… Tap “Share my phone number” in Telegram, then come back.',
      km: 'កំពុងរង់ចាំ… ចុច “ចែករំលែកលេខទូរស័ព្ទ” ក្នុង Telegram រួចត្រឡប់មកវិញ។',
    },
    verified: { en: 'Verified with Telegram', km: 'បានផ្ទៀងផ្ទាត់ជាមួយ Telegram' },
    another: { en: 'Use another number', km: 'ប្រើលេខផ្សេង' },
    again: { en: 'Start again', km: 'ចាប់ផ្ដើមម្ដងទៀត' },
    taken: { en: 'This number already has a shop.', km: 'លេខនេះមានហាងរួចហើយ។' },
  },
  login: {
    title: { en: 'Welcome back', km: 'សូមស្វាគមន៍ការត្រឡប់មកវិញ' },
    newHere: { en: 'New here?', km: 'ទើបមកលើកដំបូង?' },
  },
  // Forgot password? A link to the shop's Telegram; else Oak Order resets it.
  forgot: {
    link: { en: 'Forgot password?', km: 'ភ្លេចពាក្យសម្ងាត់?' },
    title: { en: 'Forgot your password?', km: 'ភ្លេចពាក្យសម្ងាត់?' },
    subtitle: {
      en: "We'll send a link to your shop's Telegram.",
      km: 'យើងនឹងផ្ញើតំណទៅ Telegram របស់ហាងអ្នក។',
    },
    send: { en: 'Send link', km: 'ផ្ញើតំណ' },
    sentTitle: { en: 'Check Telegram', km: 'សូមពិនិត្យ Telegram' },
    sent: {
      en: (login: string) =>
        `If ${login} has Telegram connected, our message is on its way. The link works for 30 minutes.`,
      km: (login: string) =>
        `បើ ${login} បានភ្ជាប់ Telegram សាររបស់យើងកំពុងផ្ញើទៅ។ តំណប្រើបាន 30 នាទី។`,
    },
    noTelegram: {
      en: 'No message? Oak Order can reset it for you.',
      km: 'មិនទទួលបានសារ? Oak Order អាចកំណត់វាឡើងវិញឱ្យអ្នក។',
    },
    askSupport: { en: 'Message Oak Order', km: 'ផ្ញើសារទៅ Oak Order' },
    supportText: {
      en: (login: string) => `Hi Oak Order, I forgot the password for ${login}.`,
      km: (login: string) => `សួស្ដី Oak Order ខ្ញុំភ្លេចពាក្យសម្ងាត់សម្រាប់ ${login}។`,
    },
    staff: {
      en: 'Staff: ask the owner to reset it in Settings → Staff.',
      km: 'បុគ្គលិក៖ សូមឱ្យម្ចាស់ហាងកំណត់ឡើងវិញ ក្នុង ការកំណត់ → បុគ្គលិក។',
    },
    backToLogin: { en: 'Back to log in', km: 'ត្រឡប់ទៅចូលគណនី' },
  },
  reset: {
    title: { en: 'Choose a new password', km: 'ជ្រើសពាក្យសម្ងាត់ថ្មី' },
    subtitle: {
      en: 'Other phones will be logged out.',
      km: 'ទូរស័ព្ទផ្សេងទៀតនឹងត្រូវចាកចេញ។',
    },
    save: { en: 'Save and log in', km: 'រក្សាទុក ហើយចូលគណនី' },
    noLink: {
      en: 'This page needs the link from Telegram.',
      km: 'ទំព័រនេះត្រូវការតំណពី Telegram។',
    },
    askAgain: { en: 'Ask for a new link', km: 'ស្នើតំណថ្មី' },
  },
  register: {
    haveAccount: { en: 'Already have an account?', km: 'មានគណនីរួចហើយ?' },
    storeName: { en: 'Shop name', km: 'ឈ្មោះហាង' },
    storeNameHint: {
      en: 'You can change it later.',
      km: 'អ្នកអាចប្ដូរវានៅពេលក្រោយបាន។',
    },
    shopLink: { en: 'Shop link', km: 'តំណហាង' },
    shopLinkHint: {
      en: 'English letters. You can change it later.',
      km: 'ជាអក្សរអង់គ្លេស។ អ្នកអាចប្ដូរវានៅពេលក្រោយបាន។',
    },
    // While the link is empty after a shop name with no English letters.
    shopLinkAsk: {
      en: 'Type it in English letters, or we pick a random one.',
      km: 'សូមវាយជាអក្សរអង់គ្លេស បើមិនវាយ យើងនឹងដាក់តំណចៃដន្យឱ្យ។',
    },
    yourName: { en: 'Your name', km: 'ឈ្មោះរបស់អ្នក' },
    phoneLabel: { en: 'Phone number (you log in with it)', km: 'លេខទូរស័ព្ទ (អ្នកប្រើវាដើម្បីចូលគណនី)' },
    passwordHint: { en: 'At least 8 characters.', km: 'យ៉ាងតិច 8 តួអក្សរ។' },
    submit: { en: 'Create shop', km: 'បង្កើតហាង' },
  },
} satisfies Tree
