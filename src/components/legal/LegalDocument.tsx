import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { CURRENT_TERMS_VERSION, LEGAL_REVIEW_COMPLETED } from '@/lib/legal';

interface LegalDocumentProps {
  title: string;
  intro?: string;
  children: React.ReactNode;
}

/** Contenedor común de las páginas legales públicas (no requieren sesión). */
export function LegalDocument({ title, intro, children }: LegalDocumentProps) {
  return (
    <div data-role="brand" className="min-h-dvh">
      <header className="border-b border-white/60 bg-white/70 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/login" aria-label="Ir al inicio de sesión">
            <Logo variant="compact" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-1 text-xs font-bold text-role-ink hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Volver</span>
          </Link>
        </div>
      </header>

      <main id="contenido" className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <article className="glass-card rounded-3xl border border-white p-6 shadow-soft sm:p-10">
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-800">{title}</h1>
          <p className="mt-1 text-xs font-semibold text-slate-500">Versión {CURRENT_TERMS_VERSION}</p>
          {!LEGAL_REVIEW_COMPLETED && (
            <p
              role="note"
              className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"
            >
              Borrador en revisión. Este texto aún no es la versión definitiva y puede cambiar antes de que se solicite
              tu aceptación.
            </p>
          )}
          {intro && <p className="mt-4 text-sm leading-6 text-slate-700">{intro}</p>}
          <div className="mt-6 space-y-6 text-sm leading-6 text-slate-700">{children}</div>
        </article>

        <nav
          aria-label="Otros documentos"
          className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-xs font-medium text-slate-500"
        >
          <Link href="/terminos" className="hover:text-role-ink hover:underline">
            Términos y condiciones
          </Link>
          <Link href="/privacidad" className="hover:text-role-ink hover:underline">
            Tratamiento de datos personales
          </Link>
          <Link href="/cookies" className="hover:text-role-ink hover:underline">
            Cookies
          </Link>
        </nav>
      </main>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 font-display text-lg font-semibold text-slate-800">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

export function LegalList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
