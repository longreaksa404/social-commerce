import type { Tree } from '../core.ts'

/** The seller's categories page. */
export const categories = {
  title: { en: 'Categories', km: 'ប្រភេទ' },
  newCategory: { en: 'New category', km: 'ប្រភេទថ្មី' },
  namePlaceholder: { en: 'e.g. Shoes', km: 'ឧ. ស្បែកជើង' },
  added: { en: (name: string) => `Added “${name}”`, km: (name: string) => `បានបន្ថែម “${name}”` },
  emptyTitle: { en: 'No categories yet', km: 'មិនទាន់មានប្រភេទនៅឡើយ' },
  emptyText: {
    en: 'Group your products, like “Shoes” or “Bags”, so customers can browse them.',
    km: 'ដាក់ទំនិញរបស់អ្នកជាក្រុម ដូចជា “ស្បែកជើង” ឬ “កាបូប” ដើម្បីឱ្យអតិថិជនងាយមើល។',
  },
  renamed: { en: 'Category renamed', km: 'បានប្ដូរឈ្មោះប្រភេទ' },
  deleted: { en: (name: string) => `Deleted “${name}”`, km: (name: string) => `បានលុប “${name}”` },
  deleteTitle: { en: (name: string) => `Delete “${name}”?`, km: (name: string) => `លុប “${name}”?` },
  deleteMessage: {
    en: (n: number) => `Its ${n} product${n === 1 ? '' : 's'} will stay in your shop, just without a category.`,
    km: (n: number) => `ទំនិញ ${n} របស់វានឹងនៅក្នុងហាងដដែល គ្រាន់តែគ្មានប្រភេទ។`,
  },
  name: { en: 'Category name', km: 'ឈ្មោះប្រភេទ' },
  saveName: { en: 'Save name', km: 'រក្សាទុកឈ្មោះ' },
  productCount: {
    en: (n: number) => `${n} product${n === 1 ? '' : 's'}`,
    km: (n: number) => `ទំនិញ ${n}`,
  },
  noProducts: { en: 'No products yet', km: 'មិនទាន់មានទំនិញ' },
  // A row's ⋯ menu.
  more: { en: (name: string) => `More for ${name}`, km: (name: string) => `ផ្សេងទៀតសម្រាប់ ${name}` },
  shareLink: { en: 'Share link', km: 'ចែករំលែកតំណ' },
  rename: { en: 'Rename', km: 'ប្ដូរឈ្មោះ' },
} satisfies Tree
