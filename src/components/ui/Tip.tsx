import React from 'react';
import { Lightbulb } from 'lucide-react';
import { cn } from '@/lib/cn';

export function Tip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn('flex items-start gap-2 text-xs text-slate-600 bg-role-soft p-3 rounded-xl border border-role-accent/30', className)}>
      <Lightbulb className="w-4 h-4 text-role-accent flex-shrink-0 mt-0.5" />
      <span>{children}</span>
    </p>
  );
}
