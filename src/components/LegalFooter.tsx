import React from 'react';
import Link from 'next/link';

export default function LegalFooter() {
  return (
    <footer className="mt-8 border-t border-white/60 bg-white/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <p>© {new Date().getFullYear()} Empoderas Diversas. Todos los derechos reservados.</p>
        <nav aria-label="Información legal" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 font-medium">
          <Link href="/terminos" className="hover:text-role-accent hover:underline">
            Términos y condiciones
          </Link>
          <Link href="/privacidad" className="hover:text-role-accent hover:underline">
            Tratamiento de datos personales
          </Link>
          <Link href="/cookies" className="hover:text-role-accent hover:underline">
            Cookies
          </Link>
        </nav>
      </div>
    </footer>
  );
}
