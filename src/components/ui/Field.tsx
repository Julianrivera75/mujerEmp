'use client';

import React, { useId } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

const CONTROL_BASE =
  'w-full h-11 rounded-xl bg-white/70 border border-slate-200 px-3.5 text-sm text-slate-800 placeholder:text-slate-400 transition-all outline-none focus:border-role-from focus:ring-2 focus:ring-primary/20 disabled:opacity-60';

type InputOwnProps = {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightSlot?: React.ReactNode;
};

export const Input = React.forwardRef<HTMLInputElement, InputOwnProps & React.InputHTMLAttributes<HTMLInputElement>>(
  ({ label, hint, error, id, className, required, leftIcon, rightSlot, ...rest }, ref) => {
    const autoId = useId();
    const fieldId = id || autoId;
    const hintId = hint ? `${fieldId}-hint` : undefined;
    const errorId = error ? `${fieldId}-error` : undefined;
    const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={fieldId} className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            {label}
            {required && <span className="ml-0.5 text-role-ink">*</span>}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={fieldId}
            required={required}
            aria-describedby={describedBy}
            aria-invalid={Boolean(error) || undefined}
            className={cn(
              CONTROL_BASE,
              leftIcon && 'pl-10',
              rightSlot && 'pr-10',
              error && 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20',
              className,
            )}
            {...rest}
          />
          {rightSlot && <span className="absolute right-3 top-1/2 -translate-y-1/2">{rightSlot}</span>}
        </div>
        {hint && !error && (
          <p id={hintId} className="text-xs text-slate-500">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="flex items-center gap-1 text-xs text-rose-600">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{error}</span>
          </p>
        )}
      </div>
    );
  },
);
Input.displayName = 'Input';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  InputOwnProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ label, hint, error, id, className, required, rows = 4, ...rest }, ref) => {
  const autoId = useId();
  const fieldId = id || autoId;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={fieldId} className="block text-xs font-bold uppercase tracking-wider text-slate-700">
          {label}
          {required && <span className="ml-0.5 text-role-ink">*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        required={required}
        aria-describedby={describedBy}
        aria-invalid={Boolean(error) || undefined}
        className={cn(
          CONTROL_BASE,
          'h-auto resize-y py-2.5',
          error && 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20',
          className,
        )}
        {...rest}
      />
      {hint && !error && (
        <p id={hintId} className="text-xs text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="flex items-center gap-1 text-xs text-rose-600">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
});
Textarea.displayName = 'Textarea';

export const Select = React.forwardRef<
  HTMLSelectElement,
  InputOwnProps & React.SelectHTMLAttributes<HTMLSelectElement>
>(({ label, hint, error, id, className, required, children, ...rest }, ref) => {
  const autoId = useId();
  const fieldId = id || autoId;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={fieldId} className="block text-xs font-bold uppercase tracking-wider text-slate-700">
          {label}
          {required && <span className="ml-0.5 text-role-ink">*</span>}
        </label>
      )}
      <select
        ref={ref}
        id={fieldId}
        required={required}
        aria-describedby={describedBy}
        aria-invalid={Boolean(error) || undefined}
        className={cn(CONTROL_BASE, 'appearance-none pr-8', error && 'border-rose-400', className)}
        {...rest}
      >
        {children}
      </select>
      {hint && !error && (
        <p id={hintId} className="text-xs text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="flex items-center gap-1 text-xs text-rose-600">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
});
Select.displayName = 'Select';
