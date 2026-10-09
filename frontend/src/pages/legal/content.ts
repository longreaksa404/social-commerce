import type { Lang } from '../../i18n/core.ts'

/** The privacy policy, terms and data deletion pages (/privacy, /terms,
 * /data-deletion), which Meta and TikTok ask for before "Continue with
 * Facebook / TikTok" can go live (2026-10-09). Plain words, in both
 * languages. Facts in them (what's kept, who hosts it, how long) follow
 * the code and docs/02_TECHNICAL.md: change them together.
 *
 * A block is a paragraph, or a list when it's an array. The contact
 * section is added by the page (it links Oak Order's Telegram). */
export type LegalDoc = 'privacy' | 'terms' | 'data-deletion'
export type Block = string | string[]
export type LegalPage = { title: string; intro: string; sections: { heading: string; body: Block[] }[] }

// Change it with the text.
export const UPDATED = '2026-10-09'

const en: Record<LegalDoc, LegalPage> = {
  privacy: {
    title: 'Privacy Policy',
    intro:
      'Oak Order (order.oaksolve.com) helps sellers in Cambodia take orders from Facebook, TikTok, Instagram and Telegram through a link to their own shop. This page says what we keep, why, who helps us run the service, and how to have your data deleted.',
    sections: [
      {
        heading: 'What we keep about sellers',
        body: [
          [
            'Your name, the phone number you log in with (checked through our Telegram bot), and your password, which we keep only in scrambled form (a hash) and can never read.',
            "If you log in with Google, Facebook or TikTok: that account's ID, and the name and email it gives us (TikTok gives no email). We never get your password there, your posts or your friends.",
            "Your shop: its name, link, logo and description, your products, photos and prices, your delivery and payment details (such as a bank account number or KHQR account, which customers see so they can pay you), your contact buttons, and your staff's names and phone numbers.",
            'Your chat with our Telegram bot, so we can send you order alerts and "choose a new password" links.',
            "Your shop's orders and customers (below).",
          ],
        ],
      },
      {
        heading: 'What we keep about customers who order from a shop',
        body: [
          [
            "Their name, phone number, delivery address, the map location if they share it, their notes, and what they ordered. The shop sees these to deliver the order. Each shop's customers are kept apart from every other shop's.",
            "On the customer's own phone, not on our servers, the app remembers their name, phone, cart and recent orders, so their next order is quicker.",
            "When someone opens a shop through a shared link, we only count the visit. We don't record who they are.",
          ],
        ],
      },
      {
        heading: 'Why we keep it',
        body: [
          "To run the shops: show products, take and deliver orders, send alerts, and let you log in. We don't use your data for advertising, and we don't sell it or give it to advertisers.",
        ],
      },
      {
        heading: 'Who helps us run Oak Order',
        body: [
          'These companies process data only to provide their service to us:',
          [
            'Render: our server (Singapore).',
            'Neon: our database (Singapore).',
            'Vercel: the website.',
            'Cloudflare: the domain, photo storage and nightly backups.',
            'Telegram: order alerts and phone number checks.',
            'Sentry: reports when something breaks, so we can fix it.',
            'Google, Facebook and TikTok: only when you choose to log in with them.',
          ],
        ],
      },
      {
        heading: 'Cookies and storage on your device',
        body: [
          'One cookie keeps you logged in (on api.oaksolve.com; no script on the page can read it). The app also stores a few settings on your device: your language, light or dark, and whether you are logged in. We use no advertising or tracking cookies.',
        ],
      },
      {
        heading: 'How long we keep it',
        body: [
          "As long as your shop is open. A closed shop is kept until you ask us to erase it, so it can be opened again. After we erase a shop, our backups still hold a copy for up to 30 days, then it's gone.",
        ],
      },
      {
        heading: 'Your choices',
        body: [
          [
            'See and change your details in Settings → Your account.',
            'Close your shop at any time in Settings → Close shop.',
            'Have your account and data deleted: see the Data deletion page.',
            'Customers who want their details removed can ask the shop, or us.',
          ],
        ],
      },
      {
        heading: 'Children',
        body: ['Oak Order is for sellers aged 18 or older. It is not meant for children under 13.'],
      },
      {
        heading: 'Changes',
        body: ['If this policy changes, we update this page and the date at the top.'],
      },
    ],
  },
  terms: {
    title: 'Terms of Service',
    intro:
      'These terms are the agreement between you and Oak Order when you open a shop on order.oaksolve.com. By creating a shop, you accept them.',
    sections: [
      {
        heading: 'The service',
        body: [
          'Oak Order gives sellers a shop link, a product list and a place to manage orders. Customers buy from the seller, not from Oak Order.',
        ],
      },
      {
        heading: 'Your account',
        body: [
          "You must be 18 or older and sign up with your own phone number. Keep your password private. You're responsible for what happens in your account, including what your staff do with their logins.",
        ],
      },
      {
        heading: 'Your shop',
        body: [
          "You're responsible for what you sell, your prices, your product descriptions and photos, delivering orders and handling returns, and for following the law of Cambodia. Don't sell anything illegal, fake or dangerous, and don't use Oak Order to mislead or cheat customers.",
        ],
      },
      {
        heading: 'Money between you and your customers',
        body: [
          "Customers pay you directly (cash, bank transfer or KHQR). Oak Order doesn't hold or move that money and isn't part of the sale.",
        ],
      },
      {
        heading: 'Fees',
        body: [
          'Oak Order may charge a subscription to use the service. You will see the price before you pay, and nothing is charged without your agreement.',
        ],
      },
      {
        heading: 'Your content',
        body: [
          'Your products, photos and shop details stay yours. You let Oak Order store and show them so that your shop works.',
        ],
      },
      {
        heading: 'Closing a shop',
        body: [
          "You can close your shop at any time in Settings → Close shop. We may close a shop that breaks these terms or harms customers, and we'll tell you why.",
        ],
      },
      {
        heading: 'No guarantee',
        body: [
          "We work to keep Oak Order running and your data safe, but the service is provided as it is, and it may sometimes be unavailable. As far as the law allows, Oak Order isn't responsible for lost sales or profits.",
        ],
      },
      {
        heading: 'Changes',
        body: [
          "We may update these terms. We'll update this page and its date, and tell you in the app about important changes.",
        ],
      },
      {
        heading: 'Law',
        body: ['These terms follow the laws of the Kingdom of Cambodia.'],
      },
    ],
  },
  'data-deletion': {
    title: 'Data deletion',
    intro: 'How to have your Oak Order account and data deleted.',
    sections: [
      {
        heading: 'If you have a shop',
        body: [
          [
            'Close your shop in Settings → Close shop. Your shop link and logins stop at once.',
            "Message Oak Order on Telegram (below) from the phone number of your account, and ask us to erase it.",
            "We erase your account, your shop and everything in it (products, photos, orders, customers, links, alerts) and tell you when it's done, within 30 days. Copies in our backups are gone 30 days after that.",
          ],
        ],
      },
      {
        heading: 'If you logged in with Facebook, Google or TikTok',
        body: [
          'Follow the steps above to delete what Oak Order keeps. You can also remove Oak Order from that account: on Facebook, Settings & privacy → Settings → Apps and websites → Oak Order → Remove; on Google, myaccount.google.com → Security → Your connections to third-party apps; on TikTok, Settings and privacy → Security → Manage app permissions. That stops the login; it does not delete your shop by itself.',
        ],
      },
      {
        heading: "If you ordered from a shop",
        body: [
          "Ask the shop, or message Oak Order with the shop's name and the phone number you ordered with. We'll remove your name, phone number and address from that shop within 30 days.",
        ],
      },
    ],
  },
}

const km: Record<LegalDoc, LegalPage> = {
  privacy: {
    title: 'គោលការណ៍ឯកជនភាព',
    intro:
      'Oak Order (order.oaksolve.com) ជួយអ្នកលក់នៅកម្ពុជាទទួលការកុម្ម៉ង់ពី Facebook, TikTok, Instagram និង Telegram តាមរយៈតំណទៅហាងរបស់ខ្លួន។ ទំព័រនេះប្រាប់ថាយើងរក្សាទុកអ្វីខ្លះ ហេតុអ្វី អ្នកណាជួយយើងដំណើរការសេវាកម្ម និងរបៀបស្នើឱ្យលុបទិន្នន័យរបស់អ្នក។',
    sections: [
      {
        heading: 'អ្វីដែលយើងរក្សាទុកអំពីអ្នកលក់',
        body: [
          [
            'ឈ្មោះរបស់អ្នក លេខទូរស័ព្ទដែលអ្នកប្រើចូលគណនី (ផ្ទៀងផ្ទាត់តាម bot Telegram របស់យើង) និងពាក្យសម្ងាត់ ដែលយើងរក្សាទុកតែជាទម្រង់កូដ (hash) ហើយមិនអាចអានវាបានឡើយ។',
            'បើអ្នកចូលដោយ Google, Facebook ឬ TikTok៖ លេខសម្គាល់គណនីនោះ និងឈ្មោះ និងអ៊ីមែលដែលវាផ្ដល់ឱ្យយើង (TikTok មិនផ្ដល់អ៊ីមែលទេ)។ យើងមិនដែលទទួលបានពាក្យសម្ងាត់ ការបង្ហោះ ឬមិត្តភក្តិរបស់អ្នកនៅទីនោះឡើយ។',
            'ហាងរបស់អ្នក៖ ឈ្មោះ តំណ ឡូហ្គោ និងការពិពណ៌នា ទំនិញ រូបថត និងតម្លៃ ព័ត៌មានដឹកជញ្ជូន និងបង់ប្រាក់ (ដូចជាលេខគណនីធនាគារ ឬគណនី KHQR ដែលអតិថិជនឃើញ ដើម្បីបង់ប្រាក់ឱ្យអ្នក) ប៊ូតុងទំនាក់ទំនង និងឈ្មោះ និងលេខទូរស័ព្ទរបស់បុគ្គលិកអ្នក។',
            'ការឆាតរបស់អ្នកជាមួយ bot Telegram របស់យើង ដើម្បីផ្ញើការជូនដំណឹងការកុម្ម៉ង់ និងតំណ “ជ្រើសពាក្យសម្ងាត់ថ្មី”។',
            'ការកុម្ម៉ង់ និងអតិថិជនរបស់ហាងអ្នក (ខាងក្រោម)។',
          ],
        ],
      },
      {
        heading: 'អ្វីដែលយើងរក្សាទុកអំពីអតិថិជនដែលកុម្ម៉ង់ពីហាង',
        body: [
          [
            'ឈ្មោះ លេខទូរស័ព្ទ អាសយដ្ឋានដឹកជញ្ជូន ទីតាំងលើផែនទីបើពួកគេចែករំលែក កំណត់ចំណាំ និងអ្វីដែលពួកគេកុម្ម៉ង់។ ហាងឃើញព័ត៌មានទាំងនេះ ដើម្បីដឹកការកុម្ម៉ង់។ អតិថិជនរបស់ហាងនីមួយៗត្រូវបានរក្សាដាច់ដោយឡែកពីហាងផ្សេងទៀត។',
            'នៅលើទូរស័ព្ទរបស់អតិថិជនផ្ទាល់ មិនមែននៅលើម៉ាស៊ីនមេរបស់យើងទេ កម្មវិធីចងចាំឈ្មោះ លេខទូរស័ព្ទ កន្ត្រក និងការកុម្ម៉ង់ថ្មីៗ ដើម្បីឱ្យការកុម្ម៉ង់លើកក្រោយលឿនជាងមុន។',
            'ពេលនរណាម្នាក់បើកហាងតាមតំណដែលបានចែករំលែក យើងគ្រាន់តែរាប់ការចូលមើលប៉ុណ្ណោះ។ យើងមិនកត់ត្រាថាពួកគេជានរណាទេ។',
          ],
        ],
      },
      {
        heading: 'ហេតុអ្វីយើងរក្សាទុក',
        body: [
          'ដើម្បីដំណើរការហាង៖ បង្ហាញទំនិញ ទទួល និងដឹកការកុម្ម៉ង់ ផ្ញើការជូនដំណឹង និងឱ្យអ្នកចូលគណនីបាន។ យើងមិនប្រើទិន្នន័យរបស់អ្នកសម្រាប់ការផ្សាយពាណិជ្ជកម្មទេ ហើយយើងមិនលក់ ឬផ្ដល់វាទៅអ្នកផ្សាយពាណិជ្ជកម្មឡើយ។',
        ],
      },
      {
        heading: 'អ្នកណាជួយយើងដំណើរការ Oak Order',
        body: [
          'ក្រុមហ៊ុនទាំងនេះដំណើរការទិន្នន័យ តែដើម្បីផ្ដល់សេវាកម្មរបស់ពួកគេដល់យើងប៉ុណ្ណោះ៖',
          [
            'Render៖ ម៉ាស៊ីនមេរបស់យើង (សិង្ហបុរី)។',
            'Neon៖ មូលដ្ឋានទិន្នន័យរបស់យើង (សិង្ហបុរី)។',
            'Vercel៖ គេហទំព័រ។',
            'Cloudflare៖ ដែន ទីផ្ទុករូបថត និងការបម្រុងទុករៀងរាល់យប់។',
            'Telegram៖ ការជូនដំណឹងការកុម្ម៉ង់ និងការផ្ទៀងផ្ទាត់លេខទូរស័ព្ទ។',
            'Sentry៖ របាយការណ៍ពេលមានអ្វីខូច ដើម្បីឱ្យយើងជួសជុលបាន។',
            'Google, Facebook និង TikTok៖ តែពេលអ្នកជ្រើសចូលគណនីតាមពួកវាប៉ុណ្ណោះ។',
          ],
        ],
      },
      {
        heading: 'Cookie និងការរក្សាទុកនៅលើឧបករណ៍របស់អ្នក',
        body: [
          'Cookie មួយរក្សាអ្នកឱ្យនៅតែចូលគណនី (នៅលើ api.oaksolve.com ហើយគ្មានស្គ្រីបណាមួយលើទំព័រអាចអានវាបានទេ)។ កម្មវិធីក៏រក្សាទុកការកំណត់មួយចំនួនតូចនៅលើឧបករណ៍របស់អ្នកដែរ៖ ភាសា ភ្លឺ ឬងងឹត និងថាតើអ្នកកំពុងចូលគណនីឬអត់។ យើងមិនប្រើ cookie សម្រាប់ផ្សាយពាណិជ្ជកម្ម ឬតាមដានទេ។',
        ],
      },
      {
        heading: 'រយៈពេលដែលយើងរក្សាទុក',
        body: [
          'ដរាបណាហាងរបស់អ្នកនៅបើក។ ហាងដែលបានបិទត្រូវបានរក្សាទុក រហូតដល់អ្នកស្នើឱ្យយើងលុបវាចោល ដើម្បីឱ្យអាចបើកវាវិញបាន។ ក្រោយពេលយើងលុបហាងមួយ ការបម្រុងទុករបស់យើងនៅតែមានច្បាប់ចម្លងរហូតដល់ 30 ថ្ងៃ បន្ទាប់មកវាត្រូវបានលុបចោល។',
        ],
      },
      {
        heading: 'ជម្រើសរបស់អ្នក',
        body: [
          [
            'មើល និងកែប្រែព័ត៌មានរបស់អ្នក នៅក្នុង ការកំណត់ → គណនីរបស់អ្នក។',
            'បិទហាងរបស់អ្នកបានគ្រប់ពេល នៅក្នុង ការកំណត់ → បិទហាង។',
            'ស្នើឱ្យលុបគណនី និងទិន្នន័យរបស់អ្នក៖ សូមមើលទំព័រ ការលុបទិន្នន័យ។',
            'អតិថិជនដែលចង់ឱ្យលុបព័ត៌មានរបស់ខ្លួន អាចស្នើទៅហាង ឬមកយើង។',
          ],
        ],
      },
      {
        heading: 'កុមារ',
        body: ['Oak Order សម្រាប់អ្នកលក់ដែលមានអាយុ 18 ឆ្នាំឡើងទៅ។ វាមិនមែនសម្រាប់កុមារអាយុក្រោម 13 ឆ្នាំទេ។'],
      },
      {
        heading: 'ការផ្លាស់ប្ដូរ',
        body: ['បើគោលការណ៍នេះផ្លាស់ប្ដូរ យើងនឹងកែទំព័រនេះ និងកាលបរិច្ឆេទនៅខាងលើ។'],
      },
    ],
  },
  terms: {
    title: 'លក្ខខណ្ឌប្រើប្រាស់',
    intro:
      'លក្ខខណ្ឌទាំងនេះជាកិច្ចព្រមព្រៀងរវាងអ្នក និង Oak Order ពេលអ្នកបើកហាងនៅលើ order.oaksolve.com។ ការបង្កើតហាង មានន័យថាអ្នកយល់ព្រមនឹងលក្ខខណ្ឌទាំងនេះ។',
    sections: [
      {
        heading: 'សេវាកម្ម',
        body: [
          'Oak Order ផ្ដល់ឱ្យអ្នកលក់នូវតំណហាង បញ្ជីទំនិញ និងកន្លែងគ្រប់គ្រងការកុម្ម៉ង់។ អតិថិជនទិញពីអ្នកលក់ មិនមែនពី Oak Order ទេ។',
        ],
      },
      {
        heading: 'គណនីរបស់អ្នក',
        body: [
          'អ្នកត្រូវមានអាយុ 18 ឆ្នាំឡើងទៅ ហើយចុះឈ្មោះដោយលេខទូរស័ព្ទផ្ទាល់ខ្លួន។ សូមរក្សាពាក្យសម្ងាត់ជាការសម្ងាត់។ អ្នកទទួលខុសត្រូវចំពោះអ្វីដែលកើតឡើងក្នុងគណនីរបស់អ្នក រួមទាំងអ្វីដែលបុគ្គលិករបស់អ្នកធ្វើជាមួយគណនីរបស់ពួកគេ។',
        ],
      },
      {
        heading: 'ហាងរបស់អ្នក',
        body: [
          'អ្នកទទួលខុសត្រូវចំពោះអ្វីដែលអ្នកលក់ តម្លៃ ការពិពណ៌នា និងរូបថតទំនិញ ការដឹកការកុម្ម៉ង់ និងការដោះស្រាយការប្ដូរ ឬប្រគល់ទំនិញវិញ ហើយត្រូវគោរពច្បាប់នៃប្រទេសកម្ពុជា។ កុំលក់អ្វីដែលខុសច្បាប់ ក្លែងក្លាយ ឬគ្រោះថ្នាក់ ហើយកុំប្រើ Oak Order ដើម្បីបោកបញ្ឆោតអតិថិជន។',
        ],
      },
      {
        heading: 'ប្រាក់រវាងអ្នក និងអតិថិជន',
        body: [
          'អតិថិជនបង់ប្រាក់ទៅអ្នកដោយផ្ទាល់ (សាច់ប្រាក់ ផ្ទេរតាមធនាគារ ឬ KHQR)។ Oak Order មិនកាន់ ឬផ្ទេរប្រាក់នោះទេ ហើយមិនមែនជាភាគីនៃការលក់នោះឡើយ។',
        ],
      },
      {
        heading: 'ថ្លៃសេវា',
        body: [
          'Oak Order អាចគិតថ្លៃជាវប្រចាំ ដើម្បីប្រើសេវាកម្ម។ អ្នកនឹងឃើញតម្លៃមុនពេលបង់ ហើយគ្មានការគិតប្រាក់ណាមួយដោយគ្មានការយល់ព្រមពីអ្នកឡើយ។',
        ],
      },
      {
        heading: 'មាតិការបស់អ្នក',
        body: [
          'ទំនិញ រូបថត និងព័ត៌មានហាងរបស់អ្នក នៅតែជារបស់អ្នក។ អ្នកអនុញ្ញាតឱ្យ Oak Order រក្សាទុក និងបង្ហាញវា ដើម្បីឱ្យហាងរបស់អ្នកដំណើរការ។',
        ],
      },
      {
        heading: 'ការបិទហាង',
        body: [
          'អ្នកអាចបិទហាងរបស់អ្នកបានគ្រប់ពេល នៅក្នុង ការកំណត់ → បិទហាង។ យើងអាចបិទហាងដែលបំពានលក្ខខណ្ឌទាំងនេះ ឬធ្វើឱ្យខូចប្រយោជន៍អតិថិជន ហើយយើងនឹងប្រាប់អ្នកពីមូលហេតុ។',
        ],
      },
      {
        heading: 'គ្មានការធានា',
        body: [
          'យើងខិតខំរក្សាឱ្យ Oak Order ដំណើរការ និងទិន្នន័យរបស់អ្នកមានសុវត្ថិភាព ប៉ុន្តែសេវាកម្មត្រូវបានផ្ដល់ជូនតាមស្ថានភាពជាក់ស្ដែង ហើយពេលខ្លះអាចមិនដំណើរការ។ ក្នុងកម្រិតដែលច្បាប់អនុញ្ញាត Oak Order មិនទទួលខុសត្រូវចំពោះការបាត់បង់ការលក់ ឬប្រាក់ចំណេញឡើយ។',
        ],
      },
      {
        heading: 'ការផ្លាស់ប្ដូរ',
        body: [
          'យើងអាចកែប្រែលក្ខខណ្ឌទាំងនេះ។ យើងនឹងកែទំព័រនេះ និងកាលបរិច្ឆេទរបស់វា ហើយប្រាប់អ្នកក្នុងកម្មវិធីពីការផ្លាស់ប្ដូរសំខាន់ៗ។',
        ],
      },
      {
        heading: 'ច្បាប់',
        body: ['លក្ខខណ្ឌទាំងនេះអនុវត្តតាមច្បាប់នៃព្រះរាជាណាចក្រកម្ពុជា។'],
      },
    ],
  },
  'data-deletion': {
    title: 'ការលុបទិន្នន័យ',
    intro: 'របៀបស្នើឱ្យលុបគណនី និងទិន្នន័យ Oak Order របស់អ្នក។',
    sections: [
      {
        heading: 'បើអ្នកមានហាង',
        body: [
          [
            'បិទហាងរបស់អ្នក នៅក្នុង ការកំណត់ → បិទហាង។ តំណហាង និងការចូលគណនីឈប់ដំណើរការភ្លាមៗ។',
            'ផ្ញើសារទៅ Oak Order តាម Telegram (ខាងក្រោម) ពីលេខទូរស័ព្ទនៃគណនីរបស់អ្នក ហើយស្នើឱ្យយើងលុបវាចោល។',
            'យើងលុបគណនី ហាង និងអ្វីៗទាំងអស់នៅក្នុងនោះ (ទំនិញ រូបថត ការកុម្ម៉ង់ អតិថិជន តំណ ការជូនដំណឹង) ហើយប្រាប់អ្នកពេលរួចរាល់ ក្នុងរយៈពេល 30 ថ្ងៃ។ ច្បាប់ចម្លងក្នុងការបម្រុងទុករបស់យើង ត្រូវបានលុបចោល 30 ថ្ងៃបន្ទាប់ពីនោះ។',
          ],
        ],
      },
      {
        heading: 'បើអ្នកបានចូលដោយ Facebook, Google ឬ TikTok',
        body: [
          'សូមធ្វើតាមជំហានខាងលើ ដើម្បីលុបអ្វីដែល Oak Order រក្សាទុក។ អ្នកក៏អាចដក Oak Order ចេញពីគណនីនោះបានដែរ៖ នៅលើ Facebook ការកំណត់ និងឯកជនភាព → ការកំណត់ → កម្មវិធី និងគេហទំព័រ → Oak Order → ដកចេញ។ នៅលើ Google myaccount.google.com → សុវត្ថិភាព → ការតភ្ជាប់របស់អ្នកទៅកម្មវិធីភាគីទីបី។ នៅលើ TikTok ការកំណត់ និងឯកជនភាព → សុវត្ថិភាព → គ្រប់គ្រងការអនុញ្ញាតកម្មវិធី។ ការធ្វើបែបនេះបញ្ឈប់ការចូលគណនី ប៉ុន្តែមិនលុបហាងរបស់អ្នកដោយខ្លួនឯងទេ។',
        ],
      },
      {
        heading: 'បើអ្នកបានកុម្ម៉ង់ពីហាង',
        body: [
          'សូមស្នើទៅហាង ឬផ្ញើសារទៅ Oak Order ជាមួយឈ្មោះហាង និងលេខទូរស័ព្ទដែលអ្នកប្រើពេលកុម្ម៉ង់។ យើងនឹងលុបឈ្មោះ លេខទូរស័ព្ទ និងអាសយដ្ឋានរបស់អ្នកចេញពីហាងនោះ ក្នុងរយៈពេល 30 ថ្ងៃ។',
        ],
      },
    ],
  },
}

export const LEGAL: Record<Lang, Record<LegalDoc, LegalPage>> = { en, km }
