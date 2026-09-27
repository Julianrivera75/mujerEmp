'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, ShieldAlert } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { logClientError } from '@/lib/client-log';

interface ChangePasswordFormProps {
  userName: string;
  homeHref: string;
}

/** Pantalla obligatoria de primer ingreso: cambiar la contraseña inicial por una propia. */
export default function ChangePasswordForm({ userName, homeHref }: ChangePasswordFormProps) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('La nueva contraseña y su confirmación no coinciden.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo cambiar la contraseña.');
        return;
      }
      router.push(homeHref);
      router.refresh();
    } catch (err) {
      logClientError('Error cambiando la contraseña:', err);
      setError('Error de conexión con el servidor.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main
      id="contenido"
      data-role="brand"
      className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10"
    >
      <div className="mb-6 flex justify-center">
        <Logo />
      </div>

      <div className="glass-card rounded-3xl border border-white/80 p-7 shadow-lift sm:p-8">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-role-soft text-role-ink">
          <KeyRound className="h-6 w-6" strokeWidth={1.75} />
        </div>
        <h1 className="font-display text-xl font-bold text-slate-800">Crea tu propia contraseña</h1>
        <p className="mt-1 text-sm text-slate-600">
          Hola, {userName}. Por seguridad debes cambiar la contraseña que te entregaron antes de usar la plataforma.
          Solo se pide esta vez.
        </p>

        {error && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700"
          >
            <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <PasswordInput
            label="Contraseña que te entregaron"
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <PasswordInput
            label="Nueva contraseña"
            required
            autoComplete="new-password"
            hint="Mínimo 8 caracteres, distinta de la que te entregaron."
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <PasswordInput
            label="Repite la nueva contraseña"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <Button type="submit" loading={saving} className="w-full">
            Guardar y entrar
          </Button>
        </form>
      </div>
    </main>
  );
}
