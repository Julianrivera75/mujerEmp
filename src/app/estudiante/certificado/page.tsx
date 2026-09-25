'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Printer, ShieldCheck, Lock, ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useSessionUser } from '@/lib/user-context';
import { CERTIFICATE_MIN_ATTENDANCE_PERCENT } from '@/lib/legal';
import { formatDateLong } from '@/lib/format';
import { logClientError } from '@/lib/client-log';

export default function StudentCertificatePage() {
  const user = useSessionUser();
  const [totalClasses, setTotalClasses] = useState(0);
  const [totalAttended, setTotalAttended] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [classesRes, attRes] = await Promise.all([fetch('/api/classes'), fetch('/api/admin/attendances')]);
        const classesData = await classesRes.json();
        setTotalClasses((classesData.classes || []).length);

        const attData = await attRes.json();
        const allAtt: { student: { id: string } }[] = attData.attendances || [];
        setTotalAttended(allAtt.filter((a) => a.student.id === user.id).length);
      } catch (err) {
        logClientError('Error cargando certificado:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user.id]);

  const percentage = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 0;
  const isEligible = totalClasses > 0 && percentage >= CERTIFICATE_MIN_ATTENDANCE_PERCENT;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="no-print mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <Link
            href="/estudiante"
            className="mb-2 inline-flex items-center gap-1 text-xs font-bold text-role-ink hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Volver a mis clases</span>
          </Link>
          <h1 className="flex items-center gap-2.5 font-display text-2xl font-bold text-slate-800 sm:text-3xl">
            <span>Constancia de participación</span>
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Constancia de tu participación en el programa formativo de Empoderas Diversas.
          </p>
        </div>

        {isEligible && (
          <Button leftIcon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>
            Descargar / imprimir diploma
          </Button>
        )}
      </div>

      {loading ? (
        <div className="py-24 text-center text-sm text-slate-500">Generando acreditación...</div>
      ) : !isEligible ? (
        <Card variant="glass" className="mx-auto max-w-lg p-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-100 text-amber-600">
            <Lock className="h-8 w-8" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-slate-800">Constancia aún no disponible</h2>
          <p className="mb-6 text-xs leading-relaxed text-slate-500">
            Para obtener tu constancia de participación debes registrar al menos el {CERTIFICATE_MIN_ATTENDANCE_PERCENT}
            % de asistencia a las clases virtuales, ingresando con el botón de Google Meet.
          </p>

          <div className="mb-6 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs text-slate-600">
            <div className="mb-1.5 flex justify-between font-bold">
              <span>Tu asistencia actual:</span>
              <span className="text-role-ink">
                {percentage}% ({totalAttended} de {totalClasses} clases)
              </span>
            </div>
            <ProgressBar value={percentage} label="Avance de asistencia para la constancia" />
          </div>

          <Button href="/estudiante">Ir a mis próximas clases</Button>
        </Card>
      ) : (
        <div className="relative overflow-hidden rounded-3xl border-8 border-purple-900/10 bg-white p-10 text-center shadow-2xl sm:p-14 print:m-0 print:border-4 print:p-8 print:shadow-none">
          <CornerOrnaments />
          <Seal />

          <div className="relative z-10 space-y-6">
            <div className="mb-2 flex justify-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-purple-800">
                <Sparkles className="h-4 w-4 text-purple-600" />
                <span>Empoderas Diversas · Red de Formación</span>
              </div>
            </div>

            <h2 className="text-xs font-black uppercase tracking-[0.25em] text-slate-500 sm:text-sm">
              Constancia de Participación
            </h2>

            <p className="mx-auto max-w-lg text-xs text-slate-500">
              La corporación y red de capacitación <strong>Empoderas Diversas</strong> hace constar que:
            </p>

            <div className="py-3">
              <h3 className="font-serif text-3xl font-bold tracking-tight text-purple-950 sm:text-5xl">{user.name}</h3>
              <p className="mt-2 text-xs font-semibold text-slate-600">
                Documento de identidad: <strong>{user.documentId || 'Registrada en plataforma'}</strong>
              </p>
            </div>

            <p className="mx-auto max-w-2xl text-xs leading-relaxed text-slate-700 sm:text-sm">
              Participó en el programa de formación de Empoderas Diversas, con una asistencia registrada del{' '}
              <strong>{percentage}%</strong> a las sesiones virtuales en vivo en las que estuvo inscrita (
              {totalAttended} de {totalClasses}).
            </p>

            <p className="mx-auto max-w-xl text-[10px] leading-relaxed text-slate-500">
              Este documento acredita la participación en una actividad de formación complementaria. No constituye
              título académico ni certificación de educación formal ni de competencias laborales.
            </p>

            <div className="mx-auto grid max-w-xl grid-cols-2 gap-8 pt-10">
              <div className="text-center">
                <div className="mx-auto mb-2 w-44 border-b-2 border-slate-400" />
                <p className="text-xs font-bold text-slate-800">Dirección General</p>
                <p className="text-[10px] text-slate-500">Empoderas Diversas</p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-2 w-44 border-b-2 border-slate-400" />
                <p className="text-xs font-bold text-slate-800">Coordinación de Mentorías</p>
                <p className="text-[10px] text-slate-500">Comité Pedagógico</p>
              </div>
            </div>

            <div className="flex flex-col items-center justify-between gap-2 border-t border-slate-200/80 pt-8 text-[11px] text-slate-500 sm:flex-row">
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>
                  Código de referencia: <strong>ED-{user.id.slice(-8).toUpperCase()}</strong>
                </span>
              </span>
              <span>Fecha de expedición: {formatDateLong(new Date())}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const CORNER_POSITIONS = [
  'top-0 left-0',
  'top-0 right-0 -scale-x-100',
  'bottom-0 right-0 rotate-180',
  'bottom-0 left-0 -scale-y-100',
];

/** Las 4 esquinas del diploma, un único componente que reutiliza un mismo trazo SVG rotado/reflejado. */
function CornerOrnaments() {
  return (
    <>
      {CORNER_POSITIONS.map((pos, i) => (
        <svg
          key={i}
          aria-hidden="true"
          width="72"
          height="72"
          viewBox="0 0 72 72"
          className={`pointer-events-none absolute ${pos}`}
        >
          <path d="M6 6 L56 6 M6 6 L6 56" stroke="#7e22ce" strokeWidth="6" strokeLinecap="round" fill="none" />
        </svg>
      ))}
    </>
  );
}

function Seal() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.04]">
      <svg width="380" height="380" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="46" fill="none" stroke="#581c87" strokeWidth="2" />
        <circle cx="50" cy="50" r="38" fill="none" stroke="#581c87" strokeWidth="1" />
        <path d="M50 20 L58 42 L82 42 L62 56 L70 78 L50 64 L30 78 L38 56 L18 42 L42 42 Z" fill="#581c87" />
      </svg>
    </div>
  );
}
