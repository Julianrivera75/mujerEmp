'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Award, Download, Eye, Lock, Printer } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { canvasToBlob, renderCertificate } from '@/lib/certificate-canvas';
import { logClientError } from '@/lib/client-log';
import { formatDateLong } from '@/lib/format';
import { CERTIFICATE_MODULES, type ModuleStatus } from '@/lib/modules';
import { CERTIFICATE_MIN_ATTENDANCE_PERCENT } from '@/lib/legal';

interface ModuleState {
  number: number;
  title: string;
  issuedOn: string;
  art: string;
  status: ModuleStatus;
  percentage: number;
  attended: number;
  total: number;
  opensAt: string;
}

interface CertificatesResponse {
  student: { name: string; studentNumber: string | null };
  modules: ModuleState[];
}

interface Preview {
  moduleNumber: number;
  url: string;
}

export default function StudentCertificatesPage() {
  const [data, setData] = useState<CertificatesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [working, setWorking] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/certificates');
        const body = await res.json();
        if (!res.ok) {
          setError(body.error || 'No se pudieron cargar tus certificados.');
          return;
        }
        setData(body);
      } catch (err) {
        logClientError('Error cargando certificados:', err);
        setError('Error de conexión al cargar tus certificados.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Libera la imagen generada al cambiar de certificado o salir de la página.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview.url);
    };
  }, [preview]);

  const openPreview = async (module: ModuleState) => {
    if (!data?.student.studentNumber) return;
    const layout = CERTIFICATE_MODULES.find((m) => m.number === module.number);
    if (!layout) return;
    setWorking(module.number);
    try {
      const canvas = await renderCertificate(layout, data.student.name, data.student.studentNumber);
      const blob = await canvasToBlob(canvas);
      setPreview({ moduleNumber: module.number, url: URL.createObjectURL(blob) });
    } catch (err) {
      logClientError('Error generando el certificado:', err);
      setError('No pudimos generar el certificado. Inténtalo de nuevo.');
    } finally {
      setWorking(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="no-print mb-8">
        <Link
          href="/estudiante"
          className="mb-2 inline-flex items-center gap-1 text-xs font-bold text-role-ink hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Volver a mis clases</span>
        </Link>
        <h1 className="font-display text-2xl font-bold text-slate-800 sm:text-3xl">Certificados por módulo</h1>
        <p className="mt-0.5 text-xs text-slate-500">
          Cada módulo se certifica al terminar el mes. Necesitas asistir al menos al{' '}
          {CERTIFICATE_MIN_ATTENDANCE_PERCENT}% de las clases del módulo.
        </p>
      </div>

      {loading ? (
        <div className="no-print py-24 text-center text-sm text-slate-500">Cargando tus certificados...</div>
      ) : error ? (
        <div role="alert" className="no-print rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : data ? (
        <>
          {!data.student.studentNumber && (
            <div className="no-print mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
              Tu número de estudiante aún no está registrado. Comunícate con la administración para poder descargar tus
              certificados.
            </div>
          )}

          <ul className="no-print grid grid-cols-1 gap-4 md:grid-cols-2">
            {data.modules.map((module) => (
              <li key={module.number}>
                <ModuleCard
                  module={module}
                  canDownload={Boolean(data.student.studentNumber)}
                  busy={working === module.number}
                  onView={() => openPreview(module)}
                />
              </li>
            ))}
          </ul>

          {preview && (
            <section aria-label={`Certificado del módulo ${preview.moduleNumber}`} className="mt-8">
              <div className="no-print mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-lg font-bold text-slate-800">
                  Certificado del módulo {preview.moduleNumber}
                </h2>
                <div className="flex gap-2">
                  <Button
                    href={preview.url}
                    download={`certificado-modulo-${preview.moduleNumber}.png`}
                    leftIcon={<Download className="h-4 w-4" />}
                  >
                    Descargar
                  </Button>
                  <Button variant="secondary" leftIcon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>
                    Imprimir
                  </Button>
                </div>
              </div>
              <img
                src={preview.url}
                alt={`Certificado del módulo ${preview.moduleNumber} de ${data.student.name}`}
                className="w-full rounded-2xl border border-slate-200 shadow-lift print:rounded-none print:border-0 print:shadow-none"
              />
            </section>
          )}
        </>
      ) : null}
    </div>
  );
}

function ModuleCard({
  module,
  canDownload,
  busy,
  onView,
}: {
  module: ModuleState;
  canDownload: boolean;
  busy: boolean;
  onView: () => void;
}) {
  const available = module.status === 'available';

  return (
    <Card variant="glass" className="flex h-full flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Módulo {module.number}</p>
          <h2 className="font-display text-base font-bold text-slate-800">{module.title}</h2>
        </div>
        <StatusBadge status={module.status} />
      </div>

      <div className="text-xs text-slate-600">
        <div className="mb-1.5 flex justify-between font-semibold">
          <span>Asistencia</span>
          <span className="text-role-ink">
            {module.percentage}% ({module.attended} de {module.total} clases)
          </span>
        </div>
        <ProgressBar value={module.percentage} label={`Asistencia del módulo ${module.number}`} />
      </div>

      <p className="text-xs text-slate-500">
        {module.status === 'locked'
          ? `Disponible desde el ${formatDateLong(module.opensAt)}.`
          : module.status === 'no-classes'
            ? 'Este módulo aún no tiene clases registradas para ti.'
            : module.status === 'low-attendance'
              ? `Necesitas al menos ${CERTIFICATE_MIN_ATTENDANCE_PERCENT}% de asistencia para descargarlo.`
              : `Fecha de emisión del certificado: ${module.issuedOn}.`}
      </p>

      <div className="mt-auto pt-1">
        {available ? (
          <Button
            size="sm"
            loading={busy}
            disabled={!canDownload}
            leftIcon={<Eye className="h-4 w-4" />}
            onClick={onView}
          >
            Ver y descargar
          </Button>
        ) : (
          <Button size="sm" variant="secondary" disabled leftIcon={<Lock className="h-4 w-4" />}>
            No disponible
          </Button>
        )}
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: ModuleStatus }) {
  if (status === 'available') {
    return (
      <Badge tone="success">
        <Award className="mr-1 h-3 w-3" />
        Disponible
      </Badge>
    );
  }
  if (status === 'locked') return <Badge tone="neutral">Bloqueado</Badge>;
  if (status === 'low-attendance') return <Badge tone="warning">Falta asistencia</Badge>;
  return <Badge tone="neutral">Sin clases</Badge>;
}
