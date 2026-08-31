import React from 'react';

const GRADIENT_PALETTES = [
  { bg: 'from-blue-600 to-indigo-700', shadow: 'shadow-blue-500/20' },
  { bg: 'from-emerald-500 to-teal-700', shadow: 'shadow-emerald-500/20' },
  { bg: 'from-amber-500 to-orange-600', shadow: 'shadow-orange-500/20' },
  { bg: 'from-purple-600 to-pink-600', shadow: 'shadow-purple-500/20' },
  { bg: 'from-rose-500 to-red-600', shadow: 'shadow-red-500/20' },
  { bg: 'from-cyan-500 to-blue-600', shadow: 'shadow-cyan-500/20' },
  { bg: 'from-violet-600 to-indigo-600', shadow: 'shadow-violet-500/20' },
  { bg: 'from-teal-500 to-emerald-700', shadow: 'shadow-teal-500/20' },
  { bg: 'from-indigo-500 to-blue-700', shadow: 'shadow-indigo-500/20' }
];

export const getCustomerInitials = (name = '') => {
  if (!name) return 'CU';
  const clean = name.trim();
  const words = clean.split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  if (words.length === 1) {
    return clean.slice(0, 2).toUpperCase();
  }
  return 'CU';
};

export const getPaletteForName = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % GRADIENT_PALETTES.length;
  return GRADIENT_PALETTES[index];
};

export default function CustomerAvatar({ 
  name = '', 
  size = 'md',
  className = ''
}) {
  const initials = getCustomerInitials(name);
  const palette = getPaletteForName(name);

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px] rounded-lg shadow-sm',
    sm: 'w-8 h-8 text-xs rounded-xl shadow-sm',
    md: 'w-11 h-11 text-sm rounded-2xl shadow-md',
    lg: 'w-14 h-14 text-base rounded-2xl shadow-lg',
    xl: 'w-16 h-16 text-lg rounded-3xl shadow-xl'
  };

  const selectedSize = sizeClasses[size] || sizeClasses.md;

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 font-black text-white bg-gradient-to-br ${palette.bg} ${palette.shadow} ring-2 ring-white/40 dark:ring-slate-700/50 select-none ${selectedSize} ${className}`}
      title={name}
    >
      {/* Subtle Top-Light Reflection */}
      <div className="absolute inset-0 rounded-[inherit] bg-gradient-to-t from-black/10 via-transparent to-white/25 pointer-events-none" />
      <span className="relative z-10 tracking-tight leading-none">
        {initials}
      </span>
    </div>
  );
}
