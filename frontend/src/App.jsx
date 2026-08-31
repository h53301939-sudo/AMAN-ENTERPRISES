import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { PWAProvider } from './context/PWAContext';
import { ToastProvider } from './context/ToastContext';
import PWAUpdateToast from './components/common/PWAUpdateToast';

// Layout
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import { LayoutDashboard, ShoppingCart, Package, Users, CornerUpLeft } from 'lucide-react';

// Pages
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import WorkerDashboard from './pages/WorkerDashboard';
import ProductsPage from './pages/ProductsPage';
import PurchaseOrdersPage from './pages/PurchaseOrdersPage';
import WarehousePage from './pages/WarehousePage';
import PurchasesPage from './pages/PurchasesPage';
import VehiclesPage from './pages/VehiclesPage';
import VehicleLoadingPage from './pages/VehicleLoadingPage';
import SalesPosPage from './pages/SalesPosPage';
import DirectWarehousePosPage from './pages/DirectWarehousePosPage';
import InvoicesPage from './pages/InvoicesPage';
import OrdersPage from './pages/OrdersPage';
import CustomersPage from './pages/CustomersPage';
import ReturnsPage from './pages/ReturnsPage';
import LedgerPage from './pages/LedgerPage';
import ReportsPage from './pages/ReportsPage';
import ActivityLogsPage from './pages/ActivityLogsPage';
import WorkersPage from './pages/WorkersPage';
import SettingsPage from './pages/SettingsPage';

// Protected Route Guard
const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white text-sm font-bold">
        Loading Pepsi Distribution System...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && user.role !== 'admin') {
    return <Navigate to="/pos" replace />;
  }

  return children;
};

// Main Layout Wrapper
const DashboardLayout = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col font-['Inter',sans-serif]">
      <Navbar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
      <div className="flex flex-1 relative">
        <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
        <main className="flex-1 p-3 md:p-6 pb-20 md:pb-6 overflow-y-auto w-full">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Quick Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-700 px-2 py-1 flex items-center justify-around text-slate-600 dark:text-slate-300 shadow-lg">
        <NavLink to="/dashboard" className={({isActive}) => `flex flex-col items-center p-1 font-extrabold text-[10px] transition ${isActive ? 'text-[#DC2626] dark:text-blue-400' : ''}`}>
          {({isActive}) => (
            <>
              {isActive && <span className="w-1.5 h-1.5 bg-[#E32934] rounded-full mb-0.5" />}
              <LayoutDashboard className="w-5 h-5" />
              <span>Home</span>
            </>
          )}
        </NavLink>
        <NavLink to="/pos" className={({isActive}) => `flex flex-col items-center p-1 font-extrabold text-[10px] transition ${isActive ? 'text-[#DC2626] dark:text-blue-400' : ''}`}>
          {({isActive}) => (
            <>
              {isActive && <span className="w-1.5 h-1.5 bg-[#E32934] rounded-full mb-0.5" />}
              <ShoppingCart className="w-5 h-5" />
              <span>POS</span>
            </>
          )}
        </NavLink>
        <NavLink to="/loading" className={({isActive}) => `flex flex-col items-center p-1 font-extrabold text-[10px] transition ${isActive ? 'text-[#DC2626] dark:text-blue-400' : ''}`}>
          {({isActive}) => (
            <>
              {isActive && <span className="w-1.5 h-1.5 bg-[#E32934] rounded-full mb-0.5" />}
              <Package className="w-5 h-5" />
              <span>Loading</span>
            </>
          )}
        </NavLink>
        <NavLink to="/customers" className={({isActive}) => `flex flex-col items-center p-1 font-extrabold text-[10px] transition ${isActive ? 'text-[#DC2626] dark:text-blue-400' : ''}`}>
          {({isActive}) => (
            <>
              {isActive && <span className="w-1.5 h-1.5 bg-[#E32934] rounded-full mb-0.5" />}
              <Users className="w-5 h-5" />
              <span>Customers</span>
            </>
          )}
        </NavLink>
        <NavLink to="/returns" className={({isActive}) => `flex flex-col items-center p-1 font-extrabold text-[10px] transition ${isActive ? 'text-[#DC2626] dark:text-blue-400' : ''}`}>
          {({isActive}) => (
            <>
              {isActive && <span className="w-1.5 h-1.5 bg-[#E32934] rounded-full mb-0.5" />}
              <CornerUpLeft className="w-5 h-5" />
              <span>Returns</span>
            </>
          )}
        </NavLink>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PWAProvider>
          <ToastProvider>
            <Router>
              <PWAUpdateToast />
              <Routes>
              {/* Public Login Route */}
              <Route path="/login" element={<Login />} />

              {/* Protected App Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <DashboardRedirect />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/pos"
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <SalesPosPage />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/warehouse-pos"
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <DirectWarehousePosPage />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/products"
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <DashboardLayout>
                      <ProductsPage />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/purchase-orders"
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <DashboardLayout>
                      <PurchaseOrdersPage />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/purchases"
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <DashboardLayout>
                      <PurchasesPage />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/warehouse"
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <DashboardLayout>
                      <WarehousePage />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/vehicles"
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <DashboardLayout>
                      <VehiclesPage />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/loading"
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <VehicleLoadingPage />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/invoices"
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <InvoicesPage />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/orders"
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <OrdersPage />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/customers"
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <CustomersPage />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/returns"
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <ReturnsPage />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/ledger"
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <DashboardLayout>
                      <LedgerPage />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/reports"
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <DashboardLayout>
                      <ReportsPage />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/workers"
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <DashboardLayout>
                      <WorkersPage />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/activity-logs"
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <DashboardLayout>
                      <ActivityLogsPage />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/settings"
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <DashboardLayout>
                      <SettingsPage />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Router>
          </ToastProvider>
        </PWAProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

// Redirect based on User Role
function DashboardRedirect() {
  const { user } = useAuth();
  if (user?.role === 'admin') {
    return <AdminDashboard />;
  }
  return <WorkerDashboard />;
}
