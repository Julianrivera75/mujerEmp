'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Printer, ShieldCheck, Lock, ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useSessionUser } from '@/lib/user-context';
import { CERTIFICATE_MIN_ATTENDANCE_PERCENT } from '@/lib/legal';

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
        const allAtt = attData.attendances || [];
        setTotalAttended(allAtt.filter((a: any) => a.student.id === user.id).length);
      } catch (err) {
        console.error('Error cargando certificado:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user.id]);

  const percentage = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 0;
  const isEligible = totalClasses > 0 && percentage >= CERTIFICATE_MIN_ATTENDANCE_PERCENT;

  return (
    <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <Link href="/estudiante" className="inline-flex items-center gap-1 text-xs font-bold text-role-accent hover:underline mb-2">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver a mis clases</span>
          </Link>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-800 flex items-center gap-2.5">
            <span>Constancia de participación</span>
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">Constancia de tu participación en el programa formativo de Empoderas Diversas.</p>
        </div>

        {isEligible && (
          <Button leftIcon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>
            Descargar / imprimir diploma
          </Button>
        )}
      </div>

      {loading ? (
        <div className="py-24 text-center text-slate-400 text-sm">Generando acreditación...</div>
      ) : !isEligible ? (
        <Card variant="glass" className="p-10 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Constancia aún no disponible</h2>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            Para obtener tu constancia de participación debes registrar al menos el {CERTIFICATE_MIN_ATTENDANCE_PERCENT}% de asistencia a las clases virtuales, ingresando con el botón de Google Meet.
          </p>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs text-slate-600 mb-6">
            <div className="flex justify-between mb-1.5 font-bold">
              <span>Tu asistencia actual:</span>
              <span className="text-role-accent">
                {percentage}% ({totalAttended} de {totalClasses} clases)
              </span>
            </div>
            <ProgressBar value={percentage} />
          </div>

          <Button href="/estudiante">Ir a mis próximas clases</Button>
        </Card>
      ) : (
        <div className="relative bg-white rounded-3xl p-10 sm:p-14 shadow-2xl border-8 border-purple-900/10 text-center overflow-hidden print:border-4 print:shadow-none print:m-0 print:p-8">
          <CornerOrnaments />
          <Seal />

          <div className="relative z-10 space-y-6">
            <div className="flex justify-center mb-2">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-100 text-purple-800 text-xs font-black uppercase tracking-widest">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>Empoderas Diversas · Red de Formación</span>
              </div>
            </div>

            <h2 className="text-xs sm:text-sm font-black uppercase tracking-[0.25em] text-slate-500">Constancia de Participación</h2>

            <p className="text-xs text-slate-500 max-w-lg mx-auto">
              La corporación y red de capacitación <strong>Empoderas Diversas</strong> hace constar que:
            </p>

            <div className="py-3">
              <h3 className="text-3xl sm:text-5xl font-bold text-purple-950 tracking-tight font-serif">{user.name}</h3>
              <p className="text-xs font-semibold text-slate-600 mt-2">
                Documento de identidad: <strong>{user.documentId || 'Registrada en plataforma'}</strong>
              </p>
            </div>

            <p className="text-xs sm:text-sm text-slate-700 max-w-2xl mx-auto leading-relaxed">
              Participó en el programa de formación de Empoderas Diversas, con una asistencia registrada del <strong>{percentage}%</strong> a las sesiones virtuales
              en vivo en las que estuvo inscrita ({totalAttended} de {totalClasses}).
            </p>

            <p className="text-[10px] text-slate-400 max-w-xl mx-auto leading-relaxed">
              Este documento acredita la participación en una actividad de formación complementaria. No constituye título académico ni certificación de educación formal ni de competencias laborales.
            </p>

            <div className="pt-10 grid grid-cols-2 gap-8 max-w-xl mx-auto">
              <div className="text-center">
                <div className="w-44 border-b-2 border-slate-400 mx-auto mb-2" />
                <p className="font-bold text-xs text-slate-800">Dirección General</p>
                <p className="text-[10px] text-slate-500">Empoderas Diversas</p>
              </div>
              <div className="text-center">
                <div className="w-44 border-b-2 border-slate-400 mx-auto mb-2" />
                <p className="font-bold text-xs text-slate-800">Coordinación de Mentorías</p>
                <p className="text-[10px] text-slate-500">Comité Pedagógico</p>
              </div>
            </div>

            <div className="pt-8 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>
                  Código de referencia: <strong>ED-{user.id.slice(-8).toUpperCase()}</strong>
                </span>
              </span>
              <span>Fecha de expedición: {new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
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
        <svg key={i} aria-hidden="true" width="72" height="72" viewBox="0 0 72 72" className={`absolute pointer-events-none ${pos}`}>
          <path d="M6 6 L56 6 M6 6 L6 56" stroke="#7e22ce" strokeWidth="6" strokeLinecap="round" fill="none" />
        </svg>
      ))}
    </>
  );
}

function Seal() {
  return (
    <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none">
      <svg width="380" height="380" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="46" fill="none" stroke="#581c87" strokeWidth="2" />
        <circle cx="50" cy="50" r="38" fill="none" stroke="#581c87" strokeWidth="1" />
        <path d="M50 20 L58 42 L82 42 L62 56 L70 78 L50 64 L30 78 L38 56 L18 42 L42 42 Z" fill="#581c87" />
      </svg>
    </div>
  );
}
