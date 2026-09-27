'use client';

import React, { useState } from 'react';
import { Check, Copy, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface PasswordRevealProps {
  name: string;
  email: string;
  password: string;
}

/** Muestra una contraseña recién fijada, una sola vez, con botón para copiarla. */
export function PasswordReveal({ name, email, password }: PasswordRevealProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sin permiso del portapapeles: la persona puede seleccionar y copiar el texto a mano.
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4" role="status">
      <p className="flex items-center gap-2 text-sm font-bold text-emerald-900">
        <KeyRound className="h-4 w-4" />
        <span>Contraseña de {name}</span>
      </p>
      <p className="text-xs text-emerald-900">
        Correo: <strong>{email}</strong>
      </p>
      <div className="flex items-center gap-2">
        <code
          data-testid="revealed-password"
          className="flex-1 select-all rounded-xl border border-emerald-200 bg-white px-3 py-2 font-mono text-base font-bold tracking-wider text-slate-800"
        >
          {password}
        </code>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={copy}
          leftIcon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        >
          {copied ? 'Copiada' : 'Copiar'}
        </Button>
      </div>
      <p className="text-xs text-emerald-900">
        Solo se muestra ahora: no se puede volver a consultar. La persona deberá cambiarla en su primer ingreso.
      </p>
    </div>
  );
}
