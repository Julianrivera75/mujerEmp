import React from 'react';
import { cn } from '@/lib/cn';

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center text-center py-14 px-6', className)}>
      <div className="w-14 h-14 rounded-2xl bg-role-soft text-role-accent flex items-center justify-center mb-4">
        <Icon className="w-7 h-7" strokeWidth={1.75} />
      </div>
      <p className="font-semibold text-slate-700">{title}</p>
      {description && <p className="text-sm text-slate-500 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
