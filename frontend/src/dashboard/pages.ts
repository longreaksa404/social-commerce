/** Every seller page, in one file so the router can load the whole
 * dashboard as one chunk, only once a seller opens it: the start page and
 * the shop links don't download it (2026-11-06). Add a new dashboard page
 * here and load it in router.tsx with `dashboard()`. */
export { Categories } from './Categories.tsx'
export { CustomerDetail } from './customers/CustomerDetail.tsx'
export { CustomerList } from './customers/CustomerList.tsx'
export { DashboardLayout } from './Layout.tsx'
export { LinkDetail } from './links/LinkDetail.tsx'
export { LinkList } from './links/LinkList.tsx'
export { NewLink } from './links/NewLink.tsx'
export { Notifications } from './Notifications.tsx'
export { NewOrder } from './orders/NewOrder.tsx'
export { OrdersPage } from './orders/OrderList.tsx'
export { Receipt } from './orders/Receipt.tsx'
export { ProductEdit } from './products/ProductEdit.tsx'
export { ProductList } from './products/ProductList.tsx'
export { SettingsPage } from './settings/SettingsPage.tsx'
