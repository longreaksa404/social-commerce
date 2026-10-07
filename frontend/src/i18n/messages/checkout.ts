import type { Tree } from '../core.ts'

/** Checkout and the map for pinning the delivery spot. */
export const checkout = {
  tab: { en: (shop: string) => `Checkout · ${shop}`, km: (shop: string) => `កុម្ម៉ង់ · ${shop}` },
  title: { en: 'Checkout', km: 'កុម្ម៉ង់' },
  yourDetails: { en: 'Your details', km: 'ព័ត៌មានរបស់អ្នក' },
  name: { en: 'Name', km: 'ឈ្មោះ' },
  phone: { en: 'Phone number', km: 'លេខទូរស័ព្ទ' },
  phoneHint: {
    en: "The seller will contact you on this number. You'll also need it to check your order.",
    km: 'អ្នកលក់នឹងទាក់ទងអ្នកតាមលេខនេះ។ អ្នកក៏ត្រូវការវា ដើម្បីពិនិត្យមើលការកុម្ម៉ង់របស់អ្នកដែរ។',
  },
  address: { en: 'Address', km: 'អាសយដ្ឋាន' },
  addressOptional: { en: 'Address (optional)', km: 'អាសយដ្ឋាន (មិនចាំបាច់)' },
  addressHintPinned: {
    en: 'Your location is pinned. Add the address too if you can.',
    km: 'បានដៅទីតាំងរបស់អ្នករួចហើយ។ សូមបញ្ចូលអាសយដ្ឋានផងដែរ បើអាច។',
  },
  addressHint: {
    en: 'House and street number, village, district, and province. Or pin your location above.',
    km: 'លេខផ្ទះ ផ្លូវ ភូមិ ខណ្ឌ/ស្រុក និងខេត្ត/រាជធានី។ ឬដៅទីតាំងរបស់អ្នកនៅខាងលើ។',
  },
  addressNote: { en: 'Address note', km: 'ចំណាំអំពីអាសយដ្ឋាន' },
  addressNoteHint: {
    en: 'Optional. Helps the driver find you, e.g. blue gate, next to the pagoda.',
    km: 'មិនចាំបាច់។ ជួយឱ្យអ្នកដឹករកអ្នកឃើញ ឧ. ទ្វាររបងពណ៌ខៀវ ក្បែរវត្ត។',
  },
  noteForSeller: { en: 'Note for the seller', km: 'ចំណាំសម្រាប់អ្នកលក់' },
  noteHintPickup: {
    en: 'Optional. For example, when you will come.',
    km: 'មិនចាំបាច់។ ឧទាហរណ៍ ពេលដែលអ្នកនឹងមកយក។',
  },
  noteHintDelivery: {
    en: 'Optional. For example, the best time to deliver.',
    km: 'មិនចាំបាច់។ ឧទាហរណ៍ ម៉ោងដែលស្រួលទទួលទំនិញ។',
  },
  payment: { en: 'Payment', km: 'ការបង់ប្រាក់' },
  howPay: { en: 'How will you pay?', km: 'តើអ្នកនឹងបង់ប្រាក់តាមរបៀបណា?' },
  // Payment details (QR code, bank account) come on the order page.
  // On the payment tiles, side by side.
  paymentShort: {
    khqr: { en: 'KHQR', km: 'KHQR' },
    bank_transfer: { en: 'Bank', km: 'ធនាគារ' },
    cod: { en: 'Cash', km: 'សាច់ប្រាក់' },
  },
  paymentHint: {
    khqr: {
      en: "Scan a QR code with your bank app. You'll get it after placing the order.",
      km: 'ស្កេន QR ជាមួយកម្មវិធីធនាគាររបស់អ្នក។ អ្នកនឹងទទួលបាន QR ក្រោយពេលកុម្ម៉ង់។',
    },
    bank_transfer: {
      en: "Transfer to the seller's account. You'll see it after placing the order.",
      km: 'ផ្ទេរប្រាក់ទៅគណនីរបស់អ្នកលក់។ អ្នកនឹងឃើញលេខគណនីក្រោយពេលកុម្ម៉ង់។',
    },
    cod: { en: 'Pay in cash when you get your order.', km: 'បង់ជាសាច់ប្រាក់ ពេលទទួលបានទំនិញ។' },
  },
  yourOrder: { en: 'Your order', km: 'ការកុម្ម៉ង់របស់អ្នក' },
  placeOrder: { en: 'Place order', km: 'បញ្ជាក់ការកុម្ម៉ង់' },
  // After the amount on Place order until delivery is chosen.
  plusDelivery: { en: '+ delivery', km: '+ ថ្លៃដឹក' },
  addMore: { en: 'Add more', km: 'ទិញបន្ថែម' },
  chooseAbove: { en: 'Choose above', km: 'ជ្រើសនៅខាងលើ' },

  delivery: { en: 'Delivery', km: 'ការដឹកជញ្ជូន' },
  pickup: { en: 'Pickup', km: 'មកយកផ្ទាល់' },
  deliveryByShop: { en: 'Delivery by the shop', km: 'ហាងដឹកជូនផ្ទាល់' },
  hintOwn: { en: 'The seller brings it to you.', km: 'អ្នកលក់ដឹកជូនដល់អ្នក។' },
  hintPickup: { en: 'Collect it from the seller.', km: 'មកយកពីអ្នកលក់ដោយខ្លួនឯង។' },
  hintCourier: { en: 'Sent with this delivery company.', km: 'ផ្ញើតាមក្រុមហ៊ុនដឹកជញ្ជូននេះ។' },
  howGet: { en: 'How do you want to get your order?', km: 'តើអ្នកចង់ទទួលការកុម្ម៉ង់តាមរបៀបណា?' },
  freeFromAmount: { en: (amount: string) => `orders from ${amount}`, km: (amount: string) => `ការកុម្ម៉ង់ចាប់ពី ${amount}` },
  freeFromItems: { en: (n: number) => `${n} or more items`, km: (n: number) => `ទំនិញចាប់ពី ${n} ឡើងទៅ` },
  freeDelivery: {
    en: (rules: string[], applies: boolean) =>
      `${applies ? 'Your delivery is free' : 'Free delivery'} on ${rules.join(' or ')}.`,
    km: (rules: string[], applies: boolean) =>
      `${applies ? 'ការដឹករបស់អ្នកឥតគិតថ្លៃ' : 'ដឹកជូនឥតគិតថ្លៃ'} សម្រាប់${rules.join(' ឬ ')}។`,
  },
  pickUpAt: { en: 'Pick up at', km: 'មកយកនៅ' },
  locationPinned: { en: 'Location pinned.', km: 'បានដៅទីតាំងហើយ។' },
  change: { en: 'Change', km: 'ប្ដូរ' },
  pinLocation: { en: 'Pin my location on the map', km: 'ដៅទីតាំងរបស់ខ្ញុំលើផែនទី' },
  openingMap: { en: 'Opening the map…', km: 'កំពុងបើកផែនទី…' },
  mapUnavailable: {
    en: "Couldn't open the map. Check your connection, or just type your address.",
    km: 'មិនអាចបើកផែនទីបានទេ។ សូមពិនិត្យអ៊ីនធឺណិត ឬគ្រាន់តែវាយអាសយដ្ឋានរបស់អ្នក។',
  },
  backToCheckout: { en: 'Back to checkout', km: 'ត្រឡប់ទៅការកុម្ម៉ង់' },

  map: {
    title: { en: 'Pin your location', km: 'ដៅទីតាំងរបស់អ្នក' },
    close: { en: 'Close map', km: 'បិទផែនទី' },
    map: { en: 'Map', km: 'ផែនទី' },
    locate: { en: 'Go to my location', km: 'ទៅទីតាំងរបស់ខ្ញុំ' },
    confirm: { en: 'Confirm location', km: 'បញ្ជាក់ទីតាំង' },
    noGeolocation: {
      en: "This phone can't share its location. Move the map to your house instead.",
      km: 'ទូរស័ព្ទនេះមិនអាចចែករំលែកទីតាំងបានទេ។ សូមរំកិលផែនទីទៅផ្ទះរបស់អ្នកជំនួសវិញ។',
    },
    denied: {
      en: 'Location is off on this phone. Move the map to your house instead.',
      km: 'ទីតាំងត្រូវបានបិទនៅលើទូរស័ព្ទនេះ។ សូមរំកិលផែនទីទៅផ្ទះរបស់អ្នកជំនួសវិញ។',
    },
    notFound: {
      en: "Couldn't find you. Move the map to your house instead.",
      km: 'រកទីតាំងរបស់អ្នកមិនឃើញ។ សូមរំកិលផែនទីទៅផ្ទះរបស់អ្នកជំនួសវិញ។',
    },
    hintMove: { en: 'Move the map until the pin is on your house.', km: 'រំកិលផែនទី រហូតដល់ម្ជុលស្ថិតនៅលើផ្ទះរបស់អ្នក។' },
    hintZoom: {
      en: 'Zoom in closer so the pin is on your house.',
      km: 'ពង្រីកផែនទីឱ្យជិតជាងនេះ ដើម្បីឱ្យម្ជុលស្ថិតនៅលើផ្ទះរបស់អ្នក។',
    },
    hintReady: { en: 'The pin is where the driver will come.', km: 'អ្នកដឹកនឹងមកដល់កន្លែងម្ជុលនេះ។' },
  },
} satisfies Tree
