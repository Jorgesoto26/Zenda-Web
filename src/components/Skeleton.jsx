import React from 'react';

export function SkeletonItem({ className = '', style = {} }) {
  return (
    <div
      style={style}
      className={`animate-pulse bg-slate-200/80 rounded-xl ${className}`}
    />
  );
}

export function SkeletonPaymentCard() {
  return (
    <div className="p-4 rounded-2xl bg-white/80 border border-slate-200/60 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <SkeletonItem className="h-5 w-36" />
        <SkeletonItem className="h-5 w-16 rounded-full" />
      </div>
      <SkeletonItem className="h-4 w-48" />
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <SkeletonItem className="h-4 w-24" />
        <SkeletonItem className="h-6 w-20" />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 4 }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonPaymentCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonCaja() {
  return (
    <div className="p-4 space-y-4">
      <SkeletonItem className="h-32 w-full rounded-2xl" />
      <SkeletonItem className="h-20 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-3">
        <SkeletonItem className="h-24 w-full rounded-2xl" />
        <SkeletonItem className="h-24 w-full rounded-2xl" />
      </div>
    </div>
  );
}

