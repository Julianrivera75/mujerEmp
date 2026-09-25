import React from 'react';
import Link from 'next/link';

export default function LegalFooter() {
  return (
    <footer className="mt-8 border-t border-white/60 bg-white/50 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:px-6 lg:px-8">
        <p>© {new Date().getFullYear()} Empoderadas Diversas. Todos los derechos reservados.</p>
        <nav
          aria-label="Información legal"
          className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 font-medium"
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
      </div>
    </footer>
  );
}
