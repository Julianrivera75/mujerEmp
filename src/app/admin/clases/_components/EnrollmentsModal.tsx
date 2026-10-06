'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, UserPlus } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { formatDayMonthShort } from '@/lib/format';
import { logClientError } from '@/lib/client-log';

interface Report {
  totalClasses: number;
  totalStudents: number;
  missingStudents: number;
  missingEnrollments: number;
  classes: { id: string; title: string; dateStart: string; missing: number }[];
  students: { id: string; name: string; email: string; missing: number }[];
}

interface EnrollmentsModalProps {
  open: boolean;
  onClose: () => void;
  /** Se llama después de inscribir, para que la lista de clases se actualice. */
  onUpdated: () => void;
}

/**
 * Revisa qué estudiantes activas no están inscritas en alguna clase vigente y permite completarlo. Revisar solo lee;
 * completar solo agrega inscripciones (no borra ni cambia las existentes).
 */
export function EnrollmentsModal({ open, onClose, onUpdated }: EnrollmentsModalProps) {
  const { show } = useToast();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/enrollments');
      const data = await res.json();
      if (res.ok) setReport(data);
      else show('error', data.error || 'No se pudo revisar las inscripciones.');
    } catch (err) {
      logClientError('Error revisando inscripciones:', err);
      show('error', 'Error de conexión al revisar las inscripciones.');
    } finally {
      setLoading(false);
    }
  }, [show]);

  useEffect(() => {
    if (open) void load();
    else setReport(null);
  }, [open, load]);

  const handleSync = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/enrollments', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        show('success', `Listo: se agregaron ${data.added} inscripciones.`);
        setConfirming(false);
        await load();
        onUpdated();
      } else {
        show('error', data.error || 'No se pudo inscribir a las estudiantes.');
      }
    } catch (err) {
      logClientError('Error inscribiendo a las estudiantes:', err);
      show('error', 'Error de conexión al inscribir a las estudiantes.');
    } finally {
      setSaving(false);
    }
  };

  const complete = report !== null && report.missingEnrollments === 0;

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Revisar inscripciones"
        description="Cada estudiante activa debe estar inscrita en las clases vigentes para verlas."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              Cerrar
            </Button>
            {report && !complete && (
              <Button leftIcon={<UserPlus className="h-4 w-4" />} onClick={() => setConfirming(true)}>
                Inscribir a las que faltan
              </Button>
            )}
          </>
        }
      >
        {loading && !report ? (
          <p className="py-6 text-center text-sm text-slate-500">Revisando inscripciones...</p>
        ) : !report ? null : complete ? (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
            <span>
              Las {report.totalStudents} estudiantes activas ya están inscritas en las {report.totalClasses} clases
              vigentes.
            </span>
          </div>
        ) : (
          <div className="space-y-5">
            <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900">
              <strong>{report.missingStudents}</strong> de {report.totalStudents} estudiantes activas no están inscritas
              en alguna de las {report.totalClasses} clases vigentes: faltan{' '}
              <strong>{report.missingEnrollments}</strong> inscripciones. Esas estudiantes no ven esas clases.
            </p>

            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Clases con faltantes</h3>
              <ul className="space-y-1.5">
                {report.classes.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-xs"
                  >
                    <span className="min-w-0 truncate font-semibold text-slate-700">
                      {formatDayMonthShort(c.dateStart)} · {c.title}
                    </span>
                    <span className="flex-shrink-0 font-bold text-amber-700">faltan {c.missing}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                Estudiantes afectadas (primeras {report.students.length})
              </h3>
              <ul className="space-y-1.5">
                {report.students.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-xs"
                  >
                    <span className="min-w-0 truncate">
                      <strong className="text-slate-800">{s.name}</strong>{' '}
                      <span className="text-slate-500">{s.email}</span>
                    </span>
                    <span className="flex-shrink-0 font-bold text-amber-700">
                      en {report.totalClasses - s.missing} de {report.totalClasses}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirming}
        onCancel={() => setConfirming(false)}
        onConfirm={handleSync}
        title="¿Inscribir a las estudiantes que faltan?"
        description={
          report
            ? `Se agregarán ${report.missingEnrollments} inscripciones. No se borra ni se cambia ninguna existente. Si sacaste a propósito a alguien de una clase, volverá a quedar inscrita.`
            : undefined
        }
        confirmLabel="Inscribir"
        danger={false}
        loading={saving}
      />
    </>
  );
}
