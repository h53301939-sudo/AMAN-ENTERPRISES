import React from 'react';
import { usePWA } from '../../context/PWAContext';
import { RefreshCw, WifiOff, Wifi } from 'lucide-react';

export default function PWAUpdateToast() {
  const { updateAvailable, applyUpdate, isOnline } = usePWA();

  return (
    <>
      {/* 🔄 New App Deployment Update Notification Toast */}
      {updateAvailable && (
        <div className="fixed bottom-16 sm:bottom-6 right-4 sm:right-6 z-50 max-w-sm bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-blue-500/40 animate-slide-up flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-[#DC2626] flex items-center justify-center text-white shrink-0 shadow">
            <RefreshCw className="w-5 h-5 animate-spin" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-black">New Update Ready</p>
            <p className="text-[10px] text-slate-300">A new version of Pepsi ERP is available.</p>
          </div>
          <button
            onClick={applyUpdate}
            className="px-3 py-1.5 bg-[#DC2626] hover:bg-blue-600 text-white font-extrabold text-xs rounded-xl shadow transition active:scale-95 shrink-0"
          >
            Update
          </button>
        </div>
      )}

      {/* 📡 Offline Status Banner */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-slate-950 font-black text-xs py-1 px-4 text-center flex items-center justify-center space-x-2 shadow-md">
          <WifiOff className="w-3.5 h-3.5" />
          <span>You are currently offline. Local cache active. Reconnecting...</span>
        </div>
      )}
    </>
  );
}
