import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Package,
  Warehouse,
  Truck,
  ShoppingCart,
  Receipt,
  Users,
  BookOpen,
  BarChart3,
  Activity,
  UserCheck,
  Settings,
  CornerUpLeft,
  ArrowRightLeft,
  Store,
  ClipboardList
} from 'lucide-react';
import amanLogo from '../../assets/amanlogo.jpg';
import PWAInstallButton from '../common/PWAInstallButton';

export default function Sidebar({ mobileMenuOpen, setMobileMenuOpen }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Categorized Navigation Structure for Clean, Organized ERP Hierarchy
  const navCategories = [
    {
      title: 'Sales & Field Orders',
      items: [
        { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, role: 'all' },
        { label: 'Van Sales POS', path: '/pos', icon: ShoppingCart, role: 'all' },
        { label: 'Advance Orders & Bookings', path: '/orders', icon: ClipboardList, role: 'all' },
        { label: 'Direct Warehouse Sale', path: '/warehouse-pos', icon: Store, role: 'all' },
        { label: 'Sales Invoices', path: '/invoices', icon: Receipt, role: 'all' },
        { label: 'Customers & Credit', path: '/customers', icon: Users, role: 'all' },
      ]
    },
    {
      title: 'Fleet & Dispatch',
      items: [
        { label: 'Van Loading', path: '/loading', icon: Package, role: 'all' },
        { label: 'Van Returns', path: '/returns', icon: CornerUpLeft, role: 'all' },
        { label: 'Vehicle Fleet', path: '/vehicles', icon: Truck, role: 'admin' },
      ]
    },
    {
      title: 'Inventory & Procurement',
      items: [
        { label: 'Warehouse Stock', path: '/warehouse', icon: Warehouse, role: 'admin' },
        { label: 'Products Catalog', path: '/products', icon: Package, role: 'admin' },
        { label: 'Purchase Orders (PO)', path: '/purchase-orders', icon: ClipboardList, role: 'admin' },
        { label: 'Stock Inward (Purchases)', path: '/purchases', icon: ArrowRightLeft, role: 'admin' },
        { label: 'Stock Ledger', path: '/ledger', icon: BookOpen, role: 'admin' },
      ]
    },
    {
      title: 'Management & Admin',
      items: [
        { label: 'Reports & Analytics', path: '/reports', icon: BarChart3, role: 'admin' },
        { label: 'Worker Staff', path: '/workers', icon: UserCheck, role: 'admin' },
        { label: 'Activity Logs', path: '/activity-logs', icon: Activity, role: 'admin' },
        { label: 'System Settings', path: '/settings', icon: Settings, role: 'admin' },
      ]
    }
  ];

  const navContent = (
    <div className="p-3 flex flex-col justify-between h-full overflow-y-auto scrollbar-none">
      <div className="space-y-4">
        {navCategories.map((cat, catIdx) => {
          const visibleItems = cat.items.filter(item => item.role === 'all' || (isAdmin && item.role === 'admin'));
          if (visibleItems.length === 0) return null;

          return (
            <div key={catIdx} className="space-y-1">
              {/* Category Header Label */}
              <div className="px-3 pt-1 pb-1 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center justify-between">
                <span>{cat.title}</span>
                <span className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
              </div>

              {/* Items in Category */}
              {visibleItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen && setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center space-x-2.5 px-3 py-2 rounded-xl font-extrabold text-xs transition-all duration-150 ${
                        isActive
                          ? 'bg-[#0051A5] text-white shadow-md shadow-blue-600/30 border-l-4 border-[#E31E24] dark:bg-blue-700'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-blue-50/70 dark:hover:bg-slate-700/60 hover:text-[#0051A5] dark:hover:text-blue-400'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-700/60">
        {/* PWA Install Promo Box (Auto-hides when installed) */}
        <PWAInstallButton variant="sidebar" />

        {/* Footer Aman ERP Branding */}
        <div className="p-2.5 mt-2 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-700/50 flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center bg-white shadow-sm border border-slate-200/80 shrink-0 p-0.5">
            <img src={amanLogo} alt="Aman Enterprises Logo" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black text-slate-800 dark:text-slate-200 leading-tight truncate">Aman ERP v1.0</p>
            <p className="text-[8px] font-semibold text-slate-400 truncate">Single Source Ledger Active</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-shrink-0 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700/80 min-h-[calc(100vh-4rem)] flex-col justify-between transition-colors select-none">
        {navContent}
      </aside>

      {/* Mobile Slide-Out Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-full bg-white dark:bg-slate-800 h-full shadow-2xl overflow-y-auto z-10">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
