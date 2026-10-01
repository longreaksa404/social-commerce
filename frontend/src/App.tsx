import { Navigate, Route, Routes } from 'react-router'
import { Categories } from './dashboard/Categories.tsx'
import { DashboardLayout } from './dashboard/Layout.tsx'
import { ProductEdit } from './dashboard/products/ProductEdit.tsx'
import { ProductList } from './dashboard/products/ProductList.tsx'
import { Settings } from './dashboard/Settings.tsx'
import { Home } from './pages/Home.tsx'
import { Login } from './pages/Login.tsx'
import { Register } from './pages/Register.tsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<Navigate to="products" replace />} />
        <Route path="products" element={<ProductList />} />
        <Route path="products/new" element={<ProductEdit />} />
        <Route path="products/:productId" element={<ProductEdit />} />
        <Route path="categories" element={<Categories />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
