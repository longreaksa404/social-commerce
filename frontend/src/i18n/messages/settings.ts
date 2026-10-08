import type { Tree } from '../core.ts'

/** The seller's Settings tab. */
export const settings = {
  title: { en: 'Settings', km: 'ការកំណត់' },
  saved: { en: 'Settings saved', km: 'បានរក្សាទុកការកំណត់' },
  save: { en: 'Save settings', km: 'រក្សាទុកការកំណត់' },
  changeLinkTitle: { en: 'Change your shop link?', km: 'ប្ដូរតំណហាងរបស់អ្នក?' },
  changeLinkMessage: {
    en: 'Links you already shared on social media will stop working.',
    km: 'តំណដែលអ្នកបានចែករំលែករួចនៅលើបណ្ដាញសង្គម នឹងលែងដំណើរការ។',
  },
  changeLink: { en: 'Change link', km: 'ប្ដូរតំណ' },

  store: { en: 'Store', km: 'ហាង' },
  storeName: { en: 'Store name', km: 'ឈ្មោះហាង' },
  description: { en: 'Description', km: 'ការពិពណ៌នា' },
  descriptionHint: {
    en: 'Optional. A line about what you sell, shown on your shop page.',
    km: 'មិនចាំបាច់។ មួយឃ្លាអំពីអ្វីដែលអ្នកលក់ បង្ហាញនៅលើទំព័រហាងរបស់អ្នក។',
  },
  currency: { en: 'Currency', km: 'រូបិយប័ណ្ណ' },
  currencyHint: {
    en: 'Prices are shown in this currency. Existing prices are not converted.',
    km: 'តម្លៃបង្ហាញជារូបិយប័ណ្ណនេះ។ តម្លៃដែលមានស្រាប់មិនត្រូវបានប្ដូរទេ។',
  },
  usd: { en: 'US dollar ($)', km: 'ដុល្លារអាមេរិក ($)' },
  khr: { en: 'Cambodian riel (៛)', km: 'ប្រាក់រៀល (៛)' },
  logo: { en: 'Shop logo', km: 'ឡូហ្គោហាង' },
  logoHint: {
    en: 'Shown at the top of your shop. A square picture works best. Saved at once.',
    km: 'បង្ហាញនៅខាងលើហាងរបស់អ្នក។ រូបការ៉េល្អបំផុត។ រក្សាទុកភ្លាមៗ។',
  },
  addLogo: { en: 'Add logo', km: 'បន្ថែមឡូហ្គោ' },
  changeLogo: { en: 'Change logo', km: 'ប្ដូរឡូហ្គោ' },
  removeLogo: { en: 'Remove logo', km: 'ដកឡូហ្គោចេញ' },
  logoSaved: { en: 'Logo saved', km: 'បានរក្សាទុកឡូហ្គោ' },
  logoRemoved: { en: 'Logo removed', km: 'បានដកឡូហ្គោចេញ' },

  orders: { en: 'Orders', km: 'ការកុម្ម៉ង់' },
  takeOrders: { en: 'Take orders', km: 'ទទួលការកុម្ម៉ង់' },
  takeOrdersOn: { en: 'Customers can order from your shop.', km: 'អតិថិជនអាចកុម្ម៉ង់ពីហាងរបស់អ្នក។' },
  takeOrdersOff: {
    en: "Customers can look around and message you, but can't order. For a holiday, a trip, or while you wait for stock.",
    km: 'អតិថិជនអាចមើលទំនិញ និងផ្ញើសារមកអ្នក ប៉ុន្តែមិនអាចកុម្ម៉ង់បានទេ។ សម្រាប់ថ្ងៃឈប់សម្រាក ការធ្វើដំណើរ ឬពេលរង់ចាំស្តុក។',
  },
  resumeOn: { en: 'Take orders again on', km: 'ទទួលការកុម្ម៉ង់វិញនៅថ្ងៃ' },
  resumeOnHint: {
    en: 'Optional. Orders open again by themselves that morning. Leave empty to turn them back on yourself.',
    km: 'មិនចាំបាច់។ ការកុម្ម៉ង់បើកវិញដោយខ្លួនឯងនៅព្រឹកថ្ងៃនោះ។ ទុកទទេ ដើម្បីបើកវិញដោយខ្លួនអ្នក។',
  },
  autoAccept: { en: 'Accept new orders automatically', km: 'ទទួលការកុម្ម៉ង់ថ្មីដោយស្វ័យប្រវត្តិ' },
  autoAcceptOn: {
    en: 'New orders are accepted right away. You can still cancel one later.',
    km: 'ការកុម្ម៉ង់ថ្មីត្រូវបានទទួលភ្លាមៗ។ អ្នកនៅតែអាចលុបចោលវាពេលក្រោយបាន។',
  },
  autoAcceptOff: {
    en: 'New orders wait for you to accept or reject them.',
    km: 'ការកុម្ម៉ង់ថ្មីរង់ចាំអ្នកទទួល ឬបដិសេធ។',
  },

  payments: { en: 'Payments', km: 'ការបង់ប្រាក់' },
  paymentsHint: {
    en: 'How customers can pay. You confirm each payment yourself on the order, after checking your bank app.',
    km: 'វិធីដែលអតិថិជនអាចបង់ប្រាក់។ អ្នកបញ្ជាក់ការបង់ប្រាក់នីមួយៗដោយខ្លួនឯងលើការកុម្ម៉ង់ ក្រោយពីពិនិត្យកម្មវិធីធនាគាររបស់អ្នក។',
  },
  khqrHint: {
    en: 'Customers get a QR code for their exact total, to scan with any Cambodian bank app.',
    km: 'អតិថិជនទទួលបាន QR សម្រាប់ចំនួនទឹកប្រាក់ត្រឹមត្រូវ ដើម្បីស្កេនជាមួយកម្មវិធីធនាគារណាមួយនៅកម្ពុជា។',
  },
  bakongId: { en: 'Bakong ID', km: 'Bakong ID' },
  bakongIdHint: {
    en: 'In your bank app, with your Bakong or KHQR details. It looks like name@aclb.',
    km: 'មាននៅក្នុងកម្មវិធីធនាគាររបស់អ្នក ជាមួយព័ត៌មាន Bakong ឬ KHQR។ វាមានទម្រង់ដូចជា name@aclb។',
  },
  merchantName: { en: 'Name customers see', km: 'ឈ្មោះដែលអតិថិជនឃើញ' },
  merchantNameHint: {
    en: "Shown in the customer's bank app when they scan. Use the name on your account, in English letters.",
    km: 'បង្ហាញក្នុងកម្មវិធីធនាគាររបស់អតិថិជនពេលគេស្កេន។ សូមប្រើឈ្មោះលើគណនីរបស់អ្នក ជាអក្សរអង់គ្លេស។',
  },
  merchantNameTitle: { en: 'English letters, numbers, and spaces', km: 'អក្សរអង់គ្លេស លេខ និងដកឃ្លា' },
  bankHint: {
    en: 'Customers see this account after they order, and transfer the total.',
    km: 'អតិថិជនឃើញគណនីនេះក្រោយពេលកុម្ម៉ង់ ហើយផ្ទេរប្រាក់សរុប។',
  },
  bank: { en: 'Bank', km: 'ធនាគារ' },
  accountName: { en: 'Name on the account', km: 'ឈ្មោះលើគណនី' },
  accountNumber: { en: 'Account number', km: 'លេខគណនី' },
  codHint: { en: 'Customers pay in cash when they get their order.', km: 'អតិថិជនបង់ជាសាច់ប្រាក់ ពេលទទួលបានទំនិញ។' },
  noPayment: { en: 'Turn on at least one way to pay.', km: 'សូមបើកវិធីបង់ប្រាក់យ៉ាងតិចមួយ។' },

  delivery: { en: 'Delivery', km: 'ការដឹកជញ្ជូន' },
  deliveryHint: {
    en: 'How customers get their orders. You update each delivery on the order.',
    km: 'របៀបដែលអតិថិជនទទួលការកុម្ម៉ង់។ អ្នកកែស្ថានភាពការដឹកនីមួយៗលើការកុម្ម៉ង់។',
  },
  fee: { en: 'Delivery fee', km: 'ថ្លៃដឹក' },
  feeHint: {
    en: 'One price wherever the customer lives, for your own delivery or a courier. Leave empty for free delivery.',
    km: 'តម្លៃតែមួយ មិនថាអតិថិជននៅទីណា សម្រាប់ការដឹកផ្ទាល់ ឬក្រុមហ៊ុនដឹក។ ទុកទទេ បើដឹកឥតគិតថ្លៃ។',
  },
  free: { en: 'Free', km: 'ឥតគិតថ្លៃ' },
  off: { en: 'Off', km: 'បិទ' },
  freeFrom: { en: 'Free delivery from', km: 'ដឹកឥតគិតថ្លៃ ចាប់ពី' },
  freeFromHint: {
    en: 'Optional. Free when the items come to this much or more.',
    km: 'មិនចាំបាច់។ ដឹកឥតគិតថ្លៃ នៅពេលទំនិញសរុបដល់ចំនួននេះ ឬលើសពីនេះ។',
  },
  freeFromItems: { en: 'Free delivery from (items)', km: 'ដឹកឥតគិតថ្លៃ ចាប់ពី (ចំនួនទំនិញ)' },
  freeFromItemsHint: {
    en: 'Optional. Free when the customer buys this many items or more, e.g. 3.',
    km: 'មិនចាំបាច់។ ដឹកឥតគិតថ្លៃ នៅពេលអតិថិជនទិញទំនិញចំនួននេះ ឬច្រើនជាងនេះ ឧ. 3។',
  },
  ownDelivery: { en: 'Own delivery', km: 'ដឹកផ្ទាល់' },
  ownDeliveryHint: {
    en: 'You, or someone you send, bring the order to the customer.',
    km: 'អ្នក ឬអ្នកដែលអ្នកចាត់ឱ្យទៅ ដឹកការកុម្ម៉ង់ទៅដល់អតិថិជន។',
  },
  couriers: { en: 'Couriers', km: 'ក្រុមហ៊ុនដឹកជញ្ជូន' },
  couriersHint: {
    en: 'Delivery companies you send with. The customer chooses one at checkout, and you see their location to pick the branch.',
    km: 'ក្រុមហ៊ុនដឹកជញ្ជូនដែលអ្នកផ្ញើតាម។ អតិថិជនជ្រើសមួយពេលកុម្ម៉ង់ ហើយអ្នកឃើញទីតាំងរបស់គេ ដើម្បីជ្រើសសាខា។',
  },
  courier: { en: 'Courier', km: 'ក្រុមហ៊ុនដឹក' },
  removeCourier: { en: (name: string) => `Remove ${name}`, km: (name: string) => `ដក ${name} ចេញ` },
  thisCourier: { en: 'courier', km: 'ក្រុមហ៊ុនដឹកនេះ' },
  otherCourier: { en: 'Other courier', km: 'ក្រុមហ៊ុនដឹកផ្សេង' },
  pickup: { en: 'Pickup', km: 'មកយកផ្ទាល់' },
  pickupHint: {
    en: 'Customers collect their order from you, for free.',
    km: 'អតិថិជនមកយកការកុម្ម៉ង់ពីអ្នកដោយខ្លួនឯង ដោយឥតគិតថ្លៃ។',
  },
  pickupAddress: { en: 'Pickup address', km: 'អាសយដ្ឋានមកយក' },
  pickupAddressHint: { en: 'Shown at checkout and on the order page.', km: 'បង្ហាញពេលកុម្ម៉ង់ និងនៅលើទំព័រការកុម្ម៉ង់។' },
  pickupPlaceholder: { en: 'Shop 12, Orussey Market, Phnom Penh', km: 'តូបលេខ 12 ផ្សារអូរឫស្សី ភ្នំពេញ' },
  noDelivery: {
    en: 'Turn on your own delivery, add a courier, or turn on pickup.',
    km: 'សូមបើកការដឹកផ្ទាល់ បន្ថែមក្រុមហ៊ុនដឹក ឬបើកការមកយកផ្ទាល់។',
  },

  discounts: { en: 'Discounts', km: 'ការបញ្ចុះតម្លៃ' },
  discountsHint: {
    en: 'Money off when the items in an order come to an amount. If an order reaches more than one, the biggest applies.',
    km: 'បញ្ចុះទឹកប្រាក់ នៅពេលទំនិញក្នុងការកុម្ម៉ង់សរុបដល់ចំនួនមួយ។ បើការកុម្ម៉ង់ដល់លើសពីមួយ ការបញ្ចុះធំជាងគេត្រូវបានប្រើ។',
  },
  noDiscounts: { en: 'No discounts.', km: 'គ្មានការបញ្ចុះតម្លៃ។' },
  whenItemsReach: { en: 'When items reach', km: 'នៅពេលទំនិញដល់' },
  takeOff: { en: 'Take off', km: 'បញ្ចុះ' },
  removeDiscount: { en: 'Remove discount', km: 'ដកការបញ្ចុះតម្លៃចេញ' },
  addDiscount: { en: 'Add discount', km: 'បន្ថែមការបញ្ចុះតម្លៃ' },

  telegram: { en: 'Telegram', km: 'Telegram' },
  telegramHint: {
    en: 'Hear about new orders on your phone, and let customers message you.',
    km: 'ទទួលដំណឹងអំពីការកុម្ម៉ង់ថ្មីនៅលើទូរស័ព្ទ ហើយឱ្យអតិថិជនផ្ញើសារមកអ្នក។',
  },
  orderAlerts: { en: 'Order alerts', km: 'ការជូនដំណឹងការកុម្ម៉ង់' },
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
  usernameHint: {
    en: 'Optional. Customers tap “Ask seller” on a product to message you here. Leave empty to hide the button.',
    km: 'មិនចាំបាច់។ អតិថិជនចុច “សួរអ្នកលក់” លើទំនិញ ដើម្បីផ្ញើសារមកអ្នកនៅទីនេះ។ ទុកទទេ ដើម្បីលាក់ប៊ូតុងនេះ។',
  },

  shopLink: { en: 'Shop link', km: 'តំណហាង' },
  shopLinkHint: { en: 'The address you share with customers.', km: 'អាសយដ្ឋានដែលអ្នកចែករំលែកជាមួយអតិថិជន។' },
  linkName: { en: 'Link name', km: 'ឈ្មោះក្នុងតំណ' },
  linkNameTitle: {
    en: 'Lowercase letters, numbers, and single hyphens',
    km: 'អក្សរអង់គ្លេសតូច លេខ និងសញ្ញា - មួយៗ',
  },
  openShop: { en: 'Open shop', km: 'បើកហាង' },
  shareTracked: { en: 'Share with a tracked link', km: 'ចែករំលែកជាមួយតំណតាមដាន' },

  display: { en: 'Language and theme', km: 'ភាសា និងរូបរាង' },
  displayHint: {
    en: 'For this phone. Customers see light or dark as their phone is set, and can switch it and the language in your shop.',
    km: 'សម្រាប់ទូរស័ព្ទនេះ។ អតិថិជនឃើញពណ៌ភ្លឺ ឬងងឹតតាមការកំណត់ទូរស័ព្ទរបស់គេ ហើយអាចប្ដូរវា និងភាសា នៅក្នុងហាងរបស់អ្នក។',
  },
  language: { en: 'Language', km: 'ភាសា' },
  theme: { en: 'Theme', km: 'រូបរាង' },
  themeChoice: {
    auto: { en: 'Auto', km: 'តាមទូរស័ព្ទ' },
    light: { en: 'Light', km: 'ភ្លឺ' },
    dark: { en: 'Dark', km: 'ងងឹត' },
  },

  // The Settings menu: each row says what's set now.
  menu: {
    shopHint: { en: 'Logo, name, description, currency', km: 'ឡូហ្គោ ឈ្មោះ ការពិពណ៌នា រូបិយប័ណ្ណ' },
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
    freeFrom: { en: (amount: string) => `free from ${amount}`, km: (amount: string) => `ឥតគិតថ្លៃចាប់ពី ${amount}` },
    discount: {
      en: (off: string, from: string) => `${off} off from ${from}`,
      km: (off: string, from: string) => `បញ្ចុះ ${off} ចាប់ពី ${from}`,
    },
    none: { en: 'None', km: 'គ្មាន' },
    alertsOn: { en: 'Order alerts on', km: 'ការជូនដំណឹងបានបើក' },
    alertsOff: { en: 'Order alerts off', km: 'ការជូនដំណឹងបានបិទ' },
    accountHint: { en: 'Name, phone, email, password', km: 'ឈ្មោះ ទូរស័ព្ទ អ៊ីមែល ពាក្យសម្ងាត់' },
    helpHint: { en: 'Message Oak Order on Telegram', km: 'ផ្ញើសារទៅ Oak Order តាម Telegram' },
  },

  account: { en: 'Account', km: 'គណនី' },
  logOut: { en: 'Log out', km: 'ចាកចេញ' },

  yourAccount: { en: 'Your account', km: 'គណនីរបស់អ្នក' },
  yourAccountHint: {
    en: 'You log in with this email and password. Customers never see these.',
    km: 'អ្នកចូលគណនីដោយអ៊ីមែល និងពាក្យសម្ងាត់នេះ។ អតិថិជនមិនឃើញព័ត៌មានទាំងនេះទេ។',
  },
  yourDetails: { en: 'Your details', km: 'ព័ត៌មានរបស់អ្នក' },
  yourName: { en: 'Your name', km: 'ឈ្មោះរបស់អ្នក' },
  yourPhone: { en: 'Your phone number', km: 'លេខទូរស័ព្ទរបស់អ្នក' },
  loginEmailHint: { en: 'You log in with this.', km: 'អ្នកចូលគណនីដោយអ៊ីមែលនេះ។' },
  detailsSaved: { en: 'Details saved', km: 'បានរក្សាទុកព័ត៌មាន' },
  changePassword: { en: 'Change password', km: 'ប្ដូរពាក្យសម្ងាត់' },
  changePasswordHint: {
    en: 'Other phones and computers logged in to your shop will be logged out.',
    km: 'ទូរស័ព្ទ និងកុំព្យូទ័រផ្សេងទៀត ដែលបានចូលហាងរបស់អ្នក នឹងត្រូវចាកចេញ។',
  },
  currentPassword: { en: 'Current password', km: 'ពាក្យសម្ងាត់បច្ចុប្បន្ន' },
  newPassword: { en: 'New password', km: 'ពាក្យសម្ងាត់ថ្មី' },
  help: { en: 'Get help', km: 'សុំជំនួយ' },
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
