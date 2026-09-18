'use client';

import React, { useId } from 'react';
import { m } from 'framer-motion';
import { cn } from '@/lib/cn';

interface TabItem {
  value: string;
  label: string;
}

interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function Tabs({ items, value, onChange, className }: TabsProps) {
  const layoutId = useId();
  const activeIndex = items.findIndex((i) => i.value === value);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    const next = (activeIndex + dir + items.length) % items.length;
    onChange(items[next].value);
  };

  return (
    <div
      role="tablist"
      onKeyDown={onKeyDown}
      className={cn('inline-flex items-center gap-1 p-1 rounded-xl glass-card--flat border border-slate-200/70', className)}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(item.value)}
            className={cn(
              'relative px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70',
              active ? 'text-white' : 'text-slate-600 hover:text-role-accent',
            )}
          >
            {active && (
              <m.span
                layoutId={`tabs-pill-${layoutId}`}
                className="absolute inset-0 rounded-lg bg-gradient-to-r from-role-from to-role-to -z-10"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <span className="relative">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
