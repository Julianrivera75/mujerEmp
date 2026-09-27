'use client';

import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Select } from '@/components/ui/Field';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useToast } from '@/components/ui/Toast';
import { downloadTextFile, toCsv } from '@/lib/csv';
import { logClientError } from '@/lib/client-log';
import type { UserItem } from '../types';

const BATCH_SIZE = 15;
const CSV_HEADERS = ['Nombre', 'Correo', 'Rol', 'Número de estudiante', 'Contraseña', 'Acceso'] as const;
const ROLE_LABEL: Record<string, string> = {
  STUDENT: 'Estudiante',
  MENTOR: 'Mentor / Mentora',
  ADMIN: 'Administrador',
};

type Scope = 'STUDENT' | 'MENTOR' | 'ALL';

interface Credential {
  id: string;
  name: string;
  email: string;
  role: string;
  memberNumber: string | null;
  password: string;
}

interface CredentialsExportProps {
  users: UserItem[];
}

/** Restablece las contraseñas iniciales por lotes y descarga un CSV con las credenciales de cada persona. */
export function CredentialsExport({ users }: CredentialsExportProps) {
  const { show } = useToast();
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<Scope>('ALL');
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);

  const targets = users.filter(
    (u) =>
      u.status === 'ACTIVO' &&
      !u.anonymizedAt &&
      u.role !== 'ADMIN' &&
      (scope === 'ALL' || u.role === scope || u.extraRoles?.includes(scope)),
  );

  const run = async () => {
    setRunning(true);
    setDone(0);
    const collected: Credential[] = [];
    try {
      for (let i = 0; i < targets.length; i += BATCH_SIZE) {
        const ids = targets.slice(i, i + BATCH_SIZE).map((u) => u.id);
        const res = await fetch('/api/admin/users/credentials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'No se pudo preparar el lote.');
        collected.push(...data.credentials);
        setDone(Math.min(i + BATCH_SIZE, targets.length));
      }

      const origin = window.location.origin;
      const rows = collected.map((c) => [
        c.name,
        c.email,
        ROLE_LABEL[c.role] ?? c.role,
        c.memberNumber,
        c.password,
        origin,
      ]);
      downloadTextFile(`usuarios-y-contrasenas-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(CSV_HEADERS, rows));
      show('success', `Se descargaron las credenciales de ${collected.length} personas.`);
      setOpen(false);
    } catch (err) {
      logClientError('Error preparando credenciales:', err);
      // Lo ya restablecido no se pierde: se descarga lo recopilado hasta el error.
      if (collected.length > 0) {
        downloadTextFile(
          `usuarios-y-contrasenas-parcial-${new Date().toISOString().slice(0, 10)}.csv`,
          toCsv(
            CSV_HEADERS,
            collected.map((c) => [
              c.name,
              c.email,
              ROLE_LABEL[c.role] ?? c.role,
              c.memberNumber,
              c.password,
              window.location.origin,
            ]),
          ),
        );
      }
      show(
        'error',
        collected.length > 0
          ? `Se interrumpió tras ${collected.length} personas; se descargó lo procesado. Vuelve a intentarlo para el resto.`
          : 'No se pudieron preparar las credenciales.',
      );
    } finally {
      setRunning(false);
    }
  };

  return (
    <>
      <Button variant="secondary" leftIcon={<KeyRound className="h-4 w-4" />} onClick={() => setOpen(true)}>
        Descargar usuarios con contraseña
      </Button>

      <ConfirmDialog
        open={open}
        onCancel={() => !running && setOpen(false)}
        onConfirm={run}
        title="¿Restablecer contraseñas y descargar?"
        description="Las contraseñas se guardan cifradas y no se pueden leer, por eso este proceso fija de nuevo la contraseña inicial de cada persona (el número de estudiante sin guiones; un número aleatorio si no tiene) y la incluye en el archivo. Reemplaza las contraseñas actuales y cierra las sesiones abiertas. Entrega el archivo solo por un canal privado."
        confirmLabel={running ? 'Preparando...' : 'Restablecer y descargar'}
        loading={running}
      >
        <div className="space-y-3">
          <Select
            label="Personas incluidas"
            value={scope}
            disabled={running}
            onChange={(e) => setScope(e.target.value as Scope)}
          >
            <option value="ALL">Estudiantes y mentores</option>
            <option value="STUDENT">Solo estudiantes</option>
            <option value="MENTOR">Solo mentores</option>
          </Select>
          <p className="text-xs text-slate-600">
            Se restablecerán <strong>{targets.length}</strong> cuentas activas. Las administradoras no se incluyen.
          </p>
          {running && (
            <div className="space-y-1.5" role="status" aria-live="polite">
              <div className="flex justify-between text-xs font-semibold text-slate-600">
                <span>Preparando credenciales</span>
                <span className="text-role-ink">
                  {done} de {targets.length}
                </span>
              </div>
              <ProgressBar value={done} max={Math.max(targets.length, 1)} label="Avance de las credenciales" />
            </div>
          )}
        </div>
      </ConfirmDialog>
    </>
  );
}
