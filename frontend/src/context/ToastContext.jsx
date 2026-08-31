import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X, Check } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  const addToast = useCallback((message, type = 'success', duration = 0, title = '') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    const newToast = { id, message, type, duration, title };

    setToasts((prev) => {
      // Prevent stacking duplicate toasts with identical title & message
      if (prev.some((t) => t.message === message && t.title === title)) {
        return prev;
      }
      return [...prev, newToast];
    });

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    return id;
  }, [removeToast]);

  const toast = {
    success: (message, title = 'Success!') => addToast(message, 'success', 0, title),
    error: (message, title = 'Error') => addToast(message, 'error', 0, title),
    warning: (message, title = 'Warning') => addToast(message, 'warning', 0, title),
    info: (message, title = 'Info') => addToast(message, 'info', 0, title),
    remove: removeToast,
    dismissAll: dismissAll
  };

  // Get the most recent active toast for centered modal display
  const activeToast = toasts.length > 0 ? toasts[toasts.length - 1] : null;

  return (
    <ToastContext.Provider value={{ toast, addToast, removeToast, dismissAll }}>
      {children}

      {/* 🎯 CENTERED POPUP MODAL NOTIFICATION WITH 1-CLICK DISMISS */}
      {activeToast && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm animate-fade-in"
          onClick={dismissAll}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden flex flex-col items-center text-center transform transition-all animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Color Accent Line */}
            <div className={`absolute top-0 left-0 right-0 h-1.5 ${
              activeToast.type === 'success'
                ? 'bg-emerald-500'
                : activeToast.type === 'error'
                ? 'bg-red-500'
                : activeToast.type === 'warning'
                ? 'bg-amber-500'
                : 'bg-blue-500'
            }`} />

            {/* ✕ Close Icon at Top Right */}
            <button
              type="button"
              onClick={dismissAll}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* 🤖 Official "Message from System" Header */}
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2 shadow-sm">
              <span className={`w-2 h-2 rounded-full animate-pulse ${
                activeToast.type === 'success'
                  ? 'bg-emerald-500'
                  : activeToast.type === 'error'
                  ? 'bg-red-500'
                  : activeToast.type === 'warning'
                  ? 'bg-amber-500'
                  : 'bg-blue-500'
              }`} />
              <span>Message from System</span>
            </div>

            {/* Hero Icon */}
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-lg ${
              activeToast.type === 'success'
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shadow-emerald-500/20'
                : activeToast.type === 'error'
                ? 'bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 shadow-red-500/20'
                : activeToast.type === 'warning'
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 shadow-amber-500/20'
                : 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shadow-blue-500/20'
            }`}>
              {activeToast.type === 'success' && <CheckCircle2 className="w-8 h-8" />}
              {activeToast.type === 'error' && <AlertCircle className="w-8 h-8" />}
              {activeToast.type === 'warning' && <AlertTriangle className="w-8 h-8" />}
              {activeToast.type === 'info' && <Info className="w-8 h-8" />}
            </div>

            {/* Title */}
            <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
              {activeToast.title || (activeToast.type === 'success' ? 'Successful!' : 'Notice')}
            </h3>

            {/* Message Box */}
            <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700/60 w-full">
              <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
                {activeToast.message}
              </p>
            </div>

            {/* 🔘 "DONE" BUTTON */}
            <button
              type="button"
              onClick={dismissAll}
              className={`w-full mt-5 py-3 px-4 text-white font-extrabold rounded-2xl transition shadow-lg active:scale-95 text-sm flex items-center justify-center space-x-2 cursor-pointer ${
                activeToast.type === 'success'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
                  : activeToast.type === 'error'
                  ? 'bg-red-600 hover:bg-red-700 shadow-red-600/25'
                  : activeToast.type === 'warning'
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/25'
                  : 'bg-[#DC2626] hover:bg-blue-700 shadow-blue-600/25'
              }`}
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Done</span>
            </button>

          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export default ToastContext;
