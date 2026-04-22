import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from '../components/admin/AdminLayout'
import { MainLayout } from '../components/layout/MainLayout'
import { AboutPage } from '../pages/AboutPage'
import { AdminDashboardPage } from '../pages/AdminDashboardPage'
import { AdminImportedProductsPage } from '../pages/AdminImportedProductsPage'
import { AdminLoginPage } from '../pages/AdminLoginPage'
import { AdminProductEditPage } from '../pages/AdminProductEditPage'
import { CartPage } from '../pages/CartPage'
import { BackendCatalogPage } from '../pages/BackendCatalogPage'
import { BackendProductPage } from '../pages/BackendProductPage'
import { CategoryPage } from '../pages/CategoryPage'
import { ContactPage } from '../pages/ContactPage'
import { DeliveryPage } from '../pages/DeliveryPage'
import { FavoritesPage } from '../pages/FavoritesPage'
import { HomePage } from '../pages/HomePage'
import { NewPage } from '../pages/NewPage'

export function AppRouter() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/catalog" element={<BackendCatalogPage />} />
        <Route path="/category/:slug" element={<CategoryPage />} />
        <Route path="/product/:id" element={<BackendProductPage />} />
        <Route path="/new" element={<NewPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/delivery" element={<DeliveryPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/wishlist" element={<FavoritesPage />} />
        <Route path="/cart" element={<CartPage />} />
      </Route>
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="imported-products" element={<AdminImportedProductsPage />} />
        <Route path="products/:id/edit" element={<AdminProductEditPage />} />
        <Route path="products" element={<Navigate to="/admin/imported-products" replace />} />
        <Route path="products/:id" element={<Navigate to="/admin/imported-products" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
