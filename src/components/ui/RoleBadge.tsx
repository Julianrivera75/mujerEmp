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
        'inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full text-white shadow-sm bg-gradient-to-r from-role-from to-role-to',
        className,
      )}
    >
      <Icon className="w-3 h-3" strokeWidth={2} />
      <span>{meta.label}</span>
    </span>
  );
}
