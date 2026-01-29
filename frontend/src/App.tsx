import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import MenuPage from './pages/MenuPage';
import OrderTrackingPage from './pages/OrderTrackingPage';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminRegisterPage from './pages/admin/AdminRegisterPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminCategories from './pages/admin/AdminCategories';
import AdminProducts from './pages/admin/AdminProducts';
import AdminOrders from './pages/admin/AdminOrders';
import AdminSettings from './pages/admin/AdminSettings';
import AdminPromotions from './pages/admin/AdminPromotions';
import ProtectedRoute from './components/ProtectedRoute';
import { Navigate } from "react-router-dom";

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          {/* Rotas públicas */}
          <Route path="/menu/:slug" element={<MenuPage />} />
          <Route path="/" element={<Navigate to="/admin/login" />} />
          <Route path="/pedido/:slug/:orderNumber" element={<OrderTrackingPage />} />
          
          {/* Rotas admin */}
          <Route path="/admin/register" element={<AdminRegisterPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/categories"
            element={
              <ProtectedRoute>
                <AdminCategories />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/products"
            element={
              <ProtectedRoute>
                <AdminProducts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/promotions"
            element={
              <ProtectedRoute>
                <AdminPromotions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/orders"
            element={
              <ProtectedRoute>
                <AdminOrders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute>
                <AdminSettings />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </>
  );
}

export default App;
