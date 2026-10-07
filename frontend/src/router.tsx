import { createBrowserRouter, Navigate } from 'react-router'
import { RootLayout } from './components/RootLayout.tsx'
import { Categories } from './dashboard/Categories.tsx'
import { CustomerDetail } from './dashboard/customers/CustomerDetail.tsx'
import { CustomerList } from './dashboard/customers/CustomerList.tsx'
import { DashboardLayout } from './dashboard/Layout.tsx'
import { LinkDetail } from './dashboard/links/LinkDetail.tsx'
import { LinkList } from './dashboard/links/LinkList.tsx'
import { NewLink } from './dashboard/links/NewLink.tsx'
import { Notifications } from './dashboard/Notifications.tsx'
import { OrdersPage } from './dashboard/orders/OrderList.tsx'
import { ProductEdit } from './dashboard/products/ProductEdit.tsx'
import { ProductList } from './dashboard/products/ProductList.tsx'
import { SettingsMenu } from './dashboard/settings/SettingsMenu.tsx'
import { SettingsSection } from './dashboard/settings/SettingsSection.tsx'
import { Home } from './pages/Home.tsx'
import { Login } from './pages/Login.tsx'
import { Register } from './pages/Register.tsx'
import { ShopCategory } from './shop/ShopCategory.tsx'
import { ShopCheckout } from './shop/ShopCheckout.tsx'
import { ShopHome } from './shop/ShopHome.tsx'
import { ShopLayout } from './shop/ShopLayout.tsx'
import { ShopOrderPage } from './shop/ShopOrder.tsx'
import { ShopOrders } from './shop/ShopOrders.tsx'
import { ShopProduct } from './shop/ShopProduct.tsx'

// A data router (not <BrowserRouter>) so forms can block navigation while
// they have unsaved changes (useBlocker).
export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/login', element: <Login /> },
      { path: '/register', element: <Register /> },
      {
        path: '/dashboard',
        element: <DashboardLayout />,
        children: [
          { index: true, element: <Navigate to="orders" replace /> },
          // One page: on laptops the list stays beside the open order.
          { path: 'orders', element: <OrdersPage /> },
          { path: 'orders/:orderId', element: <OrdersPage /> },
          { path: 'customers', element: <CustomerList /> },
          { path: 'customers/:customerId', element: <CustomerDetail /> },
          { path: 'products', element: <ProductList /> },
          { path: 'products/new', element: <ProductEdit /> },
          { path: 'products/:productId', element: <ProductEdit /> },
          { path: 'categories', element: <Categories /> },
          { path: 'links', element: <LinkList /> },
          { path: 'links/new', element: <NewLink /> },
          { path: 'links/:linkId', element: <LinkDetail /> },
          { path: 'settings', element: <SettingsMenu /> },
          { path: 'settings/:section', element: <SettingsSection /> },
          { path: 'notifications', element: <Notifications /> },
        ],
      },
      {
        // Customer-facing; link shapes from 02_TECHNICAL.md section 9.1.
        path: '/shop/:storeSlug',
        element: <ShopLayout />,
        children: [
          { index: true, element: <ShopHome /> },
          { path: 'product/:productSlug', element: <ShopProduct /> },
          { path: 'category/:categorySlug', element: <ShopCategory /> },
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
