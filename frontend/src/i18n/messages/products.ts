import type { Tree } from '../core.ts'

/** The seller's Products tab and the product form. */
export const products = {
  title: { en: 'Products', km: 'ទំនិញ' },
  product: { en: 'Product', km: 'ទំនិញ' },
  addProduct: { en: 'Add product', km: 'បន្ថែមទំនិញ' },
  emptyTitle: { en: 'Add your first product', km: 'បន្ថែមទំនិញដំបូងរបស់អ្នក' },
  emptyText: {
    en: 'Products you add show in your shop.',
    km: 'ទំនិញដែលអ្នកបន្ថែម នឹងបង្ហាញក្នុងហាងរបស់អ្នក។',
  },
  status: {
    all: { en: 'All', km: 'ទាំងអស់' },
    active: { en: 'Active', km: 'កំពុងលក់' },
    inactive: { en: 'Hidden', km: 'លាក់' },
  },
  filterVisibility: { en: 'Filter by visibility', km: 'ច្រោះតាមការបង្ហាញ' },
  filterCategory: { en: 'Filter by category', km: 'ច្រោះតាមប្រភេទ' },
  allCategories: { en: 'All categories', km: 'គ្រប់ប្រភេទ' },
  noneHereTitle: { en: 'No products here', km: 'គ្មានទំនិញនៅទីនេះទេ' },
  noneHereText: { en: 'No products match these filters.', km: 'គ្មានទំនិញណាត្រូវនឹងការច្រោះនេះទេ។' },
  showAll: { en: 'Show all products', km: 'បង្ហាញទំនិញទាំងអស់' },
  hidden: { en: 'Hidden', km: 'លាក់' },
  outOfStock: { en: 'Out of stock', km: 'អស់ស្តុក' },
  inStock: { en: (n: number) => `${n} in stock`, km: (n: number) => `ស្តុក ${n}` },
  onlyLeft: { en: (n: number) => `Only ${n} left`, km: (n: number) => `នៅសល់តែ ${n}` },
  hiddenFromShop: { en: 'Hidden from shop', km: 'លាក់ពីហាង' },
  // The list's two ways to show products, remembered on this device.
  view: {
    label: { en: 'Show products as', km: 'បង្ហាញទំនិញជា' },
    grid: { en: 'Photos', km: 'រូបថត' },
    list: { en: 'List', km: 'បញ្ជី' },
  },
  // The table's headings (laptops, List).
  column: {
    name: { en: 'Name', km: 'ឈ្មោះ' },
    price: { en: 'Price', km: 'តម្លៃ' },
    stock: { en: 'Stock', km: 'ស្តុក' },
    category: { en: 'Category', km: 'ប្រភេទ' },
    inShop: { en: 'In shop', km: 'ក្នុងហាង' },
    shown: { en: 'Shown', km: 'បង្ហាញ' },
    // The last, empty column with the › (for screen readers only).
    open: { en: 'Open', km: 'បើក' },
    sortBy: { en: (column: string) => `Sort by ${column}`, km: (column: string) => `តម្រៀបតាម${column}` },
  },
  variantCount: { en: (n: number) => `${n} variants`, km: (n: number) => `ជម្រើស ${n}` },

  newProduct: { en: 'New product', km: 'ទំនិញថ្មី' },
  editProduct: { en: 'Edit product', km: 'កែទំនិញ' },
  changesSaved: { en: 'Changes saved', km: 'បានរក្សាទុកការកែប្រែ' },
  productAdded: { en: 'Product added', km: 'បានបន្ថែមទំនិញ' },
  uploadingPhotoOf: {
    en: (i: number, n: number) => `Uploading photo ${i} of ${n}…`,
    km: (i: number, n: number) => `កំពុងបង្ហោះរូបទី ${i} នៃ ${n}…`,
  },
  photosNotUploaded: {
    en: (reason: string) => `Product saved, but photos weren't uploaded. ${reason}`,
    km: (reason: string) => `បានរក្សាទុកទំនិញ ប៉ុន្តែរូបថតមិនបានបង្ហោះទេ។ ${reason}`,
  },
  photos: { en: 'Photos', km: 'រូបថត' },
  details: { en: 'Details', km: 'ព័ត៌មាន' },
  name: { en: 'Product name', km: 'ឈ្មោះទំនិញ' },
  namePlaceholder: { en: 'e.g. Leather sandal', km: 'ឧ. អាវយឺតកប្បាស' },
  description: { en: 'Description', km: 'ការពិពណ៌នា' },
  descriptionHint: {
    en: 'Size, material, how to care for it…',
    km: 'ទំហំ សាច់ក្រណាត់ របៀបថែទាំ…',
  },
  category: { en: 'Category', km: 'ប្រភេទ' },
  noCategoriesYet: { en: 'No categories yet.', km: 'មិនទាន់មានប្រភេទនៅឡើយ។' },
  createOne: { en: 'Create one', km: 'បង្កើតមួយ' },
  noCategory: { en: 'No category', km: 'គ្មានប្រភេទ' },
  price: { en: 'Price', km: 'តម្លៃ' },
  hasVariants: { en: 'This product has variants', km: 'ទំនិញនេះមានជម្រើស' },
  hasVariantsHint: {
    en: 'Sizes or colors, each with its own stock.',
    km: 'ទំហំ ឬពណ៌ ដែលនីមួយៗមានស្តុករៀងខ្លួន។',
  },
  variant: { en: (i: number) => `Variant ${i}`, km: (i: number) => `ជម្រើសទី ${i}` },
  removeVariant: { en: (i: number) => `Remove variant ${i}`, km: (i: number) => `ដកជម្រើសទី ${i} ចេញ` },
  variantName: { en: 'Name', km: 'ឈ្មោះ' },
  variantNamePlaceholder: { en: 'e.g. Red / M', km: 'ឧ. ក្រហម / M' },
  stock: { en: 'Stock', km: 'ស្តុក' },
  samePrice: { en: 'Same', km: 'ដូចគ្នា' },
  // "SKU" is a word few small sellers know (UX check #28, 2026-10-17).
  sku: { en: 'Product code (optional)', km: 'លេខកូដទំនិញ (មិនចាំបាច់)' },
  addSkus: { en: 'Your own product codes (optional)', km: 'លេខកូដទំនិញផ្ទាល់ខ្លួន (មិនចាំបាច់)' },
  variantPriceHint: {
    en: 'Leave empty to use the product price.',
    km: 'ទុកទទេ ដើម្បីប្រើតម្លៃទំនិញ។',
  },
  addVariant: { en: 'Add variant', km: 'បន្ថែមជម្រើស' },
  // A new product's stock starts empty and must be filled in, so nothing
  // goes into the shop as sold out by accident (UX check, 2026-10-17).
  stockQuestion: { en: 'How many do you have?', km: 'តើអ្នកមានប៉ុន្មាន?' },
  stockPlaceholder: { en: 'e.g. 10', km: 'ឧ. 10' },
  stockZero: { en: 'Customers will see “Sold out”.', km: 'អតិថិជននឹងឃើញថា “អស់ស្តុក”។' },
  variantStockZero: {
    en: 'Options with 0 show “Sold out”.',
    km: 'ជម្រើសដែលមាន 0 បង្ហាញថា “អស់ស្តុក”។',
  },
  decreaseStock: { en: 'Decrease stock', km: 'បន្ថយស្តុក' },
  increaseStock: { en: 'Increase stock', km: 'បន្ថែមស្តុក' },
  visibility: { en: 'Visibility', km: 'ការបង្ហាញ' },
  showInShop: { en: 'Show in shop', km: 'បង្ហាញក្នុងហាង' },
  advanced: { en: 'Advanced', km: 'កម្រិតខ្ពស់' },
  linkName: { en: 'Link name', km: 'ឈ្មោះក្នុងតំណ' },
  linkNameHint: {
    en: "Changing it breaks links you already shared.",
    km: 'ការប្ដូរវានឹងធ្វើឱ្យតំណដែលអ្នកបានចែករំលែករួច លែងដំណើរការ។',
  },

  photo: {
    tooMany: { en: 'A product can have up to 5 photos.', km: 'ទំនិញមួយអាចមានរូបថតបានច្រើនបំផុត 5។' },
    main: { en: 'Main', km: 'រូបចម្បង' },
    setMain: { en: 'Set main', km: 'ដាក់ជារូបចម្បង' },
    remove: { en: (i: number) => `Remove photo ${i}`, km: (i: number) => `ដករូបទី ${i} ចេញ` },
    uploading: { en: 'Uploading photo', km: 'កំពុងបង្ហោះរូបថត' },
    add: { en: 'Add photo', km: 'បន្ថែមរូបថត' },
    uploadFailed: { en: 'The photo upload failed. Please try again.', km: 'បង្ហោះរូបថតមិនបាន។ សូមព្យាយាមម្ដងទៀត។' },
    cantRead: { en: "Couldn't read this photo.", km: 'មិនអាចអានរូបថតនេះបានទេ។' },
  },

  // Leaving a form with unsaved changes.
  discardTitle: { en: 'Discard changes?', km: 'បោះបង់ការកែប្រែ?' },
  discardMessage: { en: "Your changes haven't been saved.", km: 'ការកែប្រែរបស់អ្នកមិនទាន់បានរក្សាទុកទេ។' },
  discard: { en: 'Discard', km: 'បោះបង់' },
} satisfies Tree
