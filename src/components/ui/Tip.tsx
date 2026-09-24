import React from 'react';
import { Lightbulb } from 'lucide-react';
import { cn } from '@/lib/cn';

export function Tip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        'flex items-start gap-2 rounded-xl border border-role-accent/30 bg-role-soft p-3 text-xs text-slate-600',
        className,
      )}
    >
      <Lightbulb className="mt-0.5 h-4 w-4 flex-shrink-0 text-role-accent" />
      <span>{children}</span>
    </p>
  );
}
