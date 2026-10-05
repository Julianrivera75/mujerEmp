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
    <div className={cn('space-y-2 rounded-2xl border border-slate-100 p-4 md:hidden', className)}>
      {columns.map((c, i) => (
        <div key={i} className="flex items-center justify-between gap-3 text-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{c.label}</span>
          <span
            className={cn(
              'flex-shrink-0 whitespace-nowrap',
              c.emphasize ? 'font-bold text-slate-800' : 'text-slate-600',
            )}
          >
            {c.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export interface ResponsiveColumn<T> {
  header: string;
  cell: (row: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
  /** Columna que encabeza la tarjeta en el celular (una por tabla, normalmente la primera). */
  primary?: boolean;
}

const ALIGN: Record<'left' | 'center' | 'right', string> = {
  left: '',
  center: 'text-center',
  right: 'text-right',
};

/**
 * Tabla en pantallas medianas y grandes; en el celular (< md) cada fila pasa a ser una tarjeta
 * con el dato principal arriba y el resto como pares etiqueta: valor, sin desplazamiento lateral.
 */
export function ResponsiveTable<T>({
  caption,
  rows,
  rowKey,
  columns,
  className,
}: {
  caption: string;
  rows: T[];
  rowKey: (row: T) => string;
  columns: ResponsiveColumn<T>[];
  className?: string;
}) {
  const primary = columns.find((c) => c.primary) ?? columns[0];
  const rest = columns.filter((c) => c !== primary);

  return (
    <>
      <div className="hidden md:block">
        <Table caption={caption} className={className}>
          <THead>
            <TRow>
              {columns.map((c) => (
                <TCell key={c.header} head className={ALIGN[c.align ?? 'left']}>
                  {c.header}
                </TCell>
              ))}
            </TRow>
          </THead>
          <tbody>
            {rows.map((row) => (
              <TRow key={rowKey(row)}>
                {columns.map((c) => (
                  <TCell key={c.header} className={cn(ALIGN[c.align ?? 'left'], c.className)}>
                    {c.cell(row)}
                  </TCell>
                ))}
              </TRow>
            ))}
          </tbody>
        </Table>
      </div>

      <ul aria-label={caption} className="space-y-3 md:hidden">
        {rows.map((row) => (
          <li key={rowKey(row)} className="rounded-2xl border border-slate-100 bg-white/60 p-4">
            <div className="mb-3 min-w-0 break-words font-bold text-slate-800">{primary.cell(row)}</div>
            <dl className="space-y-2">
              {rest.map((c) => (
                <div key={c.header} className="flex items-start justify-between gap-4 text-sm">
                  <dt className="flex-shrink-0 pt-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {c.header}
                  </dt>
                  <dd className="min-w-0 break-words text-right text-slate-700">{c.cell(row)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
