'use client';

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, m } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { DURATION, EASE } from '@/lib/motion';

type Size = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_CLS: Record<Size, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: Size;
  dismissible?: boolean;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export function Modal({ open, onClose, title, description, size = 'md', dismissible = true, footer, children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);
  const titleId = useRef(`modal-title-${Math.random().toString(36).slice(2)}`).current;
  const descId = useRef(`modal-desc-${Math.random().toString(36).slice(2)}`).current;
  const [mounted, setMounted] = React.useState(false);

  useEffect(() => setMounted(true), []);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement;

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = document.body.style.overflow;
    const prevPadding = document.body.style.paddingRight;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;

    const focusables = () => panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [];
    const first = focusables()[0];
    (first ?? panelRef.current)?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissible) {
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const nodes = Array.from(focusables());
      if (nodes.length === 0) return;
      const firstEl = nodes[0];
      const lastEl = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPadding;
      (triggerRef.current as HTMLElement | null)?.focus?.();
    };
  }, [open, dismissible]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-modal flex items-end sm:items-center justify-center p-0 sm:p-4">
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={dismissible ? onClose : undefined}
          />
          <m.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: DURATION.base, ease: EASE }}
            className={cn(
              'relative w-full glass-panel rounded-t-3xl sm:rounded-3xl shadow-lift flex flex-col max-h-[calc(100dvh-2rem)]',
              SIZE_CLS[size],
            )}
          >
            <div className="flex items-start justify-between gap-4 p-5 sm:p-6 border-b border-slate-100/80">
              <div>
                <h2 id={titleId} className="font-display text-lg font-bold text-slate-800">
                  {title}
                </h2>
                {description && (
                  <p id={descId} className="text-sm text-slate-500 mt-0.5">
                    {description}
                  </p>
                )}
              </div>
              {dismissible && (
                <button
                  onClick={onClose}
                  aria-label="Cerrar"
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors flex-shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto">{children}</div>

            {footer && <div className="p-5 sm:p-6 pt-0 flex items-center justify-end gap-2.5">{footer}</div>}
          </m.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
