import type { Tree } from '../core.ts'

/** The customer's order page: confirmation, tracking, how to pay. */
export const order = {
  tab: { en: (shop: string) => `Your order · ${shop}`, km: (shop: string) => `ការកុម្ម៉ង់របស់អ្នក · ${shop}` },
  checkTitle: { en: 'Check your order', km: 'ពិនិត្យការកុម្ម៉ង់របស់អ្នក' },
  checkText: {
    en: 'Enter the phone number you used when you placed this order.',
    km: 'សូមបញ្ចូលលេខទូរស័ព្ទដែលអ្នកបានប្រើពេលកុម្ម៉ង់។',
  },
  wrongPhone: {
    en: "This number doesn't match the order. Check it and try again.",
    km: 'លេខនេះមិនត្រូវនឹងការកុម្ម៉ង់ទេ។ សូមពិនិត្យ ហើយព្យាយាមម្ដងទៀត។',
  },
  showOrder: { en: 'Show my order', km: 'បង្ហាញការកុម្ម៉ង់របស់ខ្ញុំ' },
  thanks: { en: 'Thank you! Your order is placed.', km: 'អរគុណ! យើងបានទទួលការកុម្ម៉ង់របស់អ្នកហើយ។' },
  willConfirm: {
    en: (shop: string) => `${shop} will confirm it and contact you soon.`,
    km: (shop: string) => `${shop} នឹងបញ្ជាក់ ហើយទាក់ទងអ្នកឆាប់ៗនេះ។`,
  },
  willContact: {
    en: (shop: string) => `${shop} will contact you about delivery.`,
    km: (shop: string) => `${shop} នឹងទាក់ទងអ្នកអំពីការដឹកជញ្ជូន។`,
  },
  contactShop: {
    en: (shop: string) => `Contact ${shop} if you have questions about it.`,
    km: (shop: string) => `សូមទាក់ទង ${shop} ប្រសិនបើអ្នកមានសំណួរ។`,
  },
  items: { en: 'Items', km: 'ទំនិញ' },
  comeBack: {
    en: (shop: string) =>
      `On this phone, your order shows at the top of ${shop}'s pages until it arrives. On another phone, open this link and enter your phone number.`,
    km: (shop: string) =>
      `នៅលើទូរស័ព្ទនេះ ការកុម្ម៉ង់របស់អ្នកបង្ហាញនៅខាងលើទំព័ររបស់ ${shop} រហូតដល់វាមកដល់។ លើទូរស័ព្ទផ្សេង សូមបើកតំណនេះ ហើយបញ្ចូលលេខទូរស័ព្ទរបស់អ្នក។`,
  },
  // Under the progress list while the page checks for changes by itself.
  updated: { en: (time: string) => `Updated ${time}`, km: (time: string) => `ធ្វើបច្ចុប្បន្នភាពចុងក្រោយ ${time}` },
  notPaidYet: { en: 'Not paid yet', km: 'មិនទាន់បង់' },
  askAbout: { en: 'Ask about this order on Telegram', km: 'សួរអំពីការកុម្ម៉ង់នេះតាម Telegram' },
  // Typed into the customer's Telegram chat with the seller.
  askAboutText: {
    en: (n: number, url: string) => `Hi! I'd like to ask about my order #${n}: ${url}`,
    km: (n: number, url: string) => `សួស្តី! ខ្ញុំចង់សួរអំពីការកុម្ម៉ង់ #${n} របស់ខ្ញុំ៖ ${url}`,
  },
  yourOrders: { en: 'All your orders', km: 'ការកុម្ម៉ង់ទាំងអស់របស់អ្នក' },
  copyLink: { en: 'Copy link', km: 'ចម្លងតំណ' },
  linkCopied: { en: 'Link copied', km: 'បានចម្លងតំណ' },
  copyLinkFailed: {
    en: "Couldn't copy. Copy the address from your browser instead.",
    km: 'ចម្លងមិនបាន។ សូមចម្លងអាសយដ្ឋានពីកម្មវិធីរុករករបស់អ្នកជំនួសវិញ។',
  },
  deliveryBy: { en: (courier: string) => `Delivery by ${courier}`, km: (courier: string) => `ដឹកដោយ ${courier}` },
  askWhereCollect: {
    en: 'Ask the shop where to collect your order.',
    km: 'សូមសួរហាងថា ត្រូវមកយកការកុម្ម៉ង់នៅកន្លែងណា។',
  },
  stepDone: { en: ' (done)', km: ' (រួចរាល់)' },
  stepNotYet: { en: ' (not yet)', km: ' (មិនទាន់)' },

  // The progress list.
  step: {
    pending: { en: 'Order placed', km: 'បានកុម្ម៉ង់' },
    accepted: { en: 'Confirmed by the seller', km: 'អ្នកលក់បានបញ្ជាក់' },
    processing: { en: 'Being prepared', km: 'កំពុងរៀបចំ' },
    ready: { en: 'Packed and ready', km: 'វេចខ្ចប់រួចរាល់' },
    shipped: { en: 'On the way', km: 'កំពុងដឹកមក' },
    delivered: { en: 'Delivered', km: 'បានដល់ដៃ' },
  },
  // The line under the order number.
  headline: {
    pending: { en: 'Waiting for the seller to confirm', km: 'កំពុងរង់ចាំអ្នកលក់បញ្ជាក់' },
    accepted: { en: 'Confirmed by the seller', km: 'អ្នកលក់បានបញ្ជាក់' },
    processing: { en: 'Being prepared', km: 'កំពុងរៀបចំ' },
    ready: { en: 'Packed and ready', km: 'វេចខ្ចប់រួចរាល់' },
    shipped: { en: 'On the way to you', km: 'កំពុងដឹកមករកអ្នក' },
    delivered: { en: 'Delivered', km: 'បានដល់ដៃ' },
    completed: { en: 'Completed', km: 'បានបញ្ចប់' },
    rejected: { en: "The seller couldn't take this order", km: 'អ្នកលក់មិនអាចទទួលការកុម្ម៉ង់នេះបានទេ' },
    cancelled: { en: 'This order was cancelled', km: 'ការកុម្ម៉ង់នេះត្រូវបានលុបចោល' },
  },
  // A pickup order goes through the same statuses; its customer reads
  // these instead.
  pickupStep: {
    ready: { en: 'Ready to collect', km: 'រួចរាល់ សូមមកយក' },
    shipped: { en: 'Handed over', km: 'បានប្រគល់ជូន' },
    delivered: { en: 'Collected', km: 'បានមកយកហើយ' },
  },
  delivery: {
    not_assigned: { en: 'Not sent out yet', km: 'មិនទាន់បញ្ចេញនៅឡើយ' },
    assigned: { en: 'A driver is assigned', km: 'បានចាត់អ្នកដឹកហើយ' },
    picked_up: { en: 'Picked up by the driver', km: 'អ្នកដឹកបានយកទំនិញហើយ' },
    in_transit: { en: 'On the way', km: 'កំពុងដឹកមក' },
    delivered: { en: 'Delivered', km: 'បានដល់ដៃ' },
    failed: {
      en: "Couldn't deliver. The seller will contact you to try again.",
      km: 'ដឹកមិនបានសម្រេច។ អ្នកលក់នឹងទាក់ទងអ្នក ដើម្បីដឹកម្ដងទៀត។',
    },
  },
  pickupDelivery: {
    not_assigned: { en: 'Not collected yet', km: 'មិនទាន់មកយកនៅឡើយ' },
    delivered: { en: 'Collected', km: 'បានមកយកហើយ' },
  },

  pay: {
    title: { en: 'Payment', km: 'ការបង់ប្រាក់' },
    paid: { en: (total: string) => `Paid · ${total}`, km: (total: string) => `បានបង់ · ${total}` },
    failed: {
      en: (shop: string) => `${shop} couldn't confirm your payment. Contact them about it.`,
      km: (shop: string) => `${shop} មិនអាចបញ្ជាក់ការបង់ប្រាក់របស់អ្នកបានទេ។ សូមទាក់ទងហាង។`,
    },
    refunded: { en: 'Refunded.', km: 'បានសងប្រាក់វិញហើយ។' },
    // "Pay $12.00 in cash when you get your order." (the amount in bold)
    codBefore: { en: 'Pay', km: 'សូមបង់' },
    codAfter: { en: 'in cash when you get your order.', km: 'ជាសាច់ប្រាក់ ពេលទទួលបានទំនិញ។' },
    askHow: {
      en: (shop: string, total: string) => `Not paid yet. Contact ${shop} to ask how to pay ${total}.`,
      km: (shop: string, total: string) => `មិនទាន់បង់។ សូមទាក់ទង ${shop} ដើម្បីសួររបៀបបង់ ${total}។`,
    },
    // "Not paid yet. Pay $12.00 with your bank app:"
    khqrBefore: { en: 'Not paid yet. Pay', km: 'មិនទាន់បង់។ សូមបង់' },
    khqrAfter: { en: 'with your bank app:', km: 'តាមកម្មវិធីធនាគាររបស់អ្នក៖' },
    khqrAlt: {
      en: (total: string, name: string) => `KHQR code to pay ${total} to ${name}`,
      km: (total: string, name: string) => `KHQR សម្រាប់បង់ ${total} ទៅ ${name}`,
    },
    saveQr: { en: 'Save QR code', km: 'រក្សាទុក QR' },
    qrSaved: { en: 'QR code saved', km: 'បានរក្សាទុក QR' },
    khqrStep1: { en: 'Save the QR code, or take a screenshot.', km: 'រក្សាទុក QR ឬថតអេក្រង់។' },
    khqrStep2: {
      en: 'Open your bank app (ABA, ACLEDA, Wing, or another) and tap Scan.',
      km: 'បើកកម្មវិធីធនាគាររបស់អ្នក (ABA, ACLEDA, Wing ឬផ្សេងទៀត) ហើយចុច Scan។',
    },
    khqrStep3: {
      en: 'Choose the saved image from your photos, check the amount, and pay.',
      km: 'ជ្រើសរូបដែលបានរក្សាទុកពីរូបថតរបស់អ្នក ពិនិត្យចំនួនទឹកប្រាក់ ហើយបង់។',
    },
    khqrNote: {
      en: (shop: string) =>
        `Paying from another phone? Scan the code on this screen. The code works for 24 hours; open this page again for a new one. ${shop} checks the payment and confirms it here.`,
      km: (shop: string) =>
        `បង់ពីទូរស័ព្ទផ្សេង? ស្កេន QR នៅលើអេក្រង់នេះ។ QR នេះប្រើបាន 24 ម៉ោង; បើកទំព័រនេះម្ដងទៀត ដើម្បីបាន QR ថ្មី។ ${shop} នឹងពិនិត្យការបង់ប្រាក់ ហើយបញ្ជាក់នៅទីនេះ។`,
    },
    // "Not paid yet. Transfer $12.00 to:"
    bankBefore: { en: 'Not paid yet. Transfer', km: 'មិនទាន់បង់។ សូមផ្ទេរ' },
    bankAfter: { en: 'to:', km: 'ទៅ៖' },
    bank: { en: 'Bank', km: 'ធនាគារ' },
    name: { en: 'Name', km: 'ឈ្មោះ' },
    account: { en: 'Account', km: 'គណនី' },
    amount: { en: 'Amount', km: 'ចំនួនទឹកប្រាក់' },
    copyAccount: { en: 'Copy account number', km: 'ចម្លងលេខគណនី' },
    copyAmount: { en: 'Copy amount', km: 'ចម្លងចំនួនទឹកប្រាក់' },
    accountCopied: { en: 'Account number copied', km: 'បានចម្លងលេខគណនី' },
    amountCopied: { en: 'Amount copied', km: 'បានចម្លងចំនួនទឹកប្រាក់' },
    copyFailed: {
      en: "Couldn't copy. Select the text instead.",
      km: 'ចម្លងមិនបាន។ សូមជ្រើសអត្ថបទជំនួសវិញ។',
    },
    bankNote: {
      en: (n: number) =>
        `Write “#${n}” in the transfer's note so the seller can find your payment. They check it and confirm it here.`,
      km: (n: number) =>
        `សូមសរសេរ “#${n}” ក្នុងចំណាំនៃការផ្ទេរ ដើម្បីឱ្យអ្នកលក់រកឃើញការបង់ប្រាក់របស់អ្នក។ អ្នកលក់នឹងពិនិត្យ ហើយបញ្ជាក់នៅទីនេះ។`,
    },
  },
} satisfies Tree
