import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { 
  Sun, 
  Moon, 
  LogOut, 
  Truck, 
  Menu, 
  X, 
  User, 
  ShieldCheck, 
  Settings, 
  Activity, 
  ChevronDown, 
  CheckCircle2,
  Mail
} from 'lucide-react';
import amanLogo from '../../assets/amanlogo.jpg';
import PWAInstallButton from '../common/PWAInstallButton';

export default function Navbar({ onSearchChange, mobileMenuOpen, setMobileMenuOpen }) {
  const { user, logout } = useAuth();
  const { darkMode, toggleTheme } = useTheme();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clean user display name (removes any accidental double "(Admin)" in name string)
  const rawName = user?.name || 'User';
  const cleanName = rawName.replace(/\s*\(Admin\)/gi, '').trim();

  // Get user initials for avatar (e.g., "Rajesh Sharma" -> "RS")
  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleLogout = () => {
    setIsProfileOpen(false);
    logout();
  };

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-3 sm:px-6 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-700/80 shadow-sm transition-colors relative">
      {/* 🔵🔴🟡 Signature Tri-Color Top Border */}
      <div className="absolute top-0 left-0 right-0 h-1 flex">
        <div className="w-1/3 bg-[#0051A5]" />
        <div className="w-1/3 bg-[#E31E24]" />
        <div className="w-1/3 bg-[#FFC72C]" />
      </div>

      {/* Brand & Mobile Hamburger Toggle */}
      <div className="flex items-center space-x-2.5 sm:space-x-3">
        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen && setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-[#0051A5] transition active:scale-95"
          title="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <div className="flex items-center space-x-2 sm:space-x-2.5">
          {/* 🔴 Circular Round Aman Enterprises Logo Badge */}
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden flex items-center justify-center bg-white shadow-sm border border-slate-200 dark:border-slate-700 flex-shrink-0 p-0.5">
            <img
              src={amanLogo}
              alt="Aman Enterprises Logo"
              className="w-full h-full object-cover"
            />
          </div>

          <div>
            <h1 className="font-black text-sm sm:text-base md:text-lg leading-none tracking-tight">
              <span className="text-[#0051A5] dark:text-blue-400">AMAN</span>{' '}
              <span className="text-[#E31E24]">ENTERPRISES</span>
            </h1>
            <p className="text-[8px] sm:text-[9px] md:text-[10px] uppercase font-extrabold tracking-widest text-[#D97706] dark:text-amber-400 mt-0.5">
              Namkeen & Wholesale ERP
            </p>
          </div>
        </div>
      </div>

      {/* User Actions & Profile */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Worker Van Assignment Badge */}
        {user?.role === 'worker' && user?.assignedVehicle && (
          <div className="hidden md:flex items-center space-x-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-[#DC2626] dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-700/60 text-xs font-bold">
            <Truck className="w-3.5 h-3.5" />
            <span>Van: {user.assignedVehicle.vehicleNumber || 'Assigned'}</span>
          </div>
        )}

        {/* PWA Install Button (Auto-hides when installed) */}
        <PWAInstallButton variant="navbar" />

        {/* Dark/Light Mode Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/80 transition"
          title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* 👤 INTERACTIVE PROFILE AVATAR & DROPDOWN */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className={`flex items-center space-x-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-2xl border transition-all active:scale-95 ${
              isProfileOpen
                ? 'bg-blue-50 dark:bg-blue-950/50 border-[#DC2626] dark:border-blue-500 shadow-sm'
                : 'bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-600'
            }`}
            title="User Profile & Menu"
            aria-expanded={isProfileOpen}
          >
            {/* Circular Avatar with Glowing Online Indicator */}
            <div className="relative">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#001D66] to-[#DC2626] text-white flex items-center justify-center font-black text-xs shadow-sm border border-white/20">
                {getInitials(cleanName)}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-800" />
            </div>

            {/* User Name & Role (Desktop) */}
            <div className="hidden sm:block text-left pr-1">
              <p className="text-xs font-black text-slate-900 dark:text-white leading-tight truncate max-w-[120px]">
                {cleanName}
              </p>
              <div className="flex items-center space-x-1 mt-0.5">
                <span className="text-[9px] px-1.5 py-0.2 rounded-md font-extrabold uppercase bg-blue-100 text-[#DC2626] dark:bg-blue-900/60 dark:text-blue-300">
                  {user?.role === 'admin' ? 'Admin' : 'Staff'}
                </span>
              </div>
            </div>

            {/* Chevron Icon */}
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 hidden sm:block ${
              isProfileOpen ? 'rotate-180 text-[#DC2626]' : ''
            }`} />
          </button>

          {/* 🌟 PROFILE DROPDOWN MENU */}
          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700/80 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150 overflow-hidden">
              
              {/* Header: User Info Card */}
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center space-x-3">
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#001D66] to-[#DC2626] text-white flex items-center justify-center font-black text-base shadow-md shadow-blue-500/20 border border-white/20">
                    {getInitials(cleanName)}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900" title="Active Online" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-1.5">
                    <p className="text-sm font-black text-slate-900 dark:text-white truncate">
                      {cleanName}
                    </p>
                    {user?.role === 'admin' && (
                      <ShieldCheck className="w-4 h-4 text-[#DC2626] dark:text-blue-400 shrink-0" title="Admin Verified" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {user?.email || 'admin@pepsi.com'}
                  </p>
                  <div className="mt-1.5 flex items-center space-x-1.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-[#DC2626] dark:bg-blue-900/60 dark:text-blue-300">
                      {user?.role === 'admin' ? '👑 Main Administrator' : '🚛 Route Salesman'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Worker Van Assignment (If applicable) */}
              {user?.role === 'worker' && user?.assignedVehicle && (
                <div className="mx-3 my-2 p-2.5 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-100 dark:border-blue-900/40 flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-300 font-bold flex items-center space-x-1.5">
                    <Truck className="w-3.5 h-3.5 text-[#DC2626] dark:text-blue-400" />
                    <span>Assigned Van:</span>
                  </span>
                  <span className="font-black text-[#DC2626] dark:text-blue-300">
                    {user.assignedVehicle.vehicleNumber}
                  </span>
                </div>
              )}

              {/* Quick Navigation Links */}
              <div className="px-2 py-1.5 space-y-0.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                {user?.role === 'admin' && (
                  <>
                    <Link
                      to="/settings"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center space-x-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                      <span>Company & System Settings</span>
                    </Link>
                    <Link
                      to="/activity-logs"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center space-x-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      <Activity className="w-4 h-4 text-slate-400" />
                      <span>System Activity Logs</span>
                    </Link>
                  </>
                )}
                
                <button
                  type="button"
                  onClick={() => {
                    toggleTheme();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left"
                >
                  <div className="flex items-center space-x-2.5">
                    {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-400" />}
                    <span>{darkMode ? 'Light Theme Mode' : 'Dark Theme Mode'}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 uppercase font-black">
                    {darkMode ? 'Dark' : 'Light'}
                  </span>
                </button>
              </div>

              {/* Divider */}
              <div className="my-1.5 border-t border-slate-100 dark:border-slate-800" />

              {/* 🚪 LOGOUT BUTTON */}
              <div className="px-2">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-2 px-3 py-2.5 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 font-black text-xs transition active:scale-98"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout / Sign Out</span>
                </button>
              </div>

            </div>
          )}
        </div>
      </div>
    </header>
  );
}
