import React from 'react';
import { X, PlusSquare, Smartphone, Laptop, Compass, CheckCircle2 } from 'lucide-react';
import amanLogo from '../../assets/amanlogo.jpg';

export default function PWAInstallModal({
  isOpen,
  onClose,
  platform = 'desktop', // 'ios' | 'android' | 'desktop'
  isIOSSafari = true
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 sm:p-7 shadow-2xl border border-slate-100 dark:border-slate-700 relative overflow-hidden flex flex-col max-h-[92vh] transform transition-all animate-slide-up">
        
        {/* 🔴🔵 Pepsi Header Line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 flex">
          <div className="w-1/2 bg-[#DC2626]" />
          <div className="w-1/2 bg-[#E32934]" />
        </div>

        {/* ✕ Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition z-20"
          title="Close guide"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 📱 Header & App Identity */}
        <div className="flex items-center space-x-3 mt-1 pb-4 border-b border-slate-100 dark:border-slate-700/80">
          <div className="w-11 h-11 rounded-full bg-white shadow-md border border-slate-200/80 dark:border-slate-700 flex items-center justify-center p-0.5 shrink-0 overflow-hidden">
            <img src={amanLogo} alt="Aman Enterprises Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">
              {platform === 'ios' && 'Install on iPhone / iPad'}
              {platform === 'android' && 'Install on Android'}
              {platform === 'desktop' && 'Install on Desktop / PC'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Open Pepsi ERP like a standalone application
            </p>
          </div>
        </div>

        {/* ===================== 🍎 1. iOS / iPhone Walkthrough ===================== */}
        {platform === 'ios' && (
          <div className="mt-4 space-y-3.5 overflow-y-auto pr-1">
            {!isIOSSafari && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl flex items-start space-x-2.5 text-amber-900 dark:text-amber-200">
                <Compass className="w-4 h-4 text-amber-700 dark:text-amber-300 mt-0.5 shrink-0" />
                <div className="text-xs">
                  <p className="font-bold">Open in Apple Safari</p>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
                    Apple only allows installing apps from <strong>Safari</strong>. Tap (•••) and select <strong>Open in Safari</strong>.
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start space-x-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200/80 dark:border-slate-600/50">
              <div className="w-7 h-7 rounded-full bg-[#DC2626] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm">1</div>
              <div className="flex-1 text-xs">
                <p className="font-extrabold text-slate-900 dark:text-white">Tap the Share Button</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">Tap the Share icon at the bottom of Safari.</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-[#DC2626] dark:text-blue-400 shrink-0">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200/80 dark:border-slate-600/50">
              <div className="w-7 h-7 rounded-full bg-[#DC2626] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm">2</div>
              <div className="flex-1 text-xs">
                <p className="font-extrabold text-slate-900 dark:text-white">Select "Add to Home Screen"</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">Scroll down in the menu and tap <strong>Add to Home Screen</strong>.</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-200 shrink-0">
                <PlusSquare className="w-5 h-5" />
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200/80 dark:border-slate-600/50">
              <div className="w-7 h-7 rounded-full bg-[#DC2626] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm">3</div>
              <div className="flex-1 text-xs">
                <p className="font-extrabold text-slate-900 dark:text-white">Tap "Add" in Top Right</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">Confirm by tapping <strong>Add</strong> in the top-right corner.</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 font-black text-xs">
                Add
              </div>
            </div>
          </div>
        )}

        {/* ===================== 💻 2. Windows / Mac Desktop Walkthrough ===================== */}
        {platform === 'desktop' && (
          <div className="mt-4 space-y-3.5 overflow-y-auto pr-1">
            <div className="flex items-start space-x-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200/80 dark:border-slate-600/50">
              <div className="w-7 h-7 rounded-full bg-[#DC2626] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm">1</div>
              <div className="flex-1 text-xs">
                <p className="font-extrabold text-slate-900 dark:text-white">Click Address Bar Install Icon</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                  In Chrome or Edge, look at the right side of the browser URL bar for the <strong>Install App icon (⊕ or 💻)</strong>.
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-[#DC2626] dark:text-blue-400 shrink-0 font-black text-sm">
                ⊕
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200/80 dark:border-slate-600/50">
              <div className="w-7 h-7 rounded-full bg-[#DC2626] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm">2</div>
              <div className="flex-1 text-xs">
                <p className="font-extrabold text-slate-900 dark:text-white">Or Use Browser Menu (⋮)</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                  Click the <strong>3 dots (⋮)</strong> at the top right of Chrome &rarr; <strong>"Save and share"</strong> &rarr; <strong>"Install Pepsi Sales"</strong>.
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-200 shrink-0 font-bold text-base">
                ⋮
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-emerald-900 dark:text-emerald-200 font-semibold leading-relaxed">
                Once installed, Pepsi ERP will launch in its own standalone desktop window with a desktop shortcut!
              </p>
            </div>
          </div>
        )}

        {/* ===================== 🤖 3. Android Walkthrough ===================== */}
        {platform === 'android' && (
          <div className="mt-4 space-y-3.5 overflow-y-auto pr-1">
            <div className="flex items-start space-x-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200/80 dark:border-slate-600/50">
              <div className="w-7 h-7 rounded-full bg-[#DC2626] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm">1</div>
              <div className="flex-1 text-xs">
                <p className="font-extrabold text-slate-900 dark:text-white">Tap Chrome Menu (⋮)</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                  Tap the <strong>3 vertical dots</strong> in the top-right corner of Chrome.
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-200 shrink-0 font-bold text-base">
                ⋮
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200/80 dark:border-slate-600/50">
              <div className="w-7 h-7 rounded-full bg-[#DC2626] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm">2</div>
              <div className="flex-1 text-xs">
                <p className="font-extrabold text-slate-900 dark:text-white">Tap "Install app" / "Add to Home screen"</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                  Select <strong>Install app</strong> or <strong>Add to Home screen</strong> and tap <strong>Install</strong>.
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-[#DC2626] dark:text-blue-400 shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
            </div>
          </div>
        )}

        {/* 🔘 Got it / Close Action Button */}
        <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-700/80">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 bg-[#DC2626] hover:bg-blue-700 text-white font-extrabold rounded-2xl transition shadow-md shadow-blue-500/25 active:scale-95 text-xs sm:text-sm flex items-center justify-center space-x-2"
          >
            <span>Got it, Close</span>
          </button>
        </div>

      </div>
    </div>
  );
}
