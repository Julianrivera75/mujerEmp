'use client';

import React from 'react';
import { FileText } from 'lucide-react';
import FileLink from '@/components/FileLink';

export interface ClassResourceItem {
  id: string;
  title: string;
  type: string;
  url: string;
}

/** Materiales que la mentora dejó en la clase (enlaces, documentos): se ven aquí mismo, sin ir a otra página. */
export function ClassResourceList({ resources }: { resources: ClassResourceItem[] }) {
  if (resources.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Materiales de la mentora</p>
      {resources.map((res) => (
        <FileLink
          key={res.id}
          fileUrl={res.url}
          isStoredFile={res.type === 'DOCUMENT'}
          className="flex items-center gap-1.5 rounded-lg bg-role-soft px-2.5 py-1.5 text-xs font-bold text-role-ink transition-colors hover:brightness-95"
        >
          <FileText className="h-3.5 w-3.5 shrink-0" />
          <span>{res.title}</span>
        </FileLink>
      ))}
    </div>
  );
}
