import React from 'react';

export default function LoadingSkeleton({ count = 4 }) {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-16 bg-slate-200 dark:bg-slate-700/60 rounded-2xl w-full" />
      ))}
    </div>
  );
}
