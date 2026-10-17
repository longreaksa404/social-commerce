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
    en: 'For your shop and this app, once you save.',
    km: 'សម្រាប់ហាងរបស់អ្នក និងកម្មវិធីនេះ ពេលអ្នករក្សាទុក។',
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

  orders: { en: 'Orders', km: 'ការកុម្ម៉ង់' },
  takeOrders: { en: 'Take orders', km: 'ទទួលការកុម្ម៉ង់' },
  takeOrdersOff: {
    en: "Customers can look around and message you, but can't order.",
    km: 'អតិថិជនអាចមើលទំនិញ និងផ្ញើសារមកអ្នក ប៉ុន្តែមិនអាចកុម្ម៉ង់បានទេ។',
  },
  resumeOn: { en: 'Take orders again on', km: 'ទទួលការកុម្ម៉ង់វិញនៅថ្ងៃ' },
  resumeOnHint: {
    en: 'Orders open again by themselves that morning.',
    km: 'ការកុម្ម៉ង់បើកវិញដោយខ្លួនឯងនៅព្រឹកថ្ងៃនោះ។',
  },
  autoAccept: { en: 'Accept new orders automatically', km: 'ទទួលការកុម្ម៉ង់ថ្មីដោយស្វ័យប្រវត្តិ' },
  autoAcceptOn: {
    en: 'New orders are accepted right away.',
    km: 'ការកុម្ម៉ង់ថ្មីត្រូវបានទទួលភ្លាមៗ។',
  },
  autoAcceptOff: {
    en: 'New orders wait for you to accept or reject them.',
    km: 'ការកុម្ម៉ង់ថ្មីរង់ចាំអ្នកទទួល ឬបដិសេធ។',
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
  editKhqr: { en: 'Edit the details', km: 'កែព័ត៌មាន' },
  uploadInstead: { en: 'Upload a QR instead', km: 'បញ្ចូល QR ជំនួសវិញ' },
  uploadQrHint: {
    en: 'In your bank app, open your QR for receiving money and save it to photos, then pick it here. We fill in the rest.',
    km: 'ក្នុងកម្មវិធីធនាគាររបស់អ្នក បើក QR សម្រាប់ទទួលប្រាក់ ហើយរក្សាទុកក្នុងរូបថត រួចជ្រើសវានៅទីនេះ។ យើងនឹងបំពេញអ្វីដែលនៅសល់។',
  },
  qrRead: { en: 'Filled in from your QR. Check and save.', km: 'បានបំពេញពី QR របស់អ្នក។ សូមពិនិត្យ ហើយរក្សាទុក។' },
  qrNone: {
    en: "No QR code found in that picture. Try a screenshot of the QR, or a clearer photo.",
    km: 'រកមិនឃើញ QR ក្នុងរូបនោះទេ។ សូមសាកល្បងរូបថតអេក្រង់នៃ QR ឬរូបដែលច្បាស់ជាងនេះ។',
  },
  qrNotKhqr: {
    en: "That's not a bank KHQR for receiving money. Use the QR from your bank app's Receive screen.",
    km: 'នោះមិនមែនជា KHQR ធនាគារសម្រាប់ទទួលប្រាក់ទេ។ សូមប្រើ QR ពីផ្ទាំងទទួលប្រាក់ក្នុងកម្មវិធីធនាគាររបស់អ្នក។',
  },
  qrBusiness: {
    en: "That's a business (merchant) QR, which this can't use. Use your personal account's QR, or fill in the fields.",
    km: 'នោះជា QR អាជីវកម្ម (merchant) ដែលមិនអាចប្រើបាន។ សូមប្រើ QR គណនីផ្ទាល់ខ្លួន ឬបំពេញវាលដោយខ្លួនឯង។',
  },
  qrCurrency: {
    en: (qr: string, shop: string) =>
      `This QR is for your ${qr} account, but your shop's prices are in ${shop}: the bank will change the money. If you have a ${shop} account, set it as default in your bank app and upload its QR.`,
    km: (qr: string, shop: string) =>
      `QR នេះសម្រាប់គណនី ${qr} របស់អ្នក ប៉ុន្តែតម្លៃក្នុងហាងគឺជា ${shop}៖ ធនាគារនឹងប្ដូរប្រាក់។ បើអ្នកមានគណនី ${shop} សូមកំណត់វាជាគណនីលំនាំដើមក្នុងកម្មវិធីធនាគារ ហើយបញ្ចូល QR របស់វា។`,
  },
  accountInfo: { en: 'Account number (if your bank needs it)', km: 'លេខគណនី (បើធនាគាររបស់អ្នកត្រូវការ)' },
  accountInfoHint: {
    en: 'ABA and some banks give one Bakong ID to all their customers; the account number says which is yours.',
    km: 'ABA និងធនាគារខ្លះផ្ដល់ Bakong ID តែមួយដល់អតិថិជនទាំងអស់ លេខគណនីប្រាប់ថាមួយណាជារបស់អ្នក។',
  },
  acquiringBank: { en: 'Bank (if your bank needs it)', km: 'ធនាគារ (បើធនាគាររបស់អ្នកត្រូវការ)' },
  merchantName: { en: 'Name customers see', km: 'ឈ្មោះដែលអតិថិជនឃើញ' },
  merchantNameHint: {
    en: "Use the name on your account, in English letters.",
    km: 'សូមប្រើឈ្មោះលើគណនីរបស់អ្នក ជាអក្សរអង់គ្លេស។',
  },
  merchantNameTitle: { en: 'English letters, numbers, and spaces', km: 'អក្សរអង់គ្លេស លេខ និងដកឃ្លា' },
  bank: { en: 'Bank', km: 'ធនាគារ' },
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
  freeFrom: { en: 'Free delivery from', km: 'ដឹកឥតគិតថ្លៃ ចាប់ពី' },
  freeFromItems: { en: 'Free delivery from (items)', km: 'ដឹកឥតគិតថ្លៃ ចាប់ពី (ចំនួនទំនិញ)' },
  ownDelivery: { en: 'Own delivery', km: 'ដឹកផ្ទាល់' },
  couriers: { en: 'Couriers', km: 'ក្រុមហ៊ុនដឹកជញ្ជូន' },
  courier: { en: 'Courier', km: 'ក្រុមហ៊ុនដឹក' },
  removeCourier: { en: (name: string) => `Remove ${name}`, km: (name: string) => `ដក ${name} ចេញ` },
  thisCourier: { en: 'courier', km: 'ក្រុមហ៊ុនដឹកនេះ' },
  otherCourier: { en: 'Other courier', km: 'ក្រុមហ៊ុនដឹកផ្សេង' },
  pickup: { en: 'Pickup', km: 'មកយកផ្ទាល់' },
  pickupAddress: { en: 'Pickup address', km: 'អាសយដ្ឋានមកយក' },
  pickupPlaceholder: { en: 'Shop 12, Orussey Market, Phnom Penh', km: 'តូបលេខ 12 ផ្សារអូរឫស្សី ភ្នំពេញ' },
  noDelivery: {
    en: 'Turn on your own delivery, add a courier, or turn on pickup.',
    km: 'សូមបើកការដឹកផ្ទាល់ បន្ថែមក្រុមហ៊ុនដឹក ឬបើកការមកយកផ្ទាល់។',
  },

  discounts: { en: 'Discounts', km: 'ការបញ្ចុះតម្លៃ' },
  noDiscounts: { en: 'No discounts.', km: 'គ្មានការបញ្ចុះតម្លៃ។' },
  whenItemsReach: { en: 'When items reach', km: 'នៅពេលទំនិញដល់' },
  takeOff: { en: 'Take off', km: 'បញ្ចុះ' },
  removeDiscount: { en: 'Remove discount', km: 'ដកការបញ្ចុះតម្លៃចេញ' },
  addDiscount: { en: 'Add discount', km: 'បន្ថែមការបញ្ចុះតម្លៃ' },

  telegram: { en: 'Telegram', km: 'Telegram' },
  alerts: { en: 'Alerts', km: 'ការជូនដំណឹង' },
  lowStockAlert: { en: 'Warn me when this many are left', km: 'ជូនដំណឹងខ្ញុំ នៅពេលនៅសល់ប៉ុណ្ណេះ' },
  lowStockAlertHint: {
    en: 'When an order leaves this many of a product or fewer, and again when it sells out.',
    km: 'នៅពេលការកុម្ម៉ង់ធ្វើឱ្យទំនិញនៅសល់ប៉ុណ្ណេះ ឬតិចជាងនេះ ហើយម្ដងទៀតនៅពេលអស់ស្តុក។',
  },
  telegramHint: {
    en: 'Hear about new orders, and products running low, on your phone.',
    km: 'ទទួលដំណឹងអំពីការកុម្ម៉ង់ថ្មី និងទំនិញជិតអស់ នៅលើទូរស័ព្ទរបស់អ្នក។',
  },
  connected: { en: 'Connected', km: 'បានភ្ជាប់' },
  alertsUnavailable: {
    en: "Order alerts on Telegram aren't available yet.",
    km: 'ការជូនដំណឹងតាម Telegram មិនទាន់មាននៅឡើយ។',
  },
  alertsOn: {
    en: 'A message for every new order, and when a product is running low or sold out.',
    km: 'មានសារសម្រាប់រាល់ការកុម្ម៉ង់ថ្មី និងនៅពេលទំនិញជិតអស់ ឬអស់ស្តុក។',
  },
  alertsOff: {
    en: 'Get a Telegram message for every new order, and when a product is running low or sold out.',
    km: 'ទទួលសារ Telegram សម្រាប់រាល់ការកុម្ម៉ង់ថ្មី និងនៅពេលទំនិញជិតអស់ ឬអស់ស្តុក។',
  },
  disconnect: { en: 'Disconnect', km: 'ផ្ដាច់' },
  disconnectTitle: { en: 'Disconnect Telegram?', km: 'ផ្ដាច់ Telegram?' },
  disconnectMessage: {
    en: "You won't get Telegram messages about new orders until you connect again.",
    km: 'អ្នកនឹងមិនទទួលសារ Telegram អំពីការកុម្ម៉ង់ថ្មីទេ រហូតដល់អ្នកភ្ជាប់ម្ដងទៀត។',
  },
  disconnected: { en: 'Telegram disconnected', km: 'បានផ្ដាច់ Telegram' },
  connect: { en: 'Connect Telegram', km: 'ភ្ជាប់ Telegram' },
  connectWaiting: {
    en: 'In Telegram, tap Start. This page updates once you have.',
    km: 'នៅក្នុង Telegram សូមចុច Start។ ទំព័រនេះនឹងប្ដូរភ្លាមៗក្រោយអ្នកចុច។',
  },
  connectHint: {
    en: 'Telegram opens our bot. Tap Start, then come back here.',
    km: 'Telegram នឹងបើក bot របស់យើង។ ចុច Start រួចត្រឡប់មកទីនេះវិញ។',
  },
  username: { en: 'Your Telegram username', km: 'ឈ្មោះអ្នកប្រើ Telegram របស់អ្នក' },

  contact: { en: 'Contact', km: 'ទំនាក់ទំនង' },
  messenger: { en: 'Facebook page for Messenger', km: 'ទំព័រ Facebook សម្រាប់ Messenger' },
  messengerHint: {
    en: "Your page's name from its link, e.g. facebook.com/sokhafashion.",
    km: 'ឈ្មោះទំព័ររបស់អ្នកពីតំណរបស់វា ឧ. facebook.com/sokhafashion។',
  },
  contactPhone: { en: 'Phone customers can call', km: 'លេខទូរស័ព្ទដែលអតិថិជនអាចហៅ' },
  contactPhoneHint: {
    en: 'Shown in your shop, so use a number you are happy to share.',
    km: 'បង្ហាញក្នុងហាងរបស់អ្នក ដូច្នេះសូមប្រើលេខដែលអ្នកព្រមចែករំលែក។',
  },

  shopLink: { en: 'Shop link', km: 'តំណហាង' },
  linkName: { en: 'Link name', km: 'ឈ្មោះក្នុងតំណ' },
  linkNameHint: {
    en: 'If you change it, links you already shared still open your shop.',
    km: 'បើអ្នកប្ដូរវា តំណដែលអ្នកបានចែករំលែករួច នៅតែបើកហាងរបស់អ្នកបាន។',
  },
  linkNameTitle: {
    en: 'Lowercase letters, numbers, and single hyphens',
    km: 'អក្សរអង់គ្លេសតូច លេខ និងសញ្ញា - មួយៗ',
  },
  viewShop: { en: 'View your shop', km: 'មើលហាងរបស់អ្នក' },
  shareTracked: { en: 'Share with a tracked link', km: 'ចែករំលែកជាមួយតំណតាមដាន' },

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
      en: 'Do these to start taking orders. Opening the shop starts your 30-day free trial.',
      km: 'ធ្វើជំហានទាំងនេះ ដើម្បីចាប់ផ្ដើមទទួលការកុម្ម៉ង់។ ការបើកហាងចាប់ផ្ដើមការសាកល្បងឥតគិតថ្លៃ 30 ថ្ងៃរបស់អ្នក។',
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
    freeFrom: { en: (amount: string) => `free from ${amount}`, km: (amount: string) => `ឥតគិតថ្លៃចាប់ពី ${amount}` },
    discount: {
      en: (off: string, from: string) => `${off} off from ${from}`,
      km: (off: string, from: string) => `បញ្ចុះ ${off} ចាប់ពី ${from}`,
    },
    none: { en: 'None', km: 'គ្មាន' },
    lowStockAt: { en: (n: number) => `Low stock at ${n}`, km: (n: number) => `ស្តុកតិចនៅ ${n}` },
    telegramOn: { en: 'Telegram on', km: 'Telegram បានបើក' },
    telegramOff: { en: 'Telegram off', km: 'Telegram បានបិទ' },
    accountHint: { en: 'Name, phone number, password', km: 'ឈ្មោះ លេខទូរស័ព្ទ ពាក្យសម្ងាត់' },
    helpHint: { en: 'Message Oak Order on Telegram', km: 'ផ្ញើសារទៅ Oak Order តាម Telegram' },
    exportHint: { en: 'Your orders as an Excel file', km: 'ការកុម្ម៉ង់របស់អ្នកជាឯកសារ Excel' },
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
        `Your 30-day free trial starts when you open your shop, then it's ${month} a month or ${year} a year. Until then customers can look around but can't order.`,
      km: (month: string, year: string) =>
        `ការសាកល្បងឥតគិតថ្លៃ 30 ថ្ងៃរបស់អ្នកចាប់ផ្ដើមនៅពេលអ្នកបើកហាង បន្ទាប់មក ${month} ក្នុងមួយខែ ឬ ${year} ក្នុងមួយឆ្នាំ។ រហូតដល់ពេលនោះ អតិថិជនអាចមើលហាងបាន ប៉ុន្តែមិនអាចកុម្ម៉ង់បានទេ។`,
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
      en: (day: string) => `Your shop takes orders until ${day}. Pay by then to keep it open.`,
      km: (day: string) => `ហាងរបស់អ្នកទទួលការកុម្ម៉ង់រហូតដល់ ${day}។ សូមបង់ត្រឹមថ្ងៃនោះ ដើម្បីរក្សាហាងឱ្យបើក។`,
    },
    stopped: {
      en: "Your shop isn't taking new orders. Pay to open it again at once.",
      km: 'ហាងរបស់អ្នកមិនទទួលការកុម្ម៉ង់ថ្មីទេ។ សូមបង់ ដើម្បីបើកវាវិញភ្លាមៗ។',
    },
    stoppedNote: {
      en: 'Customers can still see your shop, and you can finish the orders you have. Nothing is deleted.',
      km: 'អតិថិជននៅតែអាចមើលហាងរបស់អ្នកបាន ហើយអ្នកអាចបញ្ចប់ការកុម្ម៉ង់ដែលមានស្រាប់បាន។ គ្មានអ្វីត្រូវបានលុបទេ។',
    },
    includes: { en: "What's included", km: 'អ្វីដែលមានក្នុងគម្រោង' },
    includesEverything: {
      en: 'Everything in Oak Order: your shop, orders, payments, delivery, customers, links and alerts',
      km: 'អ្វីៗទាំងអស់ក្នុង Oak Order៖ ហាង ការកុម្ម៉ង់ ការបង់ប្រាក់ ការដឹកជញ្ជូន អតិថិជន តំណ និងការជូនដំណឹង',
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
      en: "Message Oak Order on Telegram and we'll send you where to pay. Give your shop's code.",
      km: 'ផ្ញើសារមក Oak Order តាម Telegram ហើយយើងនឹងប្រាប់អ្នកពីកន្លែងបង់។ សូមប្រាប់លេខកូដហាងរបស់អ្នក។',
    },
    howToPayContact: {
      en: "Contact Oak Order for where to pay, and give your shop's code.",
      km: 'សូមទាក់ទង Oak Order ដើម្បីដឹងពីកន្លែងបង់ ហើយប្រាប់លេខកូដហាងរបស់អ្នក។',
    },
    payOnTelegram: { en: (price: string) => `Pay ${price} on Telegram`, km: (price: string) => `បង់ ${price} តាម Telegram` },
    // During the trial, more than a week left: Pay folded (UX check #23).
    payEarly: { en: 'Pay early', km: 'បង់មុន' },
    payEarlyHint: {
      en: (day: string) => `Nothing to pay until ${day}. If you like to pay early, you lose no days.`,
      km: (day: string) => `មិនចាំបាច់បង់អ្វីទេ រហូតដល់ ${day}។ ប្រសិនបើអ្នកចង់បង់មុន អ្នកមិនបាត់បង់ថ្ងៃណាមួយទេ។`,
    },
    carriesOn: {
      en: 'Paying early loses no days: the new month or year starts when your time now ends.',
      km: 'ការបង់មុនមិនបាត់បង់ថ្ងៃណាមួយទេ៖ ខែ ឬឆ្នាំថ្មីចាប់ផ្ដើមនៅពេលដែលពេលវេលាបច្ចុប្បន្នរបស់អ្នកបញ្ចប់។',
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
      en: 'Put it in the transfer’s note, so Oak Order knows the money is yours. The KHQR puts it in for you.',
      km: 'ដាក់វាក្នុងកំណត់ចំណាំនៃការផ្ទេរប្រាក់ ដើម្បីឱ្យ Oak Order ដឹងថាប្រាក់នោះជារបស់អ្នក។ KHQR ដាក់វាឱ្យអ្នកស្រាប់។',
    },
    scanToPay: {
      en: 'Scan it with your bank app, or save it and pick it in your bank app.',
      km: 'ស្កេនវាដោយកម្មវិធីធនាគាររបស់អ្នក ឬរក្សាទុក ហើយជ្រើសវាក្នុងកម្មវិធីធនាគារ។',
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
      en: 'Tap after paying. Oak Order checks its account and extends your shop, usually within a day.',
      km: 'ចុចបន្ទាប់ពីបង់។ Oak Order ពិនិត្យគណនីរបស់ខ្លួន ហើយបន្តហាងរបស់អ្នក ជាធម្មតាក្នុងរយៈពេលមួយថ្ងៃ។',
    },
    waiting: {
      en: (amount: string, period: string, when: string) =>
        `Oak Order is checking your ${amount} for ${period} (you said you paid on ${when}). Your shop is extended once it’s found.`,
      km: (amount: string, period: string, when: string) =>
        `Oak Order កំពុងពិនិត្យ ${amount} សម្រាប់${period}របស់អ្នក (អ្នកបានប្រាប់ថាបានបង់នៅ ${when})។ ហាងរបស់អ្នកនឹងត្រូវបានបន្ត នៅពេលរកឃើញ។`,
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
    en: 'None yet: you log in with your email. Add your number to log in with it.',
    km: 'មិនទាន់មាន៖ អ្នកចូលគណនីដោយអ៊ីមែល។ បន្ថែមលេខរបស់អ្នក ដើម្បីចូលគណនីដោយលេខនោះ។',
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
  addPassword: { en: 'Add a password', km: 'បន្ថែមពាក្យសម្ងាត់' },
  passwordAdded: { en: 'Password added', km: 'បានបន្ថែមពាក្យសម្ងាត់' },
  detailsSaved: { en: 'Details saved', km: 'បានរក្សាទុកព័ត៌មាន' },
  changePassword: { en: 'Change password', km: 'ប្ដូរពាក្យសម្ងាត់' },
  changePasswordHint: {
    en: 'Other phones and computers logged in to your shop will be logged out.',
    km: 'ទូរស័ព្ទ និងកុំព្យូទ័រផ្សេងទៀត ដែលបានចូលហាងរបស់អ្នក នឹងត្រូវចាកចេញ។',
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
    en: (shop: string) => `Only the owner of ${shop} can change the shop's settings. Your own account is below.`,
    km: (shop: string) => `មានតែម្ចាស់ ${shop} ទេដែលអាចប្ដូរការកំណត់ហាងបាន។ គណនីរបស់អ្នកនៅខាងក្រោម។`,
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
    en: "They're logged out on their phones and log in with this.",
    km: 'គេនឹងចាកចេញពីទូរស័ព្ទ ហើយចូលវិញដោយពាក្យសម្ងាត់នេះ។',
  },
  saveNewPassword: { en: 'Save new password', km: 'រក្សាទុកពាក្យសម្ងាត់ថ្មី' },
  staffPasswordSet: {
    en: (name: string) => `New password saved for ${name}`,
    km: (name: string) => `បានរក្សាទុកពាក្យសម្ងាត់ថ្មីសម្រាប់ ${name}`,
  },
  removeStaff: { en: 'Remove', km: 'ដកចេញ' },
  removeStaffTitle: { en: (name: string) => `Remove ${name}?`, km: (name: string) => `ដក ${name} ចេញ?` },
  removeStaffMessage: {
    en: "They can't log in any more. What they did to orders stays.",
    km: 'គេនឹងមិនអាចចូលគណនីបានទៀតទេ។ អ្វីដែលគេបានធ្វើលើការកុម្ម៉ង់នៅដដែល។',
  },
  staffRemoved: { en: (name: string) => `${name} removed`, km: (name: string) => `បានដក ${name} ចេញ` },
  closeShop: { en: 'Close shop', km: 'បិទហាង' },
  closeShopWhat: { en: 'What closing does', km: 'អ្វីដែលកើតឡើងពេលបិទហាង' },
  closeShopLink: {
    en: 'Your shop link stops working at once, for every customer.',
    km: 'តំណហាងរបស់អ្នកឈប់ដំណើរការភ្លាមៗ សម្រាប់អតិថិជនទាំងអស់។',
  },
  closeShopLogout: {
    en: "You're logged out on every phone and can't log in.",
    km: 'អ្នកនឹងចាកចេញពីទូរស័ព្ទទាំងអស់ ហើយមិនអាចចូលគណនីបានទេ។',
  },
  closeShopKept: {
    en: 'Nothing is deleted. To open it again, or to have everything erased for good, message Oak Order.',
    km: 'គ្មានអ្វីត្រូវបានលុបទេ។ ដើម្បីបើកវាវិញ ឬលុបអ្វីៗទាំងអស់ជាស្ថាពរ សូមផ្ញើសារទៅ Oak Order។',
  },
  closeShopPassword: { en: 'Your password', km: 'ពាក្យសម្ងាត់របស់អ្នក' },
  closeShopButton: { en: 'Close my shop', km: 'បិទហាងរបស់ខ្ញុំ' },
  closeShopConfirmTitle: { en: 'Close your shop?', km: 'បិទហាងរបស់អ្នក?' },
  closeShopConfirm: {
    en: 'Customers can no longer open it or order, and you are logged out.',
    km: 'អតិថិជននឹងមិនអាចបើក ឬកុម្ម៉ង់បានទៀតទេ ហើយអ្នកនឹងចាកចេញ។',
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
