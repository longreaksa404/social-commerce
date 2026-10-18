import type { Tree } from '../core.ts'

/** Checkout and the map for pinning the delivery spot. */
export const checkout = {
  tab: { en: (shop: string) => `Checkout · ${shop}`, km: (shop: string) => `កុម្ម៉ង់ · ${shop}` },
  title: { en: 'Checkout', km: 'កុម្ម៉ង់' },
  yourDetails: { en: 'Your details', km: 'ព័ត៌មានរបស់អ្នក' },
  name: { en: 'Name', km: 'ឈ្មោះ' },
  phone: { en: 'Phone number', km: 'លេខទូរស័ព្ទ' },
  phoneHint: {
    en: 'For the seller to reach you, and to check your order.',
    km: 'សម្រាប់អ្នកលក់ទាក់ទងអ្នក និងសម្រាប់ពិនិត្យការកុម្ម៉ង់។',
  },
  // Once the number is whole, read back as the seller will see it, so a
  // swapped digit gets noticed before ordering.
  phoneWillCall: {
    en: (phone: string) => `The seller will call ${phone}. Check it's right.`,
    km: (phone: string) =>
      `អ្នកលក់នឹងហៅមកលេខ ${phone}។ សូមពិនិត្យថាត្រឹមត្រូវ។`,
  },
  phoneUnusual: {
    en: (phone: string) => `${phone} doesn't look like a Cambodian number. Please check it.`,
    km: (phone: string) => `លេខ ${phone} មិនដូចលេខនៅកម្ពុជាទេ។ សូមពិនិត្យម្ដងទៀត។`,
  },
  address: { en: 'Address', km: 'អាសយដ្ឋាន' },
  addressOptional: { en: 'Address (optional)', km: 'អាសយដ្ឋាន (មិនចាំបាច់)' },
  addressHintPinned: {
    en: 'Location pinned. Add the address too if you can.',
    km: 'បានដៅទីតាំងហើយ។ បញ្ចូលអាសយដ្ឋានផង បើអាច។',
  },
  addressHintFilled: {
    en: "From the map. Add the house no. if it's missing.",
    km: 'ពីផែនទី។ បន្ថែមលេខផ្ទះ បើមិនទាន់មាន។',
  },
  findingAddress: { en: 'Finding the address…', km: 'កំពុងរកអាសយដ្ឋាន…' },
  addressHint: {
    en: 'House no., street, village, district, province. Or pin it on the map.',
    km: 'លេខផ្ទះ ផ្លូវ ភូមិ ខណ្ឌ/ស្រុក ខេត្ត/រាជធានី។ ឬដៅលើផែនទី។',
  },
  // Behind a link until tapped, like the note for the seller (UX check #11).
  addressNote: { en: 'Directions for the driver', km: 'ការណែនាំផ្លូវសម្រាប់អ្នកដឹក' },
  addressNoteHint: {
    en: 'E.g. blue gate, next to the pagoda.',
    km: 'ឧ. ទ្វាររបងពណ៌ខៀវ ក្បែរវត្ត។',
  },
  noteForSeller: { en: 'Note for the seller', km: 'ចំណាំសម្រាប់អ្នកលក់' },
  // Placing the order with nothing chosen, in the app's words (UX check #22).
  chooseDelivery: { en: 'Choose how to get your order.', km: 'សូមជ្រើសរើសរបៀបទទួលទំនិញ។' },
  choosePayment: { en: 'Choose how to pay.', km: 'សូមជ្រើសរើសរបៀបបង់ប្រាក់។' },
  noteHintPickup: {
    en: 'E.g. when you will come.',
    km: 'ឧ. ពេលដែលអ្នកនឹងមកយក។',
  },
  noteHintDelivery: {
    en: 'E.g. the best time to deliver.',
    km: 'ឧ. ម៉ោងដែលស្រួលទទួលទំនិញ។',
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
      en: 'Scan with your bank app. You get the QR after ordering.',
      km: 'ស្កេនជាមួយកម្មវិធីធនាគារ។ អ្នកនឹងបាន QR ក្រោយពេលកុម្ម៉ង់។',
    },
    bank_transfer: {
      en: 'Transfer to the seller. You see the account after ordering.',
      km: 'ផ្ទេរប្រាក់ទៅអ្នកលក់។ អ្នកនឹងឃើញលេខគណនីក្រោយពេលកុម្ម៉ង់។',
    },
    cod: { en: 'Pay cash when you get it.', km: 'បង់សាច់ប្រាក់ ពេលទទួលទំនិញ។' },
  },
  yourOrder: { en: 'Your order', km: 'ការកុម្ម៉ង់របស់អ្នក' },
  placeOrder: { en: 'Place order', km: 'បញ្ជាក់ការកុម្ម៉ង់' },
  notTakingOrders: { en: 'Not taking orders right now', km: 'មិនទទួលការកុម្ម៉ង់នៅពេលនេះទេ' },
  openingSoon: { en: 'Opening soon', km: 'នឹងបើកឆាប់ៗនេះ' },
  // After the amount on Place order until delivery is chosen.
  plusDelivery: { en: '+ delivery', km: '+ ថ្លៃដឹក' },
  addMore: { en: 'Add more', km: 'ទិញបន្ថែម' },
  chooseAbove: { en: 'Choose above', km: 'ជ្រើសនៅខាងលើ' },

  delivery: { en: 'Delivery', km: 'ការដឹកជញ្ជូន' },
  pickup: { en: 'Pickup', km: 'មកយកផ្ទាល់' },
  deliveryByShop: { en: 'Delivery by the shop', km: 'ហាងដឹកជូនផ្ទាល់' },
  hintOwn: { en: 'The seller brings it to you.', km: 'អ្នកលក់ដឹកជូនដល់អ្នក។' },
  hintPickup: { en: 'Collect it from the seller.', km: 'មកយកពីអ្នកលក់ដោយខ្លួនឯង។' },
  hintCourier: { en: 'Sent with a delivery company.', km: 'ផ្ញើតាមក្រុមហ៊ុនដឹកជញ្ជូន។' },
  hintOwnOrCourier: {
    en: 'By the seller or a delivery company.',
    km: 'អ្នកលក់ដឹកជូន ឬផ្ញើតាមក្រុមហ៊ុនដឹកជញ្ជូន។',
  },
  courierOptional: { en: 'Delivery company (optional)', km: 'ក្រុមហ៊ុនដឹកជញ្ជូន (មិនចាំបាច់)' },
  shopChooses: { en: 'Shop chooses', km: 'ឲ្យហាងជ្រើសរើស' },
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
    en: "Couldn't open the map. Type your address instead.",
    km: 'មិនអាចបើកផែនទីបានទេ។ សូមវាយអាសយដ្ឋានជំនួសវិញ។',
  },
  backToCheckout: { en: 'Back to checkout', km: 'ត្រឡប់ទៅការកុម្ម៉ង់' },

  map: {
    title: { en: 'Pin your location', km: 'ដៅទីតាំងរបស់អ្នក' },
    close: { en: 'Close map', km: 'បិទផែនទី' },
    map: { en: 'Map', km: 'ផែនទី' },
    locate: { en: 'Go to my location', km: 'ទៅទីតាំងរបស់ខ្ញុំ' },
    confirm: { en: 'Confirm location', km: 'បញ្ជាក់ទីតាំង' },
    noGeolocation: {
      en: "Can't get your location. Move the map to your house.",
      km: 'មិនអាចរកទីតាំងបានទេ។ សូមរំកិលផែនទីទៅផ្ទះរបស់អ្នក។',
    },
    denied: {
      en: 'Location is off. Move the map to your house.',
      km: 'ទីតាំងត្រូវបានបិទ។ សូមរំកិលផែនទីទៅផ្ទះរបស់អ្នក។',
    },
    notFound: {
      en: "Couldn't find you. Move the map to your house.",
      km: 'រកទីតាំងមិនឃើញ។ សូមរំកិលផែនទីទៅផ្ទះរបស់អ្នក។',
    },
    hintMove: { en: 'Move the map so the pin is on your house.', km: 'រំកិលផែនទី ឱ្យម្ជុលនៅលើផ្ទះរបស់អ្នក។' },
    hintZoom: {
      en: 'Zoom in closer.',
      km: 'ពង្រីកផែនទីឱ្យជិតជាងនេះ។',
    },
    hintReady: { en: 'The driver comes to the pin.', km: 'អ្នកដឹកនឹងមកដល់កន្លែងម្ជុលនេះ។' },
  },
} satisfies Tree
