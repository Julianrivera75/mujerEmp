import React from 'react';
import { cn } from '@/lib/cn';

export function Table({ className, ...rest }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-100">
      <table className={cn('w-full text-sm', className)} {...rest} />
    </div>
  );
}

export function THead({ className, ...rest }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('sticky top-0 bg-slate-50/90 backdrop-blur-sm text-left', className)} {...rest} />;
}

export function TRow({ className, ...rest }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('border-b border-slate-100 last:border-0 hover:bg-role-soft/50 transition-colors', className)} {...rest} />;
}

export function TCell({
  className,
  head,
  ...rest
}: React.TdHTMLAttributes<HTMLTableCellElement> & { head?: boolean }) {
  const Comp = head ? 'th' : 'td';
  return (
    <Comp
      className={cn(
        'px-4 py-3 align-middle',
        head ? 'text-xs font-bold uppercase tracking-wider text-slate-500' : 'text-slate-700',
        className,
      )}
      {...(rest as any)}
    />
  );
}

/**
 * Envoltorio responsivo: en `< md` cada fila se ve como tarjeta apilada
 * con pares etiqueta:valor en vez de columnas de tabla horizontales.
 */
export function ResponsiveRow({
  columns,
  className,
}: {
  columns: { label: string; value: React.ReactNode; emphasize?: boolean }[];
  className?: string;
}) {
  return (
    <div className={cn('sm:hidden rounded-2xl border border-slate-100 p-4 space-y-2', className)}>
      {columns.map((c, i) => (
        <div key={i} className="flex items-center justify-between gap-3 text-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{c.label}</span>
          <span className={cn(c.emphasize ? 'font-bold text-slate-800' : 'text-slate-600')}>{c.value}</span>
        </div>
      ))}
    </div>
  );
}
