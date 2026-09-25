import React from 'react';
import { cn } from '@/lib/cn';

export function Table({
  className,
  caption,
  children,
  ...rest
}: React.TableHTMLAttributes<HTMLTableElement> & { caption: string }) {
  return (
    <div
      className="overflow-x-auto rounded-2xl border border-slate-100"
      role="region"
      aria-label={caption}
      // La región con desplazamiento debe poder enfocarse para recorrerla con el teclado.
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
    >
      <table className={cn('w-full text-sm', className)} {...rest}>
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

export function THead({ className, ...rest }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('sticky top-0 bg-slate-50/90 text-left backdrop-blur-sm', className)} {...rest} />;
}

export function TRow({ className, ...rest }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn('border-b border-slate-100 transition-colors last:border-0 hover:bg-role-soft/50', className)}
      {...rest}
    />
  );
}

export function TCell({ className, head, ...rest }: React.TdHTMLAttributes<HTMLTableCellElement> & { head?: boolean }) {
  const classes = cn(
    'px-4 py-3 align-middle',
    head ? 'text-xs font-bold uppercase tracking-wider text-slate-500' : 'text-slate-700',
    className,
  );
  if (head) {
    return <th scope="col" className={classes} {...rest} />;
  }
  return <td className={classes} {...rest} />;
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
    <div className={cn('space-y-2 rounded-2xl border border-slate-100 p-4 sm:hidden', className)}>
      {columns.map((c, i) => (
        <div key={i} className="flex items-center justify-between gap-3 text-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{c.label}</span>
          <span className={cn(c.emphasize ? 'font-bold text-slate-800' : 'text-slate-600')}>{c.value}</span>
        </div>
      ))}
    </div>
  );
}
