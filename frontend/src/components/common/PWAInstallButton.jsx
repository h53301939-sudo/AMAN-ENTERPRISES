import React from 'react';
import { usePWA } from '../../context/PWAContext';
import { Download, Smartphone, CheckCircle } from 'lucide-react';

export default function PWAInstallButton({ variant = 'navbar' }) {
  const { isInstallable, isInstalled, installApp } = usePWA();

  // If app is already installed in Standalone Mode, do not show install prompt
  if (isInstalled) {
    return null;
  }

  // If variant is 'navbar'
  if (variant === 'navbar') {
    return (
      <button
        onClick={installApp}
        className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-[#DC2626] to-blue-600 hover:from-blue-700 hover:to-[#DC2626] text-white rounded-xl text-xs font-black shadow-sm shadow-blue-500/25 transition active:scale-95 border border-blue-400/30"
        title="Install Pepsi ERP Application on Desktop or Mobile"
      >
        <Download className="w-3.5 h-3.5 animate-bounce" />
        <span>Install App</span>
      </button>
    );
  }

  // If variant is 'sidebar'
  if (variant === 'sidebar') {
    return (
      <div className="mt-3 p-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-blue-950/40 rounded-2xl border border-blue-200/80 dark:border-blue-800/50 flex flex-col space-y-2">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-[#DC2626] flex items-center justify-center text-white shrink-0 shadow-sm">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-black text-slate-800 dark:text-white">Install Mobile App</p>
            <p className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">Fast 1-click home screen access</p>
          </div>
        </div>
        <button
          onClick={installApp}
          className="w-full py-1.5 px-3 bg-[#DC2626] hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow transition active:scale-95 flex items-center justify-center space-x-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install Now</span>
        </button>
      </div>
    );
  }

  // If variant is 'settings'
  if (variant === 'settings') {
    return (
      <div className="p-4 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-2xl flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#DC2626] flex items-center justify-center text-white shadow-md">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Progressive Web App (PWA)</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">Install Pepsi ERP directly on your Android phone, tablet or PC without app store.</p>
          </div>
        </div>
        <button
          onClick={installApp}
          className="px-4 py-2 bg-[#DC2626] hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-md transition active:scale-95 flex items-center space-x-1.5"
        >
          <Download className="w-4 h-4" />
          <span>Install App</span>
        </button>
      </div>
    );
  }

  return null;
}
