'use client';

import React, { useState } from 'react';
import { Repeat } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ROLE_SHORT_LABEL, type Role } from '@/lib/roles';
import { switchRole } from '@/lib/switch-role';
import { useSessionUser } from '@/lib/user-context';

const DESCRIPTION: Record<Role, string> = {
  STUDENT:
    'Ahí están tus clases como estudiante, tu asistencia, tus tareas y tus certificados. Para registrar tu asistencia a una clase debes entrar desde esa vista.',
  MENTOR: 'Ahí gestionas las clases que dictas, sus materiales, tareas y calificaciones.',
  ADMIN: 'Ahí administras usuarios, clases y reportes.',
};

/**
 * Aviso para las cuentas con más de un rol (por ejemplo mentora y estudiante): cada vista muestra solo lo suyo y el
 * cambio de vista estaba escondido en el menú de usuario. Lleva a la otra vista con un clic.
 */
export function RoleSwitchBanner() {
  const user = useSessionUser();
  const [busy, setBusy] = useState<Role | null>(null);
  const others = user.roles.filter((role) => role !== user.role);
  if (others.length === 0) return null;

  return (
    <div className="space-y-3">
      {others.map((role) => (
        <div
          key={role}
          className="flex flex-col gap-3 rounded-2xl border border-role-accent/30 bg-role-soft p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800">
              Tu cuenta también tiene la vista de {ROLE_SHORT_LABEL[role]}
            </p>
            <p className="mt-0.5 text-xs text-slate-600">{DESCRIPTION[role]}</p>
          </div>
          <Button
            size="sm"
            loading={busy === role}
            onClick={() => {
              setBusy(role);
              void switchRole(role).finally(() => setBusy(null));
            }}
            leftIcon={<Repeat className="h-4 w-4" />}
            className="flex-shrink-0"
          >
            Ir a mi vista de {ROLE_SHORT_LABEL[role]}
          </Button>
        </div>
      ))}
    </div>
  );
}
