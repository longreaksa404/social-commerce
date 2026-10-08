/**
 * Khmer for the API's error messages. The API answers in English
 * ({"error": {"code", "message", "field"}}); English shows its message as
 * sent, Khmer looks it up here: first the exact message (codes like
 * VALIDATION_ERROR have many), then the code, then a general line.
 *
 * When a backend message changes or a new one is added, add it here too.
 */

export const KM_BY_MESSAGE: Record<string, string> = {
  // Accounts
  'Wrong email or password.': 'អ៊ីមែល ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ។',
  'An account with this email already exists.': 'មានគណនីដែលប្រើអ៊ីមែលនេះរួចហើយ។',
  'This account has been disabled.': 'គណនីនេះត្រូវបានបិទ។',
  'Your session has ended. Please log in again.': 'វគ្គរបស់អ្នកបានបញ្ចប់។ សូមចូលគណនីម្ដងទៀត។',
  'Your session has expired.': 'វគ្គរបស់អ្នកផុតកំណត់ហើយ។',
  'Please log in.': 'សូមចូលគណនី។',
  'Password is too long (max 72 bytes).': 'ពាក្យសម្ងាត់វែងពេក។',
  'This account has no store.': 'គណនីនេះមិនមានហាងទេ។',
  'Your current password is wrong.': 'ពាក្យសម្ងាត់បច្ចុប្បន្នមិនត្រឹមត្រូវទេ។',
  'Account not found.': 'រកមិនឃើញគណនី។',
  'This link has expired or was already used. Ask for a new one.':
    'តំណនេះផុតកំណត់ ឬត្រូវបានប្រើរួចហើយ។ សូមស្នើតំណថ្មី។',

  // Shop and checkout (customers)
  "This shop doesn't exist.": 'មិនមានហាងនេះទេ។',
  "This product isn't available.": 'ទំនិញនេះមិនមានទៀតទេ។',
  "This category doesn't exist.": 'មិនមានប្រភេទនេះទេ។',
  'An item in your cart is no longer available.': 'ទំនិញមួយក្នុងកន្ត្រករបស់អ្នក មិនមានទៀតទេ។',
  'Prices or delivery fees changed since you opened your cart. Check your order and place it again.':
    'តម្លៃ ឬថ្លៃដឹកបានផ្លាស់ប្ដូរ តាំងពីអ្នកបើកកន្ត្រក។ សូមពិនិត្យការកុម្ម៉ង់ ហើយកុម្ម៉ង់ម្ដងទៀត។',
  "This shop doesn't take this way to pay any more. Choose another.":
    'ហាងនេះលែងទទួលការបង់ប្រាក់តាមវិធីនេះហើយ។ សូមជ្រើសវិធីផ្សេង។',
  "This shop doesn't offer this any more. Choose another way to get your order.":
    'ហាងនេះលែងផ្ដល់ជម្រើសនេះហើយ។ សូមជ្រើសវិធីផ្សេងដើម្បីទទួលការកុម្ម៉ង់។',
  'The shop changed how it delivers. Choose again.': 'ហាងបានប្ដូររបៀបដឹកជញ្ជូន។ សូមជ្រើសម្ដងទៀត។',
  'Enter your address or share your location.': 'សូមបញ្ចូលអាសយដ្ឋាន ឬចែករំលែកទីតាំងរបស់អ្នក។',
  'Share your location again.': 'សូមចែករំលែកទីតាំងរបស់អ្នកម្ដងទៀត។',
  'No order matches this link and phone number.': 'រកមិនឃើញការកុម្ម៉ង់ដែលត្រូវនឹងតំណ និងលេខទូរស័ព្ទនេះទេ។',
  'Enter a valid phone number.': 'សូមបញ្ចូលលេខទូរស័ព្ទឱ្យបានត្រឹមត្រូវ។',
  "This shop isn't taking orders right now.": 'ហាងនេះមិនទទួលការកុម្ម៉ង់នៅពេលនេះទេ។',

  // Products and categories
  'Product not found.': 'រកមិនឃើញទំនិញ។',
  'Category not found.': 'រកមិនឃើញប្រភេទ។',
  'A variant was not found.': 'រកមិនឃើញជម្រើសមួយ។',
  'Another product already uses this link.': 'មានទំនិញផ្សេងប្រើតំណនេះរួចហើយ។',
  'Another category already uses this link.': 'មានប្រភេទផ្សេងប្រើតំណនេះរួចហើយ។',
  'Each variant needs a different name.': 'ជម្រើសនីមួយៗត្រូវមានឈ្មោះខុសគ្នា។',
  'Add at least one variant, or turn variants off.': 'សូមបន្ថែមជម្រើសយ៉ាងតិចមួយ ឬបិទជម្រើស។',
  'Turn variants on to add variants.': 'សូមបើកជម្រើស ដើម្បីបន្ថែមជម្រើស។',
  'Invalid product image.': 'រូបភាពទំនិញមិនត្រឹមត្រូវ។',
  'Invalid logo image.': 'រូបឡូហ្គោមិនត្រឹមត្រូវ។',
  'Image uploads are not set up yet.': 'ការបង្ហោះរូបភាពមិនទាន់បានរៀបចំនៅឡើយ។',
  'A product can have up to 5 images.': 'ទំនិញមួយអាចមានរូបភាពបានច្រើនបំផុត 5។',
  // Made by the app while preparing a photo (src/lib/images.ts)
  'Please choose a photo.': 'សូមជ្រើសរើសរូបថត។',
  "This photo format isn't supported. Try a JPEG or PNG.": 'មិនគាំទ្រទម្រង់រូបថតនេះទេ។ សូមសាកល្បង JPEG ឬ PNG។',
  "Couldn't read this photo.": 'មិនអាចអានរូបថតនេះបានទេ។',
  'This photo is too large.': 'រូបថតនេះធំពេក។',
  'The photo upload failed. Check your connection and try again.':
    'បង្ហោះរូបថតមិនបាន។ សូមពិនិត្យអ៊ីនធឺណិត ហើយព្យាយាមម្ដងទៀត។',
  'The photo upload failed. Please try again.': 'បង្ហោះរូបថតមិនបាន។ សូមព្យាយាមម្ដងទៀត។',

  // Orders (seller)
  'Order not found.': 'រកមិនឃើញការកុម្ម៉ង់។',
  'Customer not found.': 'រកមិនឃើញអតិថិជន។',
  'Mark the delivery delivered before completing this order.':
    'សូមកំណត់ការដឹកជញ្ជូនថា "បានដល់" មុននឹងបញ្ចប់ការកុម្ម៉ង់នេះ។',
  'Record the payment before completing this order.': 'សូមកត់ត្រាការបង់ប្រាក់ មុននឹងបញ្ចប់ការកុម្ម៉ង់នេះ។',

  // Settings
  'This store link is already taken.': 'តំណហាងនេះមានគេប្រើរួចហើយ។',
  'Choose a day after today.': 'សូមជ្រើសថ្ងៃក្រោយថ្ងៃនេះ។',
  'Choose up to a year, ending after it starts.': 'សូមជ្រើសរយៈពេលមិនលើសមួយឆ្នាំ ដែលថ្ងៃបញ្ចប់នៅក្រោយថ្ងៃចាប់ផ្ដើម។',
  'Store not found.': 'រកមិនឃើញហាង។',
  'Turn on at least one way to pay.': 'សូមបើកវិធីបង់ប្រាក់យ៉ាងតិចមួយ។',
  'A Bakong ID has no spaces.': 'Bakong ID មិនមានដកឃ្លាទេ។',
  'A Bakong ID looks like name@bank.': 'Bakong ID មានទម្រង់ដូចជា name@bank។',
  'Use English letters, as on your bank account.': 'សូមប្រើអក្សរអង់គ្លេស ដូចនៅលើគណនីធនាគាររបស់អ្នក។',
  'Turn on your own delivery, add a courier, or turn on pickup.':
    'សូមបើកការដឹកផ្ទាល់ បន្ថែមក្រុមហ៊ុនដឹកជញ្ជូន ឬបើកការមកយកផ្ទាល់។',
  'Enter where customers pick up their orders.': 'សូមបញ្ចូលកន្លែងដែលអតិថិជនមកយកការកុម្ម៉ង់។',
  'This courier is already on the list.': 'ក្រុមហ៊ុនដឹកជញ្ជូននេះមាននៅក្នុងបញ្ជីរួចហើយ។',
  'Enter how much to take off.': 'សូមបញ្ចូលចំនួនទឹកប្រាក់ដែលត្រូវបញ្ចុះ។',
  "The discount can't be more than the amount it starts from.": 'ការបញ្ចុះតម្លៃមិនអាចលើសចំនួនទឹកប្រាក់ដែលវាចាប់ផ្ដើមទេ។',
  'Enter your Telegram username, e.g. @your_shop: letters, numbers and _.':
    'សូមបញ្ចូលឈ្មោះអ្នកប្រើ Telegram ឧ. @your_shop៖ អក្សរ លេខ និង _។',
  "Telegram alerts aren't set up yet.": 'ការជូនដំណឹងតាម Telegram មិនទាន់បានរៀបចំនៅឡើយ។',
  "Enter your Facebook page's username, e.g. sokhafashion, or its m.me link.":
    'សូមបញ្ចូលឈ្មោះទំព័រ Facebook របស់អ្នក ឧ. sokhafashion ឬតំណ m.me របស់វា។',

  // Links
  'Choose what the link opens.': 'សូមជ្រើសអ្វីដែលតំណនឹងបើក។',
  'Link not found.': 'រកមិនឃើញតំណ។',
  'This product is hidden from your shop. Show it first, then share it.':
    'ទំនិញនេះត្រូវបានលាក់ពីហាងរបស់អ្នក។ សូមបង្ហាញវាជាមុនសិន រួចចែករំលែក។',

  // Made by the app itself (src/lib/api.ts)
  'Cannot reach the server. Check your connection.': 'មិនអាចភ្ជាប់ទៅម៉ាស៊ីនមេបានទេ។ សូមពិនិត្យអ៊ីនធឺណិតរបស់អ្នក។',
}

/** Codes whose message has details filled in (statuses, counts), or that
 * can come with a message not listed above. */
export const KM_BY_CODE: Record<string, string> = {
  INVALID_STATUS_TRANSITION: 'មិនអាចប្ដូរការកុម្ម៉ង់ទៅជំហាននេះបានទេ។ សូមផ្ទុកទំព័រឡើងវិញ ហើយព្យាយាមម្ដងទៀត។',
  INVALID_PAYMENT_TRANSITION: 'មិនអាចប្ដូរការបង់ប្រាក់ទៅស្ថានភាពនេះបានទេ។ សូមផ្ទុកទំព័រឡើងវិញ ហើយព្យាយាមម្ដងទៀត។',
  INVALID_DELIVERY_TRANSITION: 'មិនអាចប្ដូរការដឹកជញ្ជូនទៅស្ថានភាពនេះបានទេ។ សូមផ្ទុកទំព័រឡើងវិញ ហើយព្យាយាមម្ដងទៀត។',
  PRODUCT_OUT_OF_STOCK: 'ទំនិញមួយក្នុងកន្ត្រករបស់អ្នក មិនមានស្តុកគ្រប់គ្រាន់ទេ។',
  TOO_MANY_IMAGES: 'ទំនិញនេះមានរូបភាពច្រើនបំផុតហើយ។',
  RATE_LIMITED: 'ព្យាយាមញឹកញាប់ពេក។ សូមរង់ចាំមួយនាទី ហើយព្យាយាមម្ដងទៀត។',
  INVALID_TOKEN: 'វគ្គរបស់អ្នកបានបញ្ចប់។ សូមចូលគណនីម្ដងទៀត។',
  TOKEN_EXPIRED: 'វគ្គរបស់អ្នកផុតកំណត់ហើយ។',
  NOT_AUTHENTICATED: 'សូមចូលគណនី។',
  NOT_FOUND: 'រកមិនឃើញ។',
  NETWORK_ERROR: 'មិនអាចភ្ជាប់ទៅម៉ាស៊ីនមេបានទេ។ សូមពិនិត្យអ៊ីនធឺណិតរបស់អ្នក។',
  VALIDATION_ERROR: 'ព័ត៌មាននេះមិនត្រឹមត្រូវ។ សូមពិនិត្យ ហើយព្យាយាមម្ដងទៀត។',
}
