import React from 'react';
import { ROLE_META, type Role } from '@/lib/roles';
import { cn } from '@/lib/cn';

export function RoleBadge({ role, className }: { role: Role; className?: string }) {
  const meta = ROLE_META[role];
  const Icon = meta.icon;
  return (
    <span
      data-role={meta.variant}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-role-from to-role-to px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm',
        className,
      )}
    >
      <Icon className="h-3 w-3" strokeWidth={2} />
      <span>{meta.label}</span>
    </span>
  );
}
