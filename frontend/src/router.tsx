import { createBrowserRouter, Navigate } from 'react-router'
import { OldAdminLink } from './admin/OldAdminLink.tsx'
import { RootLayout } from './components/RootLayout.tsx'
import { FinishSignup } from './pages/FinishSignup.tsx'
import { ForgotPassword } from './pages/ForgotPassword.tsx'
import { Home } from './pages/home/Home.tsx'
import { Legal } from './pages/Legal.tsx'
import { Login } from './pages/Login.tsx'
import { OAuthCallback } from './pages/OAuthCallback.tsx'
import { Register } from './pages/Register.tsx'
import { ResetPassword } from './pages/ResetPassword.tsx'
import { ShopCategory } from './shop/ShopCategory.tsx'
import { ShopCheckout } from './shop/ShopCheckout.tsx'
import { ShopHome } from './shop/ShopHome.tsx'
import { ShopLayout } from './shop/ShopLayout.tsx'
import { ShopOrderPage } from './shop/ShopOrder.tsx'
import { ShopOrders } from './shop/ShopOrders.tsx'
import { ShopProduct } from './shop/ShopProduct.tsx'

// A data router (not <BrowserRouter>) so forms can block navigation while
// they have unsaved changes (useBlocker).

type DashboardPages = typeof import('./dashboard/pages.ts')
/** A seller page, from the dashboard's own chunk (dashboard/pages.ts):
 * downloaded once a seller opens the dashboard, never by the start page or
 * a shop link. */
const dashboard =
  (page: keyof DashboardPages) =>
  async () => ({ Component: (await import('./dashboard/pages.ts'))[page] })
export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/login', element: <Login /> },
      { path: '/register', element: <Register /> },
      { path: '/register/finish', element: <FinishSignup /> },
      { path: '/auth/facebook/callback', element: <OAuthCallback provider="facebook" /> },
      { path: '/privacy', element: <Legal doc="privacy" /> },
      { path: '/terms', element: <Legal doc="terms" /> },
      { path: '/data-deletion', element: <Legal doc="data-deletion" /> },
      { path: '/forgot-password', element: <ForgotPassword /> },
      // The link the bot sends to the shop's Telegram: /reset-password#<token>.
      { path: '/reset-password', element: <ResetPassword /> },
      // "Your shops": what OPEN in Telegram's chat list opens (2026-10-20).
      { path: '/shops', lazy: async () => ({ Component: (await import('./pages/YourShops.tsx')).YourShops }) },
      { path: '/dashboard/admin/*', element: <OldAdminLink /> },
      {
        path: '/dashboard',
        lazy: dashboard('DashboardLayout'),
        children: [
          { index: true, element: <Navigate to="orders" replace /> },
          // One page: on laptops the list stays beside the open order.
          { path: 'orders', lazy: dashboard('OrdersPage') },
          // An order that came by chat (founder's pick 3A).
          { path: 'orders/new', lazy: dashboard('NewOrder') },
          { path: 'orders/:orderId', lazy: dashboard('OrdersPage') },
          // The order's parcel slip, to print or share (pick 4A, 2026-10-25).
          { path: 'orders/:orderId/receipt', lazy: dashboard('Receipt') },
          { path: 'customers', lazy: dashboard('CustomerList') },
          { path: 'customers/:customerId', lazy: dashboard('CustomerDetail') },
          { path: 'products', lazy: dashboard('ProductList') },
          { path: 'products/new', lazy: dashboard('ProductEdit') },
          { path: 'products/:productId', lazy: dashboard('ProductEdit') },
          { path: 'categories', lazy: dashboard('Categories') },
          { path: 'links', lazy: dashboard('LinkList') },
          { path: 'links/new', lazy: dashboard('NewLink') },
          { path: 'links/:linkId', lazy: dashboard('LinkDetail') },
          // One page: on laptops the menu stays beside the open setting.
          { path: 'settings', lazy: dashboard('SettingsPage') },
          { path: 'settings/:section', lazy: dashboard('SettingsPage') },
          { path: 'notifications', lazy: dashboard('Notifications') },
        ],
      },
      {
        // Oak Order's admin panel (01_PRODUCT.md §22.11): its own login,
        // apart from any shop's. Loaded only when opened: sellers and
        // customers never download it.
        path: '/admin',
        lazy: async () => ({ Component: (await import('./admin/session.tsx')).AdminRoot }),
        children: [
          { path: 'login', lazy: async () => ({ Component: (await import('./admin/AdminLogin.tsx')).AdminLogin }) },
          {
            lazy: async () => ({ Component: (await import('./admin/AdminLayout.tsx')).AdminLayout }),
            children: [
              { index: true, lazy: async () => ({ Component: (await import('./admin/AdminHome.tsx')).AdminHome }) },
              // One page: on laptops the list stays beside the open shop (pick 5D).
              { path: 'shops', lazy: async () => ({ Component: (await import('./admin/AdminShops.tsx')).AdminShops }), handle: { page: 'shops' } },
              { path: 'shops/:storeId', lazy: async () => ({ Component: (await import('./admin/AdminShops.tsx')).AdminShops }), handle: { page: 'shops' } },
              { path: 'people', lazy: async () => ({ Component: (await import('./admin/AdminPeople.tsx')).AdminPeople }), handle: { page: 'people' } },
              { path: 'people/:sellerId', lazy: async () => ({ Component: (await import('./admin/AdminPeople.tsx')).AdminPeople }), handle: { page: 'people' } },
              { path: 'money', lazy: async () => ({ Component: (await import('./admin/AdminMoney.tsx')).AdminMoney }) },
              { path: 'analytics', lazy: async () => ({ Component: (await import('./admin/AdminAnalytics.tsx')).AdminAnalytics }) },
              { path: 'orders', lazy: async () => ({ Component: (await import('./admin/AdminOrders.tsx')).AdminOrders }) },
              { path: 'customers', lazy: async () => ({ Component: (await import('./admin/AdminOrders.tsx')).AdminCustomers }) },
              { path: 'customers/:phone', lazy: async () => ({ Component: (await import('./admin/AdminOrders.tsx')).AdminCustomerPage }) },
              { path: 'products', lazy: async () => ({ Component: (await import('./admin/AdminProducts.tsx')).AdminProducts }) },
              { path: 'settings', lazy: async () => ({ Component: (await import('./admin/AdminSettings.tsx')).AdminSettings }) },
              { path: 'system', lazy: async () => ({ Component: (await import('./admin/AdminSystem.tsx')).AdminSystem }) },
              { path: 'bot', lazy: async () => ({ Component: (await import('./admin/AdminBot.tsx')).AdminBot }), handle: { page: 'bot' } },
              { path: 'bot/:key', lazy: async () => ({ Component: (await import('./admin/AdminBot.tsx')).AdminBot }), handle: { page: 'bot' } },
              { path: 'tools', lazy: async () => ({ Component: (await import('./admin/AdminTools.tsx')).AdminTools }) },
              { path: 'log', lazy: async () => ({ Component: (await import('./admin/AdminLog.tsx')).AdminLog }) },
            ],
          },
        ],
      },
      {
        // Customer-facing; link shapes from 02_TECHNICAL.md section 9.1.
        path: '/shop/:storeSlug',
        element: <ShopLayout />,
        children: [
          // All and each category are tabs of one page: switching only
          // changes the products, without the page fading in again.
          { index: true, element: <ShopHome />, handle: { page: 'products' } },
          { path: 'product/:productSlug', element: <ShopProduct /> },
          { path: 'category/:categorySlug', element: <ShopCategory />, handle: { page: 'products' } },
          { path: 'cart', element: <ShopCheckout /> },
          // The cart and checkout are one page since the 2026-10-06 redesign.
          { path: 'checkout', element: <Navigate to="../cart" replace /> },
          // The order's link: its confirmation page and tracking page.
          { path: 'order/:orderId', element: <ShopOrderPage /> },
          // The orders placed on this phone.
          { path: 'orders', element: <ShopOrders /> },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
