'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldAlert, ShieldCheck, LogOut } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';

interface AcceptTermsFormProps {
  userName: string;
  version: string;
  blockedMinor: boolean;
  homeHref: string;
}

export default function AcceptTermsForm({ userName, version, blockedMinor, homeHref }: AcceptTermsFormProps) {
  const router = useRouter();
  const [terms, setTerms] = useState(false);
  const [data, setData] = useState(false);
  const [recording, setRecording] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = terms && data && recording && !sending;

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const handleAccept = async () => {
    setError('');
    setSending(true);
    try {
      const res = await fetch('/api/auth/accept-terms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || 'No se pudo registrar tu aceptación.');
        setSending(false);
        return;
      }
      router.push(homeHref);
      router.refresh();
    } catch (err) {
      setError('Error de conexión. Inténtalo de nuevo.');
      setSending(false);
    }
  };

  return (
    <div data-role="brand" className="min-h-dvh flex items-center justify-center p-4">
      <main id="contenido" className="w-full max-w-xl">
        <div className="flex justify-center mb-6">
          <Logo />
        </div>

        <div className="glass-card rounded-3xl p-7 sm:p-8 shadow-lift border border-white/80">
          {blockedMinor ? (
            <>
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h1 className="font-display text-xl font-bold text-slate-800">Falta la autorización de tu representante legal</h1>
              <p className="mt-2 text-sm text-slate-600 leading-6">
                Hola, {userName}. Como eres menor de edad, la administración debe registrar la autorización de tu madre, padre o representante legal antes de habilitar tu acceso. Comunícate con la administración de Empoderas Diversas para completar este paso.
              </p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-2xl bg-role-soft text-role-accent flex items-center justify-center mb-4">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h1 className="font-display text-xl font-bold text-slate-800">Antes de continuar</h1>
              <p className="mt-2 text-sm text-slate-600 leading-6">
                Hola, {userName}. Para usar la plataforma necesitamos tu autorización. Puedes leer los documentos completos en las siguientes páginas (se abren en una pestaña nueva).
              </p>

              <ul className="mt-3 text-sm space-y-1">
                <li>
                  <Link href="/terminos" target="_blank" className="text-role-accent font-semibold underline">
                    Términos y condiciones de uso
                  </Link>
                </li>
                <li>
                  <Link href="/privacidad" target="_blank" className="text-role-accent font-semibold underline">
                    Política de tratamiento de datos personales
                  </Link>
                </li>
              </ul>

              <div className="mt-5 space-y-3 text-sm text-slate-700">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-1 h-4 w-4 rounded" />
                  <span>He leído y acepto los términos y condiciones de uso.</span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={data} onChange={(e) => setData(e.target.checked)} className="mt-1 h-4 w-4 rounded" />
                  <span>
                    Autorizo el tratamiento de mis datos personales para las finalidades de la política de tratamiento de datos, y conozco mis derechos como titular.
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={recording} onChange={(e) => setRecording(e.target.checked)} className="mt-1 h-4 w-4 rounded" />
                  <span>Autorizo la grabación de las clases en las que participe y su publicación para las participantes del programa.</span>
                </label>
              </div>

              {error && (
                <div role="alert" className="mt-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs">
                  {error}
                </div>
              )}

              <Button className="w-full mt-6" onClick={handleAccept} disabled={!canSubmit} loading={sending}>
                Aceptar y continuar
              </Button>
            </>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="mt-4 mx-auto flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-red-600"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </main>
    </div>
  );
}
