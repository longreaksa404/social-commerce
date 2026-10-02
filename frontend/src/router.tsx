import { createBrowserRouter, Navigate } from 'react-router'
import { RootLayout } from './components/RootLayout.tsx'
import { Categories } from './dashboard/Categories.tsx'
import { DashboardLayout } from './dashboard/Layout.tsx'
import { ProductEdit } from './dashboard/products/ProductEdit.tsx'
import { ProductList } from './dashboard/products/ProductList.tsx'
import { Settings } from './dashboard/Settings.tsx'
import { Home } from './pages/Home.tsx'
import { Login } from './pages/Login.tsx'
import { Register } from './pages/Register.tsx'
import { ShopHome } from './shop/ShopHome.tsx'
import { ShopLayout } from './shop/ShopLayout.tsx'

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
          { index: true, element: <Navigate to="products" replace /> },
          { path: 'products', element: <ProductList /> },
          { path: 'products/new', element: <ProductEdit /> },
          { path: 'products/:productId', element: <ProductEdit /> },
          { path: 'categories', element: <Categories /> },
          { path: 'settings', element: <Settings /> },
        ],
      },
      {
        // Customer-facing; link shapes from 02_TECHNICAL.md section 9.1.
        path: '/shop/:storeSlug',
        element: <ShopLayout />,
        children: [{ index: true, element: <ShopHome /> }],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
