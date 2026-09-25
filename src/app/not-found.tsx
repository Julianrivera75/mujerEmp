import Link from 'next/link';
import { Compass } from 'lucide-react';
import { Logo } from '@/components/Logo';

export default function NotFound() {
  return (
    <main
      id="contenido"
      className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center"
    >
      <Logo />
      <div className="mt-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-100 text-purple-700">
        <Compass className="h-7 w-7" strokeWidth={1.75} />
      </div>
      <h1 className="mt-5 font-display text-2xl font-bold text-slate-800">No encontramos esta página</h1>
      <p className="mt-2 text-sm text-slate-500">El enlace puede estar mal escrito o la página ya no existe.</p>
      <Link
        href="/"
        className="mt-6 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-bold text-white shadow-lift hover:bg-purple-700"
      >
        Volver al inicio
      </Link>
    </main>
  );
}
