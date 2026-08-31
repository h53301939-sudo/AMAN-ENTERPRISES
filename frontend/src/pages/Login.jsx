import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, LogIn, AlertCircle, ShieldCheck, Loader2, ClipboardCheck, TrendingUp, Package, Shield } from 'lucide-react';
import amanHeroBanner from '../assets/aman-hero-banner.jpg';

// 🏢 High-Resolution Warehouse & Stacked Boxes Icon matching reference image
const WarehouseBoxesIcon = ({ className = "w-16 h-16" }) => (
  <svg viewBox="0 0 100 100" fill="none" className={`${className} drop-shadow-md`}>
    {/* Outer Warehouse House Frame */}
    <path 
      d="M50 10L14 38V88H86V38L50 10Z" 
      stroke="white" 
      strokeWidth="5.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />
    {/* Inner Entrance Outline */}
    <path 
      d="M32 88V46H68V88" 
      stroke="white" 
      strokeWidth="4.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />
    {/* Golden Inventory Boxes Stacked inside */}
    {/* Box 1 (Bottom Left) */}
    <rect x="36" y="66" width="13" height="13" rx="2.5" fill="#E6A100" stroke="#0B192E" strokeWidth="2" />
    {/* Box 2 (Bottom Right) */}
    <rect x="51" y="66" width="13" height="13" rx="2.5" fill="#E6A100" stroke="#0B192E" strokeWidth="2" />
    {/* Box 3 (Top Center) */}
    <rect x="43.5" y="51" width="13" height="13" rx="2.5" fill="#E6A100" stroke="#0B192E" strokeWidth="2" />
    {/* Box Tape Highlights */}
    <path d="M42.5 66V79" stroke="#B87D00" strokeWidth="1.5" />
    <path d="M57.5 66V79" stroke="#B87D00" strokeWidth="1.5" />
    <path d="M50 51V64" stroke="#B87D00" strokeWidth="1.5" />
  </svg>
);

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [sessionNotice, setSessionNotice] = useState(() => {
    try {
      const reason = sessionStorage.getItem('pepsi_logout_reason');
      if (!reason || reason === '[object Object]' || reason === 'null' || reason === 'undefined') return '';
      return typeof reason === 'string' ? reason : '';
    } catch (e) {
      return '';
    }
  });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSessionNotice('');
    try {
      sessionStorage.removeItem('pepsi_logout_reason');
    } catch (e) {}
    setLoading(true);

    try {
      const user = await login(email, password);
      sessionStorage.setItem('pepsi_show_target_motivation_on_login', 'true');

      if (user.role === 'admin') {
        navigate('/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    alert('For password resets, please contact your System Administrator.');
  };

  return (
    <div className="min-h-screen w-full bg-[#050C1A] relative overflow-hidden flex items-center justify-center font-sans antialiased select-none p-3 sm:p-6 md:p-8">
      
      {/* 🌌 AMBIENT BACKGROUND GLOW EFFECTS */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#0A2540]/50 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#E6A100]/10 rounded-full blur-[140px] pointer-events-none" />

      {/* 📐 SUBTLE DOT MATRIX OVERLAY */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px]" />

      {/* 🏢 MAIN APP CONTAINER: MOBILE CENTERED CARD / DESKTOP DUAL-PANEL SHOWCASE */}
      <div className="relative z-10 w-full max-w-[420px] lg:max-w-5xl my-auto grid grid-cols-1 lg:grid-cols-12 rounded-[28px] sm:rounded-[36px] overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.85),0_0_40px_rgba(10,37,64,0.4)] border border-white/10">
        
        {/* 🍿 LEFT PANEL: DESKTOP SHOWCASE (VISUAL PROMINENCE ON DESKTOP SCREENS) */}
        <div className="hidden lg:flex lg:col-span-7 flex-col justify-between p-10 bg-[#06152D] text-white relative overflow-hidden border-r border-slate-800">
          
          {/* Background Rack Vignette */}
          <div 
            className="absolute inset-0 bg-cover bg-center filter brightness-[0.22] contrast-125 pointer-events-none"
            style={{ backgroundImage: `url(${amanHeroBanner})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#06152D]/95 via-[#0A1A36]/90 to-[#030B18]/95" />

          {/* Top Brand Block */}
          <div className="relative z-10 space-y-6 pt-4">
            <div className="flex items-center space-x-4">
              <WarehouseBoxesIcon className="w-16 h-16 shrink-0" />
              <div>
                <h1 className="text-3xl font-black tracking-tight leading-none text-white">
                  AMAN <span className="text-[#E6A100]">ENTERPRISES</span>
                </h1>
                <p className="text-xs font-bold text-slate-300 uppercase tracking-widest mt-1.5">
                  WAREHOUSE MANAGEMENT SYSTEM
                </p>
              </div>
            </div>

            <div className="w-16 h-1 bg-[#E6A100] rounded-full" />

            <div className="space-y-3 pt-2">
              <h2 className="text-2xl font-black text-white tracking-tight leading-snug">
                Streamlined Inventory, Van Sales POS & Automated Ledger
              </h2>
              <p className="text-xs text-slate-300 font-medium leading-relaxed max-w-lg">
                Complete distribution tracking for Kurkure, Sev Bhujiya, Namkeen, Kachri, and Wafers across all regional warehouses and fleet vehicles.
              </p>
            </div>
          </div>

          {/* Middle Feature Highlights */}
          <div className="relative z-10 my-8 grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-1">
              <Package className="w-5 h-5 text-[#E6A100]" />
              <p className="text-xs font-bold text-white">Manage Stock</p>
              <p className="text-[10px] text-slate-400">Boxes & Hangers</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-1">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <p className="text-xs font-bold text-white">Track Smarter</p>
              <p className="text-[10px] text-slate-400">Van & Fleet POS</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-1">
              <ClipboardCheck className="w-5 h-5 text-blue-400" />
              <p className="text-xs font-bold text-white">Grow Faster</p>
              <p className="text-[10px] text-slate-400">PDF Invoices</p>
            </div>
          </div>

          {/* Bottom Tagline Pill */}
          <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between">
            <div className="inline-flex items-center space-x-2.5 bg-[#0A1F3F]/80 border border-blue-900/50 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-200">
              <div className="w-6 h-6 rounded-full bg-[#0F2D5A] flex items-center justify-center text-[#E6A100]">
                <ClipboardCheck className="w-3.5 h-3.5" />
              </div>
              <span>Manage Stock. Track Smarter. Grow Faster.</span>
            </div>
          </div>

        </div>

        {/* 📝 RIGHT PANEL / MOBILE CARD CONTAINER */}
        <div className="lg:col-span-5 bg-white flex flex-col justify-between overflow-hidden">
          
          {/* 🔷 TOP HEADER SECTION (DARK BLUE WITH WAREHOUSE ICON & GOLD TEXT) */}
          <div className="bg-[#06152D] text-white px-6 pt-8 pb-7 text-center relative overflow-hidden shrink-0">
            {/* Background Texture Overlay */}
            <div 
              className="absolute inset-0 bg-cover bg-center filter brightness-[0.25] contrast-125 opacity-40 pointer-events-none"
              style={{ backgroundImage: `url(${amanHeroBanner})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#06152D]/90 to-[#06152D]" />

            <div className="relative z-10 flex flex-col items-center space-y-2">
              {/* Warehouse & Stacked Boxes Icon */}
              <WarehouseBoxesIcon className="w-16 h-16 sm:w-20 sm:h-20 mb-1" />

              {/* Title: AMAN ENTERPRISES */}
              <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-none text-white">
                AMAN <span className="text-[#E6A100]">ENTERPRISES</span>
              </h1>

              {/* Subtitle: WAREHOUSE MANAGEMENT SYSTEM */}
              <p className="text-[10px] sm:text-[11px] font-extrabold text-slate-300 uppercase tracking-widest">
                WAREHOUSE MANAGEMENT SYSTEM
              </p>

              {/* Gold Accent Divider Bar */}
              <div className="w-12 h-1 bg-[#E6A100] rounded-full my-1.5" />

              {/* Feature Pill Badge */}
              <div className="inline-flex items-center space-x-2 bg-[#091D3A]/90 border border-blue-900/60 rounded-2xl px-3.5 py-1.5 text-white text-[11px] font-bold shadow-inner mt-1">
                <div className="w-5 h-5 rounded-full bg-[#051124] flex items-center justify-center text-[#E6A100] shrink-0">
                  <ClipboardCheck className="w-3 h-3" />
                </div>
                <span className="text-slate-100 font-semibold">Manage Stock. Track Smarter. Grow Faster.</span>
              </div>
            </div>
          </div>

          {/* 📄 FORM BODY SECTION */}
          <div className="p-6 sm:p-8 space-y-4 flex-1 flex flex-col justify-between">
            
            {/* Session Notice / Error Alerts */}
            {typeof sessionNotice === 'string' && sessionNotice.trim() && !sessionNotice.includes('[object') && !error && (
              <div className={`flex items-center space-x-2 p-2.5 rounded-xl text-xs font-bold animate-fade-in ${
                sessionNotice.toLowerCase().includes('blocked') || sessionNotice.toLowerCase().includes('deactivated')
                  ? 'bg-red-50 border border-red-200 text-red-700'
                  : 'bg-blue-50 border border-blue-200 text-blue-800'
              }`}>
                {sessionNotice.toLowerCase().includes('blocked') || sessionNotice.toLowerCase().includes('deactivated') ? (
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
                ) : (
                  <ShieldCheck className="w-4 h-4 flex-shrink-0 text-blue-600" />
                )}
                <span>{sessionNotice}</span>
              </div>
            )}

            {error && (
              <div className="flex items-center space-x-2 p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold animate-fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            {/* 📝 LOGIN FORM */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* 👤 Username / Email Field */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Username
                </label>
                <div className="relative flex items-center bg-white border border-slate-300 focus-within:border-[#06152D] focus-within:ring-2 focus-within:ring-[#06152D]/15 rounded-xl px-3.5 py-3 transition-all shadow-sm">
                  <User className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your username"
                    className="w-full text-slate-900 text-xs sm:text-sm font-medium placeholder:text-slate-400 focus:outline-none bg-transparent"
                  />
                </div>
              </div>

              {/* 🔒 Password Field */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Password
                </label>
                <div className="relative flex items-center bg-white border border-slate-300 focus-within:border-[#06152D] focus-within:ring-2 focus-within:ring-[#06152D]/15 rounded-xl px-3.5 py-3 transition-all shadow-sm">
                  <Lock className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full text-slate-900 text-xs sm:text-sm font-medium placeholder:text-slate-400 focus:outline-none bg-transparent pr-2"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-slate-700 transition p-1 shrink-0"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox & Forgot Password Link */}
              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="flex items-center space-x-2 font-medium text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-[#06152D] focus:ring-[#06152D] w-4 h-4 cursor-pointer"
                  />
                  <span>Remember me</span>
                </label>

                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="font-bold text-blue-600 hover:text-blue-800 hover:underline transition"
                >
                  Forgot Password?
                </button>
              </div>

              {/* Submit Button (Dark Navy `#06152D` with Arrow-In Icon) */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-[#06152D] hover:bg-[#0A1F42] active:scale-[0.99] text-white font-extrabold text-sm sm:text-base shadow-md flex items-center justify-center space-x-2 transition-all duration-200 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 stroke-[2.5]" />
                    <span>Sign In</span>
                  </>
                )}
              </button>
            </form>

            {/* 🛡️ SECURITY SHIELD FOOTER */}
            <div className="pt-4 mt-2 border-t border-slate-100 text-center relative">
              
              {/* Circular Shield Badge in Center of Divider */}
              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-[#06152D] absolute -top-4 left-1/2 -translate-x-1/2 shadow-xs">
                <Shield className="w-4 h-4 fill-slate-200 stroke-[#06152D]" />
              </div>

              <div className="pt-3 space-y-0.5">
                <p className="text-xs font-black text-slate-800 tracking-tight">
                  Secure. Reliable. Efficient.
                </p>
                <p className="text-[11px] text-slate-500 font-medium">
                  Your inventory, our responsibility.
                </p>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
