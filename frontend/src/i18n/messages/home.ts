import type { Tree } from '../core.ts'

/** The start page for new sellers (pages/home). Every claim is from
 * docs/MARKETING_FACTS.md §3–§5, never its §6 "Don't claim". The headline
 * is auth.home.title, shared with the login and sign-up pages. */
export const home = {
  hero: {
    // One sentence, so the phone shows on the first screen (founder's pick
    // 5A, 2026-11-06); How it works says the rest.
    lead: {
      en: 'One link for your Facebook, TikTok and Instagram shop.',
      km: 'តំណតែមួយសម្រាប់ហាងរបស់អ្នកលើ Facebook, TikTok និង Instagram។',
    },
    demo: { en: 'Try a demo shop', km: 'សាកមើលហាងគំរូ' },
    // Its orders reach the founder: say so before anyone pays.
    demoNote: {
      en: "Demo shop: try an order, but don't pay the QR.",
      km: 'ហាងគំរូ៖ សាកកុម្ម៉ង់បាន តែកុំបង់ QR។',
    },
    free: {
      en: (days: string) => `Free for your first ${days} days of selling. No card.`,
      km: (days: string) => `ឥតគិតថ្លៃ ${days} ថ្ងៃដំបូងនៃការលក់។ មិនត្រូវការកាត។`,
    },
  },
  steps: {
    eyebrow: { en: 'How it works', km: 'របៀបដែលវាដំណើរការ' },
    title: { en: 'From a post to a paid order', km: 'ពីការបង្ហោះ ដល់ការកុម្ម៉ង់ដែលបានបង់ប្រាក់' },
    share: {
      title: { en: 'Share one link in every post.', km: 'ចែករំលែកតំណតែមួយ ក្នុងគ្រប់ការបង្ហោះ។' },
      text: {
        en: 'Your shop, a product or a category, with a picture card in Facebook and Telegram.',
        km: 'ហាង ទំនិញ ឬប្រភេទទំនិញរបស់អ្នក បង្ហាញជាកាតរូបភាពក្នុង Facebook និង Telegram។',
      },
    },
    order: {
      title: { en: 'Customers order in your shop.', km: 'អតិថិជនកុម្ម៉ង់ក្នុងហាងរបស់អ្នក។' },
      text: { en: 'No app, no account, no password.', km: 'មិនបាច់មានកម្មវិធី គណនី ឬពាក្យសម្ងាត់។' },
    },
    pay: {
      title: { en: 'They pay by KHQR, straight to your bank.', km: 'ពួកគេបង់តាម KHQR ចូលធនាគាររបស់អ្នកផ្ទាល់។' },
      text: {
        en: 'The QR has the exact amount. Oak Order takes no cut. One tap marks it paid.',
        km: 'QR មានចំនួនទឹកប្រាក់ត្រឹមត្រូវ។ Oak Order មិនកាត់កម្រៃទេ។ ចុចម្ដងដើម្បីកត់ថាបានបង់។',
      },
    },
    track: {
      title: { en: 'Every order in one place.', km: 'ការកុម្ម៉ង់ទាំងអស់នៅកន្លែងតែមួយ។' },
      text: {
        en: 'Each new one on your Telegram; follow it to delivered.',
        km: 'ការកុម្ម៉ង់ថ្មីនីមួយៗមកដល់ Telegram របស់អ្នក ហើយតាមដានវារហូតដល់ដៃអតិថិជន។',
      },
    },
  },
  features: {
    title: { en: 'Also in Oak Order', km: 'មានទៀតក្នុង Oak Order' },
    chat: {
      title: { en: 'Orders from chat too', km: 'ការកុម្ម៉ង់ពីការឆាតក៏បាន' },
      text: {
        en: 'Add an order that came by chat in seconds, then send the customer a link to follow and pay.',
        km: 'បញ្ចូលការកុម្ម៉ង់ដែលមកតាមការឆាតក្នុងពេលប៉ុន្មានវិនាទី រួចផ្ញើតំណឱ្យអតិថិជនតាមដាន និងបង់ប្រាក់។',
      },
    },
    stock: {
      title: { en: 'Stock counts itself', km: 'ស្តុកគណនាដោយខ្លួនឯង' },
      text: {
        en: 'It goes down with every order, and Telegram tells you when a product runs low or sells out.',
        km: 'វាថយចុះតាមការកុម្ម៉ង់នីមួយៗ ហើយ Telegram ប្រាប់អ្នកពេលទំនិញជិតអស់ ឬអស់ស្តុក។',
      },
    },
    driver: {
      title: { en: 'Send to driver', km: 'ផ្ញើទៅអ្នកដឹក' },
      text: {
        en: 'The customer, address, map pin and what to collect, in one message.',
        km: 'អតិថិជន អាសយដ្ឋាន ទីតាំងលើផែនទី និងប្រាក់ត្រូវប្រមូល ក្នុងសារតែមួយ។',
      },
    },
    receipt: {
      title: { en: 'A receipt to share or print', km: 'វិក្កយបត្រ សម្រាប់ចែករំលែក ឬបោះពុម្ព' },
      text: { en: 'A parcel slip for each order.', km: 'ក្រដាសបិទកញ្ចប់ សម្រាប់ការកុម្ម៉ង់នីមួយៗ។' },
    },
    customers: {
      title: { en: 'Your customers in one list', km: 'អតិថិជនរបស់អ្នកក្នុងបញ្ជីតែមួយ' },
      text: {
        en: "Each one's orders and what they spent.",
        km: 'ការកុម្ម៉ង់ និងទឹកប្រាក់ដែលអតិថិជននីមួយៗបានចំណាយ។',
      },
    },
    excel: {
      title: { en: 'Export your orders to Excel', km: 'ទាញយកការកុម្ម៉ង់ជា Excel' },
      text: { en: 'This month, last month or chosen days.', km: 'ខែនេះ ខែមុន ឬថ្ងៃដែលអ្នកជ្រើសរើស។' },
    },
  },
  pricing: {
    eyebrow: { en: 'Price', km: 'តម្លៃ' },
    plan: { en: 'Oak Order Standard', km: 'Oak Order Standard' },
    // Three cards: the free days, monthly, yearly.
    firstDays: { en: (days: string) => `First ${days} days`, km: (days: string) => `${days} ថ្ងៃដំបូង` },
    free: { en: 'Free', km: 'ឥតគិតថ្លៃ' },
    ofSelling: { en: 'of selling', km: 'នៃការលក់' },
    monthly: { en: 'Monthly', km: 'ប្រចាំខែ' },
    yearly: { en: 'Yearly', km: 'ប្រចាំឆ្នាំ' },
    aMonth: { en: 'a month', km: 'ក្នុងមួយខែ' },
    aYear: { en: 'a year', km: 'ក្នុងមួយឆ្នាំ' },
    save: { en: (amount: string) => `Save ${amount}`, km: (amount: string) => `សន្សំ ${amount}` },
    startsOpen: { en: 'Starts when you open your shop', km: 'ចាប់ផ្ដើមពេលអ្នកបើកហាង' },
    noCard: { en: 'No card', km: 'មិនត្រូវការកាត' },
    everything: { en: 'Everything included', km: 'មានមុខងារទាំងអស់' },
    staff: { en: 'Up to 10 staff logins', km: 'គណនីបុគ្គលិករហូតដល់ 10 នាក់' },
    byKhqr: { en: 'Pay by KHQR', km: 'បង់តាម KHQR' },
    setup: { en: 'We help you set up your shop.', km: 'យើងជួយអ្នករៀបចំហាង។' },
  },
  questions: {
    title: { en: 'Questions', km: 'សំណួរ' },
    app: {
      q: { en: 'Do my customers need an app or an account?', km: 'តើអតិថិជនរបស់ខ្ញុំត្រូវការកម្មវិធី ឬគណនីទេ?' },
      a: {
        en: "No. They open your link in their phone's browser, choose and order. Customers who use Telegram can follow their order there.",
        km: 'ទេ។ ពួកគេបើកតំណរបស់អ្នកក្នុងកម្មវិធីរុករកលើទូរស័ព្ទ ជ្រើសរើស ហើយកុម្ម៉ង់។ អតិថិជនដែលប្រើ Telegram អាចតាមដានការកុម្ម៉ង់នៅទីនោះ។',
      },
    },
    computer: {
      q: { en: 'Do I need a computer?', km: 'តើខ្ញុំត្រូវការកុំព្យូទ័រទេ?' },
      a: {
        en: "No. Oak Order works in your phone's browser, with nothing to install. A laptop works too.",
        km: 'ទេ។ Oak Order ដំណើរការក្នុងកម្មវិធីរុករកលើទូរស័ព្ទរបស់អ្នក មិនបាច់ដំឡើងអ្វីទេ។ កុំព្យូទ័រយួរដៃក៏ប្រើបានដែរ។',
      },
    },
    pay: {
      q: { en: 'How do customers pay?', km: 'តើអតិថិជនបង់ប្រាក់ដោយរបៀបណា?' },
      a: {
        en: 'By KHQR, straight into your own bank account (ABA, ACLEDA, Wing and other Bakong banks), or in cash on delivery. You check your bank app and tap Mark paid.',
        km: 'តាម KHQR ចូលគណនីធនាគាររបស់អ្នកផ្ទាល់ (ABA, ACLEDA, Wing និងធនាគារ Bakong ផ្សេងទៀត) ឬជាសាច់ប្រាក់ពេលទទួលទំនិញ។ អ្នកពិនិត្យកម្មវិធីធនាគារ ហើយចុច «កត់ថាបានបង់»។',
      },
    },
    after: {
      q: {
        en: (days: string) => `What happens after ${days} days?`,
        km: (days: string) => `តើមានអ្វីកើតឡើងបន្ទាប់ពី ${days} ថ្ងៃ?`,
      },
      a: {
        en: (month: string, year: string) =>
          `It's ${month} a month or ${year} a year, paid by KHQR. If you don't pay, nothing is deleted, and paying opens your shop again at once.`,
        km: (month: string, year: string) =>
          `គឺ ${month} ក្នុងមួយខែ ឬ ${year} ក្នុងមួយឆ្នាំ បង់តាម KHQR។ បើអ្នកមិនបង់ គ្មានអ្វីត្រូវលុបទេ ហើយពេលបង់ ហាងរបស់អ្នកបើកវិញភ្លាម។`,
      },
    },
    chat: {
      q: { en: 'Can I still take orders in chat?', km: 'តើខ្ញុំនៅតែអាចទទួលការកុម្ម៉ង់តាមការឆាតបានទេ?' },
      a: {
        en: "Yes. Add a chat order in Oak Order and it's counted with the rest, stock and all.",
        km: 'បាន។ បញ្ចូលការកុម្ម៉ង់ពីការឆាតក្នុង Oak Order ហើយវាត្រូវបានរាប់ជាមួយការកុម្ម៉ង់ផ្សេងទៀត រួមទាំងស្តុកផង។',
      },
    },
  },
  bottom: {
    title: { en: 'Your shop can be ready today.', km: 'ហាងរបស់អ្នកអាចរួចរាល់នៅថ្ងៃនេះ។' },
    help: { en: 'Questions? Message us on Telegram', km: 'មានសំណួរ? ផ្ញើសារមកយើងតាម Telegram' },
  },
  // What each phone screen shows, for screen readers.
  screens: {
    shop: { en: 'The demo shop Oak Phone on a phone', km: 'ហាងគំរូ Oak Phone លើទូរស័ព្ទ' },
    share: { en: 'Sharing a product link to Facebook', km: 'ការចែករំលែកតំណទំនិញទៅ Facebook' },
    checkout: { en: 'A customer placing an order', km: 'អតិថិជនកំពុងកុម្ម៉ង់' },
    khqr: { en: 'The KHQR with the exact amount', km: 'KHQR ដែលមានចំនួនទឹកប្រាក់ត្រឹមត្រូវ' },
    orders: { en: "The seller's Orders tab", km: 'ផ្ទាំងការកុម្ម៉ង់របស់អ្នកលក់' },
  },
} satisfies Tree
