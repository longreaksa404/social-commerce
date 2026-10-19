import type { Tree } from '../core.ts'

/** The seller's Settings tab. */
export const settings = {
  title: { en: 'Settings', km: 'ការកំណត់' },
  saved: { en: 'Settings saved', km: 'បានរក្សាទុកការកំណត់' },
  save: { en: 'Save settings', km: 'រក្សាទុកការកំណត់' },

  // "Shop" everywhere in English, as ហាង in Khmer (UX check #29).
  store: { en: 'Shop', km: 'ហាង' },
  storeName: { en: 'Shop name', km: 'ឈ្មោះហាង' },
  description: { en: 'Description', km: 'ការពិពណ៌នា' },
  currency: { en: 'Currency', km: 'រូបិយប័ណ្ណ' },
  currencyHint: {
    en: 'Existing prices are not converted.',
    km: 'តម្លៃដែលមានស្រាប់មិនត្រូវបានប្ដូរទេ។',
  },
  // Asked at Save when the currency changes (settings check #1,
  // 2026-10-19). Prices aren't converted: a rate set by Oak Order is logged
  // for later.
  switchTitle: {
    KHR: { en: 'Switch to riel?', km: 'ប្ដូរទៅប្រាក់រៀល?' },
    USD: { en: 'Switch to dollars?', km: 'ប្ដូរទៅប្រាក់ដុល្លារ?' },
  },
  switchButton: {
    KHR: { en: 'Switch to riel', km: 'ប្ដូរទៅប្រាក់រៀល' },
    USD: { en: 'Switch to dollars', km: 'ប្ដូរទៅប្រាក់ដុល្លារ' },
  },
  // `example`: "Linen Shirt $12.00 becomes 12៛", or ''.
  switchMessage: {
    en: (example: string) => `Prices keep their numbers${example ? `: ${example}` : ''}. Change your prices after.`,
    km: (example: string) => `តម្លៃនៅលេខដដែល${example ? `៖ ${example}` : ''}។ សូមកែតម្លៃបន្ទាប់ពីប្ដូរ។`,
  },
  switchExample: {
    en: (name: string, from: string, to: string) => `${name} ${from} becomes ${to}`,
    km: (name: string, from: string, to: string) => `${name} ${from} ក្លាយជា ${to}`,
  },
  usd: { en: 'US dollar ($)', km: 'ដុល្លារអាមេរិក ($)' },
  khr: { en: 'Cambodian riel (៛)', km: 'ប្រាក់រៀល (៛)' },
  logo: { en: 'Shop logo', km: 'ឡូហ្គោហាង' },
  logoHint: {
    en: 'A square picture works best.',
    km: 'រូបការ៉េល្អបំផុត។',
  },
  addLogo: { en: 'Add logo', km: 'បន្ថែមឡូហ្គោ' },
  changeLogo: { en: 'Change logo', km: 'ប្ដូរឡូហ្គោ' },
  removeLogo: { en: 'Remove logo', km: 'ដកឡូហ្គោចេញ' },
  cover: { en: 'Cover photo', km: 'រូបក្រប' },
  coverHint: {
    en: 'Your Facebook cover works well.',
    km: 'រូបក្រប Facebook របស់អ្នកប្រើបានល្អ។',
  },
  addCover: { en: 'Add cover photo', km: 'បន្ថែមរូបក្រប' },
  changeCover: { en: 'Change cover', km: 'ប្ដូររូបក្រប' },
  removeCover: { en: 'Remove cover', km: 'ដករូបក្របចេញ' },
  shopColor: { en: 'Shop color', km: 'ពណ៌ហាង' },
  colorHint: {
    en: 'Used in your shop and this app.',
    km: 'ប្រើក្នុងហាងរបស់អ្នក និងកម្មវិធីនេះ។',
  },
  // Every button that only shows the shop says this; "Open shop" means
  // starting to take orders (UX check #4, 2026-10-17).
  seeShop: { en: 'View your shop', km: 'មើលហាងរបស់អ្នក' },
  colors: {
    navy: { en: 'Navy', km: 'ខៀវចាស់' },
    teal: { en: 'Teal', km: 'ខៀវបៃតង' },
    forest: { en: 'Forest', km: 'បៃតងចាស់' },
    olive: { en: 'Olive', km: 'បៃតងអូលីវ' },
    coffee: { en: 'Coffee', km: 'ពណ៌កាហ្វេ' },
    wine: { en: 'Wine', km: 'ក្រហមចាស់' },
    plum: { en: 'Plum', km: 'ស្វាយចាស់' },
    charcoal: { en: 'Charcoal', km: 'ប្រផេះចាស់' },
    pink: { en: 'Pink', km: 'ផ្កាឈូក' },
    sky: { en: 'Sky', km: 'ខៀវខ្ចី' },
    mint: { en: 'Mint', km: 'បៃតងខ្ចី' },
    peach: { en: 'Peach', km: 'ទឹកក្រូចខ្ចី' },
    lilac: { en: 'Lilac', km: 'ស្វាយខ្ចី' },
    sand: { en: 'Sand', km: 'ពណ៌ខ្សាច់' },
  },

  // Orders, Alerts and Export orders on one page (settings check, 2026-10-19).
  ordersAndAlerts: { en: 'Orders and alerts', km: 'ការកុម្ម៉ង់ និងការជូនដំណឹង' },
  takeOrders: { en: 'Take orders', km: 'ទទួលការកុម្ម៉ង់' },
  takeOrdersOff: {
    en: 'Customers can look and message you, but not order.',
    km: 'អតិថិជនអាចមើល និងផ្ញើសារ ប៉ុន្តែមិនអាចកុម្ម៉ង់បានទេ។',
  },
  resumeOn: { en: 'Take orders again on', km: 'ទទួលការកុម្ម៉ង់វិញនៅថ្ងៃ' },
  resumeOnHint: {
    en: 'Orders reopen by themselves that morning.',
    km: 'ការកុម្ម៉ង់បើកវិញដោយខ្លួនឯងនៅព្រឹកថ្ងៃនោះ។',
  },
  autoAccept: { en: 'Accept new orders automatically', km: 'ទទួលការកុម្ម៉ង់ថ្មីដោយស្វ័យប្រវត្តិ' },
  autoAcceptOn: {
    en: 'New orders are accepted right away.',
    km: 'ការកុម្ម៉ង់ថ្មីត្រូវបានទទួលភ្លាមៗ។',
  },
  autoAcceptOff: {
    en: 'You accept or reject each new order.',
    km: 'អ្នកទទួល ឬបដិសេធការកុម្ម៉ង់ថ្មីនីមួយៗ។',
  },

  payments: { en: 'Payments', km: 'ការបង់ប្រាក់' },
  bakongId: { en: 'Bakong ID', km: 'Bakong ID' },
  bakongIdHint: {
    en: 'It looks like name@aclb.',
    km: 'វាមានទម្រង់ដូចជា name@aclb។',
  },
  // Read the details from the seller's own bank QR (2026-10-14).
  uploadQr: { en: "Upload your bank's QR", km: 'បញ្ចូល QR ធនាគាររបស់អ្នក' },
  uploadAnother: { en: 'Upload another QR', km: 'បញ្ចូល QR ផ្សេងទៀត' },
  payTo: { en: 'Customers pay to', km: 'អតិថិជនបង់ទៅ' },
  typeInstead: { en: 'No QR? Type the details instead', km: 'គ្មាន QR? វាយព័ត៌មានដោយខ្លួនឯង' },
  editDetails: { en: 'Edit the details', km: 'កែព័ត៌មាន' },
  uploadInstead: { en: 'Upload a QR instead', km: 'បញ្ចូល QR ជំនួសវិញ' },
  uploadQrHint: {
    en: 'Save your Receive QR from your bank app, then pick it here.',
    km: 'រក្សាទុក QR ទទួលប្រាក់ពីកម្មវិធីធនាគារ រួចជ្រើសវានៅទីនេះ។',
  },
  qrRead: { en: 'Filled in from your QR. Check and save.', km: 'បានបំពេញពី QR របស់អ្នក។ សូមពិនិត្យ ហើយរក្សាទុក។' },
  qrNone: {
    en: 'No QR found. Try a screenshot or a clearer photo.',
    km: 'រកមិនឃើញ QR ទេ។ សូមសាកល្បងរូបថតអេក្រង់ ឬរូបច្បាស់ជាងនេះ។',
  },
  qrNotKhqr: {
    en: "Not a KHQR for receiving money. Use your bank app's Receive QR.",
    km: 'នោះមិនមែនជា KHQR ទទួលប្រាក់ទេ។ សូមប្រើ QR ទទួលប្រាក់ពីកម្មវិធីធនាគារ។',
  },
  qrBusiness: {
    en: "Business (merchant) QRs don't work here. Use your personal QR, or type the details.",
    km: 'QR អាជីវកម្ម (merchant) មិនអាចប្រើបានទេ។ សូមប្រើ QR ផ្ទាល់ខ្លួន ឬវាយព័ត៌មានដោយខ្លួនឯង។',
  },
  qrCurrency: {
    en: (qr: string, shop: string) =>
      `This QR is for your ${qr} account, but your prices are in ${shop}, so the bank converts the money. Have a ${shop} account? Upload its QR instead.`,
    km: (qr: string, shop: string) =>
      `QR នេះសម្រាប់គណនី ${qr} របស់អ្នក ប៉ុន្តែតម្លៃហាងជា ${shop} ដូច្នេះធនាគារនឹងប្ដូរប្រាក់។ មានគណនី ${shop}? សូមបញ្ចូល QR របស់វាជំនួសវិញ។`,
  },
  accountInfo: { en: 'Account number (if your bank needs it)', km: 'លេខគណនី (បើធនាគាររបស់អ្នកត្រូវការ)' },
  accountInfoHint: {
    en: 'Needed for ABA and some other banks.',
    km: 'ត្រូវការសម្រាប់ ABA និងធនាគារខ្លះទៀត។',
  },
  acquiringBank: { en: 'Bank (if your bank needs it)', km: 'ធនាគារ (បើធនាគាររបស់អ្នកត្រូវការ)' },
  merchantName: { en: 'Name customers see', km: 'ឈ្មោះដែលអតិថិជនឃើញ' },
  merchantNameHint: {
    en: 'The name on your account, in English letters.',
    km: 'ឈ្មោះលើគណនីរបស់អ្នក ជាអក្សរអង់គ្លេស។',
  },
  merchantNameTitle: { en: 'English letters, numbers, and spaces', km: 'អក្សរអង់គ្លេស លេខ និងដកឃ្លា' },
  bank: { en: 'Bank', km: 'ធនាគារ' },
  transferTo: { en: 'Customers transfer to', km: 'អតិថិជនផ្ទេរទៅ' },
  accountName: { en: 'Name on the account', km: 'ឈ្មោះលើគណនី' },
  accountNumber: { en: 'Account number', km: 'លេខគណនី' },
  noPayment: { en: 'Turn on at least one way to pay.', km: 'សូមបើកវិធីបង់ប្រាក់យ៉ាងតិចមួយ។' },

  delivery: { en: 'Delivery', km: 'ការដឹកជញ្ជូន' },
  fee: { en: 'Delivery fee', km: 'ថ្លៃដឹក' },
  feeHint: {
    en: 'Leave empty for free delivery.',
    km: 'ទុកទទេ បើដឹកឥតគិតថ្លៃ។',
  },
  free: { en: 'Free', km: 'ឥតគិតថ្លៃ' },
  off: { en: 'Off', km: 'បិទ' },
  // The labels say the rule, the box's end says the unit (settings check
  // #6, 2026-10-19): "Free delivery when items cost [$30] or more".
  freeFrom: { en: 'Free delivery when items cost', km: 'ដឹកឥតគិតថ្លៃ ពេលទំនិញតម្លៃ' },
  orMore: { en: 'or more', km: 'ឬលើស' },
  freeFromItems: { en: 'Free delivery from', km: 'ដឹកឥតគិតថ្លៃ ចាប់ពី' },
  items: { en: 'items', km: 'ទំនិញ' },
  couriers: { en: 'Couriers (optional)', km: 'ក្រុមហ៊ុនដឹកជញ្ជូន (មិនចាំបាច់)' },
  couriersHint: {
    en: 'Customers can pick one, or leave it to you.',
    km: 'អតិថិជនអាចជ្រើសមួយ ឬទុកឲ្យអ្នកជ្រើស។',
  },
  courier: { en: 'Courier', km: 'ក្រុមហ៊ុនដឹក' },
  removeCourier: { en: (name: string) => `Remove ${name}`, km: (name: string) => `ដក ${name} ចេញ` },
  thisCourier: { en: 'courier', km: 'ក្រុមហ៊ុនដឹកនេះ' },
  otherCourier: { en: 'Other courier', km: 'ក្រុមហ៊ុនដឹកផ្សេង' },
  pickup: { en: 'Pickup', km: 'មកយកផ្ទាល់' },
  pickupAddress: { en: 'Pickup address', km: 'អាសយដ្ឋានមកយក' },
  pickupPlaceholder: { en: 'Shop 12, Orussey Market, Phnom Penh', km: 'តូបលេខ 12 ផ្សារអូរឫស្សី ភ្នំពេញ' },
  noDelivery: {
    en: 'Turn on delivery or pickup.',
    km: 'សូមបើកការដឹកជញ្ជូន ឬការមកយកផ្ទាល់។',
  },

  discounts: { en: 'Discounts', km: 'ការបញ្ចុះតម្លៃ' },
  noDiscounts: { en: 'No discounts.', km: 'គ្មានការបញ្ចុះតម្លៃ។' },
  whenItemsReach: { en: 'When items reach', km: 'នៅពេលទំនិញដល់' },
  takeOff: { en: 'Take off', km: 'បញ្ចុះ' },
  removeDiscount: { en: 'Remove discount', km: 'ដកការបញ្ចុះតម្លៃចេញ' },
  // Under each rule (settings check #9, 2026-10-19).
  discountRule: {
    en: (from: string, off: string) => `Orders of ${from} or more get ${off} off.`,
    km: (from: string, off: string) => `ការកុម្ម៉ង់ពី ${from} ឡើងទៅ បញ្ចុះ ${off}។`,
  },
  addDiscount: { en: 'Add discount', km: 'បន្ថែមការបញ្ចុះតម្លៃ' },

  telegram: { en: 'Telegram', km: 'Telegram' },
  lowStockAlert: { en: 'Warn me when this many are left', km: 'ជូនដំណឹងខ្ញុំ នៅពេលនៅសល់ប៉ុណ្ណេះ' },
  lowStockAlertHint: {
    en: 'Alert when stock falls to this number, and when sold out.',
    km: 'ជូនដំណឹងពេលស្តុកនៅសល់ចំនួននេះ និងពេលអស់ស្តុក។',
  },
  telegramHint: {
    en: 'New orders and low stock, on your phone.',
    km: 'ការកុម្ម៉ង់ថ្មី និងស្តុកជិតអស់ នៅលើទូរស័ព្ទរបស់អ្នក។',
  },
  connected: { en: 'Connected', km: 'បានភ្ជាប់' },
  alertsUnavailable: {
    en: "Telegram alerts aren't available yet.",
    km: 'ការជូនដំណឹង Telegram មិនទាន់មានទេ។',
  },
  alertsOn: {
    en: 'A message for new orders and low stock.',
    km: 'មានសារពេលមានការកុម្ម៉ង់ថ្មី និងពេលស្តុកជិតអស់។',
  },
  alertsOff: {
    en: 'Get a message for new orders and low stock.',
    km: 'ទទួលសារពេលមានការកុម្ម៉ង់ថ្មី និងពេលស្តុកជិតអស់។',
  },
  disconnect: { en: 'Disconnect', km: 'ផ្ដាច់' },
  disconnectTitle: { en: 'Disconnect Telegram?', km: 'ផ្ដាច់ Telegram?' },
  disconnectMessage: {
    en: "You'll stop getting messages about new orders.",
    km: 'អ្នកនឹងឈប់ទទួលសារអំពីការកុម្ម៉ង់ថ្មី។',
  },
  disconnected: { en: 'Telegram disconnected', km: 'បានផ្ដាច់ Telegram' },
  connect: { en: 'Connect Telegram', km: 'ភ្ជាប់ Telegram' },
  connectWaiting: {
    en: 'In Telegram, tap Start. This page updates by itself.',
    km: 'នៅក្នុង Telegram សូមចុច Start។ ទំព័រនេះនឹងប្ដូរដោយខ្លួនឯង។',
  },
  connectHint: {
    en: 'In Telegram, tap Start, then come back.',
    km: 'នៅក្នុង Telegram ចុច Start រួចត្រឡប់មកវិញ។',
  },
  username: { en: 'Your Telegram username', km: 'ឈ្មោះអ្នកប្រើ Telegram របស់អ្នក' },

  contact: { en: 'Contact', km: 'ទំនាក់ទំនង' },
  messenger: { en: 'Facebook page for Messenger', km: 'ទំព័រ Facebook សម្រាប់ Messenger' },
  messengerHint: {
    en: 'From your page link, e.g. facebook.com/sokhafashion.',
    km: 'ពីតំណទំព័ររបស់អ្នក ឧ. facebook.com/sokhafashion។',
  },
  contactPhone: { en: 'Phone customers can call', km: 'លេខទូរស័ព្ទដែលអតិថិជនអាចហៅ' },
  // After a saved contact: opens what a customer's button opens.
  tryIt: { en: 'Try it', km: 'សាកមើល' },
  contactPhoneHint: {
    en: 'Shown in your shop.',
    km: 'បង្ហាញក្នុងហាងរបស់អ្នក។',
  },


  display: { en: 'Language and theme', km: 'ភាសា និងរូបរាង' },
  displayHint: {
    en: 'For this phone.',
    km: 'សម្រាប់ទូរស័ព្ទនេះ។',
  },
  language: { en: 'Language', km: 'ភាសា' },
  theme: { en: 'Theme', km: 'រូបរាង' },
  themeChoice: {
    auto: { en: 'Auto', km: 'តាមទូរស័ព្ទ' },
    light: { en: 'Light', km: 'ភ្លឺ' },
    dark: { en: 'Dark', km: 'ងងឹត' },
  },

  // The Settings menu: each row says what's set now.
  // A new shop's checklist (founder's pick 7C, 2026-10-09).
  setup: {
    title: { en: 'Set up your shop', km: 'រៀបចំហាងរបស់អ្នក' },
    progress: {
      en: (done: number, total: number) => `${done} of ${total} done`,
      km: (done: number, total: number) => `រួចរាល់ ${done} ក្នុងចំណោម ${total}`,
    },
    steps: {
      product: { en: 'Add a product', km: 'បន្ថែមទំនិញ' },
      delivery: { en: 'Set your delivery fee', km: 'កំណត់ថ្លៃដឹក' },
      payments: { en: 'Ways to pay: KHQR or bank', km: 'វិធីបង់ប្រាក់៖ KHQR ឬធនាគារ' },
      telegram: { en: 'Telegram alerts for new orders', km: 'ការជូនដំណឹងតាម Telegram ពេលមានការកុម្ម៉ង់ថ្មី' },
      contact: { en: 'Contact buttons for customers', km: 'ប៊ូតុងទំនាក់ទំនងសម្រាប់អតិថិជន' },
      logo: { en: 'Shop logo', km: 'ឡូហ្គោហាង' },
      open: { en: 'Open your shop (starts your free trial)', km: 'បើកហាងរបស់អ្នក (ចាប់ផ្ដើមការសាកល្បងឥតគិតថ្លៃ)' },
    },
    optional: { en: 'Optional', km: 'មិនចាំបាច់' },
    doneLabel: { en: ' (done)', km: ' (រួចរាល់)' },
    todoLabel: { en: ' (not yet)', km: ' (មិនទាន់)' },
    hide: { en: 'Hide this list', km: 'លាក់បញ្ជីនេះ' },
    // The same list on Orders while the shop isn't ready (UX check #3,
    // 2026-10-17).
    readyTitle: { en: 'Get your shop ready', km: 'រៀបចំហាងរបស់អ្នកឱ្យរួចរាល់' },
    readyHint: {
      en: 'Do these to start taking orders. Opening starts your 30-day free trial.',
      km: 'ធ្វើជំហានទាំងនេះ ដើម្បីទទួលការកុម្ម៉ង់។ ការបើកហាងចាប់ផ្ដើមការសាកល្បងឥតគិតថ្លៃ 30 ថ្ងៃ។',
    },
    // The button on the next step's row.
    action: {
      product: { en: 'Add', km: 'បន្ថែម' },
      delivery: { en: 'Set fee', km: 'កំណត់ថ្លៃ' },
      payments: { en: 'Set up', km: 'រៀបចំ' },
      telegram: { en: 'Connect', km: 'ភ្ជាប់' },
      contact: { en: 'Add', km: 'បន្ថែម' },
      logo: { en: 'Add', km: 'បន្ថែម' },
    },
  },
  menu: {
    shopHint: { en: 'Cover, logo, color, name, currency', km: 'រូបក្រប ឡូហ្គោ ពណ៌ ឈ្មោះ រូបិយប័ណ្ណ' },
    selling: { en: 'Selling', km: 'ការលក់' },
    autoOn: { en: 'Accepted automatically', km: 'ទទួលដោយស្វ័យប្រវត្តិ' },
    paused: { en: 'Not taking orders', km: 'មិនទទួលការកុម្ម៉ង់' },
    pausedUntil: {
      en: (day: string) => `Not taking orders until ${day}`,
      km: (day: string) => `មិនទទួលការកុម្ម៉ង់រហូតដល់ ${day}`,
    },
    autoOff: { en: 'You accept each one', km: 'អ្នកទទួលម្ដងមួយៗ' },
    noneOn: { en: 'None turned on', km: 'មិនទាន់បើកទេ' },
    deliveryFee: { en: (fee: string) => `Delivery ${fee}`, km: (fee: string) => `ថ្លៃដឹក ${fee}` },
    freeDelivery: { en: 'Free delivery', km: 'ដឹកឥតគិតថ្លៃ' },
    // Settings → Delivery never saved (the shop runs on free delivery).
    deliveryNotSet: { en: 'Not set yet: free for customers', km: 'មិនទាន់កំណត់៖ ឥតគិតថ្លៃសម្រាប់អតិថិជន' },
    // A new shop's starting fee (founder, 2026-10-18).
    deliveryNotSetFee: {
      en: (fee: string) => `Not set yet: ${fee} a delivery`,
      km: (fee: string) => `មិនទាន់កំណត់៖ ថ្លៃដឹក ${fee}`,
    },
    freeFrom: { en: (amount: string) => `free from ${amount}`, km: (amount: string) => `ឥតគិតថ្លៃចាប់ពី ${amount}` },
    discount: {
      en: (off: string, from: string) => `${off} off from ${from}`,
      km: (off: string, from: string) => `បញ្ចុះ ${off} ចាប់ពី ${from}`,
    },
    none: { en: 'None', km: 'គ្មាន' },
    telegramOn: { en: 'Telegram on', km: 'Telegram បានបើក' },
    telegramOff: { en: 'Telegram off', km: 'Telegram បានបិទ' },
    accountHint: { en: 'Name, phone number, password', km: 'ឈ្មោះ លេខទូរស័ព្ទ ពាក្យសម្ងាត់' },
    helpHint: { en: 'Message Oak Order on Telegram', km: 'ផ្ញើសារទៅ Oak Order តាម Telegram' },
    closeHint: { en: 'Stop selling here', km: 'ឈប់លក់នៅទីនេះ' },
    staffHint: { en: 'Let others help with orders', km: 'ឱ្យអ្នកផ្សេងជួយការកុម្ម៉ង់' },
  },

  // Settings → Plan: the shop's plan with Oak Order (01_PRODUCT.md §33.1).
  plan: {
    title: { en: 'Plan', km: 'គម្រោង' },
    freeTrial: { en: 'Free trial', km: 'សាកល្បងឥតគិតថ្លៃ' },
    // In setup: the trial starts when the shop opens.
    notOpen: { en: 'Your shop isn’t open yet', km: 'ហាងរបស់អ្នកមិនទាន់បើកនៅឡើយទេ' },
    notOpenText: {
      en: (month: string, year: string) =>
        `Your 30-day free trial starts when you open your shop, then it's ${month} a month or ${year} a year.`,
      km: (month: string, year: string) =>
        `ការសាកល្បងឥតគិតថ្លៃ 30 ថ្ងៃចាប់ផ្ដើមពេលអ្នកបើកហាង បន្ទាប់មក ${month} ក្នុងមួយខែ ឬ ${year} ក្នុងមួយឆ្នាំ។`,
    },
    standard: { en: 'Oak Order Standard', km: 'Oak Order Standard' },
    freeUntil: { en: (day: string) => `Free until ${day}`, km: (day: string) => `ឥតគិតថ្លៃរហូតដល់ ${day}` },
    paidUntil: { en: (day: string) => `Paid until ${day}`, km: (day: string) => `បានបង់រហូតដល់ ${day}` },
    daysLeft: {
      en: (n: number) => (n === 1 ? '1 day left' : `${n} days left`),
      km: (n: number) => `នៅសល់ ${n} ថ្ងៃ`,
    },
    afterTrial: {
      en: (month: string, year: string) => `Then ${month} a month or ${year} a year.`,
      km: (month: string, year: string) => `បន្ទាប់មក ${month} ក្នុងមួយខែ ឬ ${year} ក្នុងមួយឆ្នាំ។`,
    },
    trialEnded: {
      en: (day: string) => `Your free trial ended on ${day}.`,
      km: (day: string) => `ការសាកល្បងឥតគិតថ្លៃរបស់អ្នកបានបញ្ចប់នៅ ${day}។`,
    },
    planEnded: {
      en: (day: string) => `Your plan ended on ${day}.`,
      km: (day: string) => `គម្រោងរបស់អ្នកបានបញ្ចប់នៅ ${day}។`,
    },
    // pay_by: the last day orders still come.
    payBy: {
      en: (day: string) => `Orders come in until ${day}. Pay by then to stay open.`,
      km: (day: string) => `ហាងទទួលការកុម្ម៉ង់រហូតដល់ ${day}។ សូមបង់ត្រឹមថ្ងៃនោះ ដើម្បីបន្តបើក។`,
    },
    stopped: {
      en: 'Not taking new orders. Pay to reopen at once.',
      km: 'មិនទទួលការកុម្ម៉ង់ថ្មីទេ។ សូមបង់ ដើម្បីបើកវិញភ្លាមៗ។',
    },
    stoppedNote: {
      en: 'Customers still see your shop, and you can finish open orders. Nothing is deleted.',
      km: 'អតិថិជននៅតែមើលហាងបាន ហើយអ្នកអាចបញ្ចប់ការកុម្ម៉ង់ដែលមាន។ គ្មានអ្វីត្រូវបានលុបទេ។',
    },
    includes: { en: "What's included", km: 'អ្វីដែលមានក្នុងគម្រោង' },
    includesEverything: {
      en: 'Shop, orders, payments, delivery, customers, links and alerts',
      km: 'ហាង ការកុម្ម៉ង់ ការបង់ប្រាក់ ការដឹកជញ្ជូន អតិថិជន តំណ និងការជូនដំណឹង',
    },
    includesStaff: { en: 'Up to 10 staff logins', km: 'គណនីបុគ្គលិករហូតដល់ 10 នាក់' },
    includesHosting: { en: 'Hosting and updates', km: 'សេវាបង្ហោះ និងការធ្វើបច្ចុប្បន្នភាព' },
    pay: { en: 'Pay', km: 'បង់ប្រាក់' },
    monthly: { en: 'Monthly', km: 'ប្រចាំខែ' },
    yearly: { en: 'Yearly', km: 'ប្រចាំឆ្នាំ' },
    perMonth: { en: (price: string) => `${price} a month`, km: (price: string) => `${price} ក្នុងមួយខែ` },
    perYear: { en: (price: string) => `${price} a year`, km: (price: string) => `${price} ក្នុងមួយឆ្នាំ` },
    save: { en: (amount: string) => `Save ${amount}`, km: (amount: string) => `សន្សំ ${amount}` },
    // Without Oak's KHQR or bank account set (OAK_* settings).
    howToPay: {
      en: "Message Oak Order on Telegram with your shop's code to pay.",
      km: 'ផ្ញើសារមក Oak Order តាម Telegram ជាមួយលេខកូដហាង ដើម្បីបង់។',
    },
    howToPayContact: {
      en: "Contact Oak Order with your shop's code to pay.",
      km: 'សូមទាក់ទង Oak Order ជាមួយលេខកូដហាង ដើម្បីបង់។',
    },
    payOnTelegram: { en: (price: string) => `Pay ${price} on Telegram`, km: (price: string) => `បង់ ${price} តាម Telegram` },
    // During the trial, more than a week left: Pay folded (UX check #23).
    payEarly: { en: 'Pay early', km: 'បង់មុន' },
    payEarlyHint: {
      en: (day: string) => `Nothing to pay until ${day}. Paying early loses no days.`,
      km: (day: string) => `មិនចាំបាច់បង់ទេ រហូតដល់ ${day}។ ការបង់មុនមិនបាត់បង់ថ្ងៃទេ។`,
    },
    carriesOn: {
      en: 'Paying early loses no days: it adds to the time you have.',
      km: 'ការបង់មុនមិនបាត់បង់ថ្ងៃទេ៖ វាបន្ថែមលើពេលដែលអ្នកនៅសល់។',
    },
    aMonth: { en: 'a month', km: 'មួយខែ' },
    aYear: { en: 'a year', km: 'មួយឆ្នាំ' },
    payMessage: {
      en: (price: string, period: string, shop: string, code: string) =>
        `Hi Oak Order, I'd like to pay ${price} for ${period} for my shop ${shop} (code ${code}).`,
      km: (price: string, period: string, shop: string, code: string) =>
        `សួស្ដី Oak Order ខ្ញុំចង់បង់ ${price} សម្រាប់${period} សម្រាប់ហាង ${shop} (លេខកូដ ${code})។`,
    },
    payments: { en: 'Your payments', km: 'ការបង់ប្រាក់របស់អ្នក' },
    paidOn: {
      en: (paid: string, from: string, until: string) => `Paid ${paid} · for ${from} to ${until}`,
      km: (paid: string, from: string, until: string) => `បានបង់ ${paid} · សម្រាប់ ${from} ដល់ ${until}`,
    },
    // Paying Oak Order by hand (KHQR or transfer), with the shop's code.
    yourCode: { en: "Your shop's code", km: 'លេខកូដហាងរបស់អ្នក' },
    codeHint: {
      en: 'Put it in the transfer note. The KHQR adds it for you.',
      km: 'ដាក់វាក្នុងកំណត់ចំណាំនៃការផ្ទេរប្រាក់។ KHQR ដាក់វាឱ្យអ្នកស្រាប់។',
    },
    scanToPay: {
      en: 'Scan it with your bank app, or save it and pick it there.',
      km: 'ស្កេនវាដោយកម្មវិធីធនាគារ ឬរក្សាទុក ហើយជ្រើសវានៅទីនោះ។',
    },
    saveQr: { en: 'Save QR to photos', km: 'រក្សាទុក QR ក្នុងរូបថត' },
    khqrCaption: { en: (code: string) => `Oak Order · ${code}`, km: (code: string) => `Oak Order · ${code}` },
    orTransfer: { en: 'Or transfer to', km: 'ឬផ្ទេរទៅ' },
    transferTo: { en: 'Transfer to', km: 'ផ្ទេរទៅ' },
    bank: { en: 'Bank', km: 'ធនាគារ' },
    accountName: { en: 'Account name', km: 'ឈ្មោះគណនី' },
    accountNumber: { en: 'Account number', km: 'លេខគណនី' },
    iPaid: { en: "I've paid", km: 'ខ្ញុំបានបង់' },
    iPaidHint: {
      en: 'Tap after paying. Usually checked within a day.',
      km: 'ចុចបន្ទាប់ពីបង់។ ជាធម្មតាពិនិត្យរួចក្នុងមួយថ្ងៃ។',
    },
    waiting: {
      en: (amount: string, period: string, when: string) =>
        `Oak Order is checking your ${amount} for ${period} (paid ${when}).`,
      km: (amount: string, period: string, when: string) =>
        `Oak Order កំពុងពិនិត្យ ${amount} សម្រាប់${period}របស់អ្នក (បានបង់ ${when})។`,
    },
    notFound: { en: (note: string) => `Oak Order didn't find it: ${note}`, km: (note: string) => `Oak Order រកមិនឃើញ៖ ${note}` },
    menuClaimed: { en: 'Oak Order is checking your payment', km: 'Oak Order កំពុងពិនិត្យការបង់ប្រាក់របស់អ្នក' },
    // The Settings menu's row.
    menuTrial: { en: (day: string) => `Free trial until ${day}`, km: (day: string) => `សាកល្បងឥតគិតថ្លៃរហូតដល់ ${day}` },
    menuPaid: { en: (day: string) => `Standard, paid until ${day}`, km: (day: string) => `Standard បានបង់រហូតដល់ ${day}` },
    menuOverdue: { en: (day: string) => `Ended: pay by ${day}`, km: (day: string) => `បានបញ្ចប់៖ សូមបង់ត្រឹម ${day}` },
    menuSetup: { en: 'Not open yet: free trial not started', km: 'មិនទាន់បើក៖ មិនទាន់ចាប់ផ្ដើមការសាកល្បង' },
    menuStopped: { en: 'Not taking new orders: pay to reopen', km: 'មិនទទួលការកុម្ម៉ង់ថ្មី៖ សូមបង់ដើម្បីបើកវិញ' },
  },

  account: { en: 'Account', km: 'គណនី' },
  logOut: { en: 'Log out', km: 'ចាកចេញ' },
  logOutConfirmTitle: { en: 'Log out?', km: 'ចាកចេញ?' },

  yourAccount: { en: 'Your account', km: 'គណនីរបស់អ្នក' },
  yourDetails: { en: 'Your details', km: 'ព័ត៌មានរបស់អ្នក' },
  yourName: { en: 'Your name', km: 'ឈ្មោះរបស់អ្នក' },
  yourPhone: { en: 'Your phone number', km: 'លេខទូរស័ព្ទរបស់អ្នក' },
  loginPhone: { en: 'Phone number you log in with', km: 'លេខទូរស័ព្ទដែលអ្នកប្រើចូលគណនី' },
  noLoginPhone: {
    en: 'None yet. Add one to log in with it.',
    km: 'មិនទាន់មាន។ បន្ថែមលេខ ដើម្បីចូលគណនីដោយលេខនោះ។',
  },
  changePhone: { en: 'Change number', km: 'ប្ដូរលេខ' },
  addPhone: { en: 'Add phone number', km: 'បន្ថែមលេខទូរស័ព្ទ' },
  newPhone: { en: 'New phone number', km: 'លេខទូរស័ព្ទថ្មី' },
  phoneChanged: { en: 'Phone number changed', km: 'បានប្ដូរលេខទូរស័ព្ទ' },
  phoneTakenByOther: {
    en: 'Another account already has this number.',
    km: 'គណនីផ្សេងមានលេខនេះរួចហើយ។',
  },
  loginEmail: { en: 'Email you log in with', km: 'អ៊ីមែលដែលអ្នកប្រើចូលគណនី' },
  otherLogins: { en: 'Other ways to log in', km: 'វិធីផ្សេងទៀតដើម្បីចូលគណនី' },
  connectedAccount: { en: 'Connected', km: 'បានភ្ជាប់' },
  useAnotherAccount: { en: 'Use another account', km: 'ប្រើគណនីផ្សេង' },
  loginConnected: {
    en: (provider: string) => `${provider} connected`,
    km: (provider: string) => `បានភ្ជាប់ ${provider}`,
  },
  password: { en: 'Password', km: 'ពាក្យសម្ងាត់' },
  addPassword: { en: 'Add a password', km: 'បន្ថែមពាក្យសម្ងាត់' },
  passwordAdded: { en: 'Password added', km: 'បានបន្ថែមពាក្យសម្ងាត់' },
  detailsSaved: { en: 'Details saved', km: 'បានរក្សាទុកព័ត៌មាន' },
  changePassword: { en: 'Change password', km: 'ប្ដូរពាក្យសម្ងាត់' },
  changePasswordHint: {
    en: 'Other phones and computers will be logged out.',
    km: 'ទូរស័ព្ទ និងកុំព្យូទ័រផ្សេងទៀត នឹងត្រូវចាកចេញ។',
  },
  currentPassword: { en: 'Current password', km: 'ពាក្យសម្ងាត់បច្ចុប្បន្ន' },
  newPassword: { en: 'New password', km: 'ពាក្យសម្ងាត់ថ្មី' },
  exportOrders: { en: 'Export orders', km: 'ទាញយកការកុម្ម៉ង់' },
  exportWhich: { en: 'Which orders', km: 'ការកុម្ម៉ង់មួយណា' },
  exportRange: {
    thisMonth: { en: 'This month', km: 'ខែនេះ' },
    lastMonth: { en: 'Last month', km: 'ខែមុន' },
    days: { en: 'Choose days', km: 'ជ្រើសថ្ងៃ' },
  },
  exportFrom: { en: 'From', km: 'ពី' },
  exportTo: { en: 'To', km: 'ដល់' },
  exportDays: {
    en: (first: string, last: string) => `Orders placed from ${first} to ${last}.`,
    km: (first: string, last: string) => `ការកុម្ម៉ង់ពី ${first} ដល់ ${last}។`,
  },
  exportDownload: { en: 'Download Excel file', km: 'ទាញយកឯកសារ Excel' },
  help: { en: 'Get help', km: 'សុំជំនួយ' },
  staff: { en: 'Staff', km: 'បុគ្គលិក' },
  staffNoSettings: {
    en: (shop: string) => `Only the owner of ${shop} can change shop settings.`,
    km: (shop: string) => `មានតែម្ចាស់ ${shop} ទេដែលអាចប្ដូរការកំណត់ហាងបាន។`,
  },
  noStaff: { en: 'No staff yet.', km: 'មិនទាន់មានបុគ្គលិកទេ។' },
  addStaff: { en: 'Add staff', km: 'បន្ថែមបុគ្គលិក' },
  staffName: { en: 'Their name', km: 'ឈ្មោះរបស់គេ' },
  staffPhone: { en: 'Phone number they log in with', km: 'លេខទូរស័ព្ទដែលគេប្រើចូលគណនី' },
  firstPassword: { en: 'First password', km: 'ពាក្យសម្ងាត់ដំបូង' },
  firstPasswordHint: { en: 'At least 8 characters.', km: 'យ៉ាងតិច 8 តួអក្សរ។' },
  staffAdded: {
    en: (name: string) => `${name} can log in now`,
    km: (name: string) => `${name} អាចចូលគណនីបានហើយ`,
  },
  newPasswordFor: {
    en: (name: string) => `New password for ${name}`,
    km: (name: string) => `ពាក្យសម្ងាត់ថ្មីសម្រាប់ ${name}`,
  },
  newPasswordForHint: {
    en: "They're logged out and log in with this.",
    km: 'គេនឹងចាកចេញ ហើយចូលវិញដោយពាក្យសម្ងាត់នេះ។',
  },
  saveNewPassword: { en: 'Save new password', km: 'រក្សាទុកពាក្យសម្ងាត់ថ្មី' },
  staffPasswordSet: {
    en: (name: string) => `New password saved for ${name}`,
    km: (name: string) => `បានរក្សាទុកពាក្យសម្ងាត់ថ្មីសម្រាប់ ${name}`,
  },
  removeStaff: { en: 'Remove', km: 'ដកចេញ' },
  removeStaffTitle: { en: (name: string) => `Remove ${name}?`, km: (name: string) => `ដក ${name} ចេញ?` },
  removeStaffMessage: {
    en: "They can't log in any more. Their order changes stay.",
    km: 'គេនឹងមិនអាចចូលគណនីបានទៀតទេ។ ការកែប្រែលើការកុម្ម៉ង់នៅដដែល។',
  },
  staffRemoved: { en: (name: string) => `${name} removed`, km: (name: string) => `បានដក ${name} ចេញ` },
  closeShop: { en: 'Close shop', km: 'បិទហាង' },
  closeShopWhat: { en: 'What closing does', km: 'អ្វីដែលកើតឡើងពេលបិទហាង' },
  closeShopLink: {
    en: 'Your shop link stops working at once.',
    km: 'តំណហាងរបស់អ្នកឈប់ដំណើរការភ្លាមៗ។',
  },
  closeShopLogout: {
    en: "You're logged out on every phone and can't log in.",
    km: 'អ្នកនឹងចាកចេញពីទូរស័ព្ទទាំងអស់ ហើយមិនអាចចូលគណនីបានទេ។',
  },
  closeShopKept: {
    en: 'Nothing is deleted. Message Oak Order to reopen it or erase everything.',
    km: 'គ្មានអ្វីត្រូវបានលុបទេ។ ផ្ញើសារទៅ Oak Order ដើម្បីបើកវិញ ឬលុបទាំងអស់។',
  },
  closeShopPassword: { en: 'Your password', km: 'ពាក្យសម្ងាត់របស់អ្នក' },
  closeShopButton: { en: 'Close my shop', km: 'បិទហាងរបស់ខ្ញុំ' },
  closeShopConfirmTitle: { en: 'Close your shop?', km: 'បិទហាងរបស់អ្នក?' },
  closeShopConfirm: {
    en: "Customers can't open it or order, and you're logged out.",
    km: 'អតិថិជនមិនអាចបើក ឬកុម្ម៉ង់បានទេ ហើយអ្នកនឹងចាកចេញ។',
  },
  shopClosed: { en: 'Your shop is closed', km: 'ហាងរបស់អ្នកត្រូវបានបិទ' },
  supportText: {
    en: (shop: string, link: string) => `Hi Oak Order, I need help with my shop ${shop} (${link}).`,
    km: (shop: string, link: string) => `សួស្ដី Oak Order ខ្ញុំត្រូវការជំនួយសម្រាប់ហាង ${shop} (${link})។`,
  },
  supportTextNoShop: { en: 'Hi Oak Order, I need help with my shop.', km: 'សួស្ដី Oak Order ខ្ញុំត្រូវការជំនួយសម្រាប់ហាងរបស់ខ្ញុំ។' },
  passwordChanged: {
    en: 'Password changed. Other phones are logged out.',
    km: 'បានប្ដូរពាក្យសម្ងាត់។ ទូរស័ព្ទផ្សេងទៀតត្រូវបានចាកចេញ។',
  },
} satisfies Tree
