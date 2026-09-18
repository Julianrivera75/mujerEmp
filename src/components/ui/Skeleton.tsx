import React from 'react';
import { cn } from '@/lib/cn';

function shimmerBase(className?: string) {
  return cn('relative overflow-hidden bg-slate-100 rounded-xl', className);
}

function Shimmer() {
  return (
    <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" />
  );
}

export function SkeletonLine({ className }: { className?: string }) {
  return (
    <div className={shimmerBase(cn('h-3.5', className))}>
      <Shimmer />
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('glass-card rounded-2xl p-6 border border-white space-y-3', className)}>
      <div className={shimmerBase('h-4 w-1/3')}>
        <Shimmer />
      </div>
      <div className={shimmerBase('h-8 w-1/2')}>
        <Shimmer />
      </div>
      <div className={shimmerBase('h-3 w-2/3')}>
        <Shimmer />
      </div>
    </div>
  );
}

export function SkeletonRow({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-4 p-4', className)}>
      <div className={shimmerBase('w-10 h-10 rounded-xl flex-shrink-0')}>
        <Shimmer />
      </div>
      <div className="flex-1 space-y-2">
        <div className={shimmerBase('h-3.5 w-1/3')}>
          <Shimmer />
        </div>
        <div className={shimmerBase('h-3 w-1/2')}>
          <Shimmer />
        </div>
      </div>
    </div>
  );
}
