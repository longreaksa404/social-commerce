import { createBrowserRouter, Navigate } from 'react-router'
import { RootLayout } from './components/RootLayout.tsx'
import { Categories } from './dashboard/Categories.tsx'
import { CustomerDetail } from './dashboard/customers/CustomerDetail.tsx'
import { CustomerList } from './dashboard/customers/CustomerList.tsx'
import { DashboardLayout } from './dashboard/Layout.tsx'
import { Notifications } from './dashboard/Notifications.tsx'
import { OrderDetail } from './dashboard/orders/OrderDetail.tsx'
import { OrderList } from './dashboard/orders/OrderList.tsx'
import { ProductEdit } from './dashboard/products/ProductEdit.tsx'
import { ProductList } from './dashboard/products/ProductList.tsx'
import { Settings } from './dashboard/Settings.tsx'
import { Home } from './pages/Home.tsx'
import { Login } from './pages/Login.tsx'
import { Register } from './pages/Register.tsx'
import { ShopCart } from './shop/ShopCart.tsx'
import { ShopCategory } from './shop/ShopCategory.tsx'
import { ShopCheckout } from './shop/ShopCheckout.tsx'
import { ShopHome } from './shop/ShopHome.tsx'
import { ShopLayout } from './shop/ShopLayout.tsx'
import { ShopOrderPage } from './shop/ShopOrder.tsx'
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
          { path: 'orders', element: <OrderList /> },
          { path: 'orders/:orderId', element: <OrderDetail /> },
          { path: 'customers', element: <CustomerList /> },
          { path: 'customers/:customerId', element: <CustomerDetail /> },
          { path: 'products', element: <ProductList /> },
          { path: 'products/new', element: <ProductEdit /> },
          { path: 'products/:productId', element: <ProductEdit /> },
          { path: 'categories', element: <Categories /> },
          { path: 'settings', element: <Settings /> },
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
          { path: 'cart', element: <ShopCart /> },
          { path: 'checkout', element: <ShopCheckout /> },
          // The order's link: its confirmation page and tracking page.
          { path: 'order/:orderId', element: <ShopOrderPage /> },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
