'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { 
  Award, 
  Printer, 
  Sparkles, 
  ShieldCheck, 
  Calendar, 
  CheckCircle2, 
  Loader2,
  Lock,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

export default function StudentCertificatePage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [totalClasses, setTotalClasses] = useState(0);
  const [totalAttended, setTotalAttended] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [meRes, classesRes, attRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/classes'),
          fetch('/api/admin/attendances'),
        ]);

        const meData = await meRes.json();
        setCurrentUser(meData.user);

        const classesData = await classesRes.json();
        const myClasses = classesData.classes || [];
        setTotalClasses(myClasses.length);

        const attData = await attRes.json();
        const allAtt = attData.attendances || [];
        const myAtt = allAtt.filter((a: any) => a.student.id === meData.user?.id);
        setTotalAttended(myAtt.length);
      } catch (err) {
        console.error('Error cargando certificado:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const percentage = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 0;
  // Permitimos ver el certificado si asistió al menos al 50% en demo o tiene asistencias
  const isEligible = totalAttended > 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <div className="print:hidden">
        {currentUser && <Navbar user={currentUser} />}
      </div>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Barra superior no imprimible */}
        <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <Link
              href="/estudiante"
              className="inline-flex items-center space-x-1 text-xs font-bold text-purple-700 hover:underline mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver a mis clases</span>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-800 flex items-center space-x-2.5">
              <Award className="w-8 h-8 text-purple-600" />
              <span>Certificado de Acreditación</span>
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">
              Acreditación oficial de culminación y asistencia al programa formativo de Empoderas Diversas.
            </p>
          </div>

          {isEligible && (
            <button
              onClick={handlePrint}
              className="inline-flex items-center space-x-2 px-6 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow-lg shadow-purple-500/25 transition-all transform hover:-translate-y-0.5"
            >
              <Printer className="w-4 h-4" />
              <span>Descargar / Imprimir Diploma</span>
            </button>
          )}
        </div>

        {loading ? (
          <div className="py-24 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-purple-600" />
            <p>Generando acreditación...</p>
          </div>
        ) : !isEligible ? (
          /* Estado Bloqueado */
          <div className="glass-card rounded-3xl p-10 text-center border border-white shadow-xl max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">
              Certificado en Proceso de Desbloqueo
            </h2>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Para obtener tu certificado de capacitación, debes asistir a tus clases virtuales mediante el botón de Google Meet.
            </p>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs text-slate-600 mb-6">
              <div className="flex justify-between mb-1.5 font-bold">
                <span>Tu asistencia actual:</span>
                <span className="text-purple-700">{percentage}% ({totalAttended} de {totalClasses} clases)</span>
              </div>
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>

            <Link
              href="/estudiante"
              className="inline-flex items-center space-x-2 px-6 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition-all"
            >
              <span>Ir a mis próximas clases</span>
            </Link>
          </div>
        ) : (
          /* Diploma Oficial Imprimible */
          <div className="relative bg-white rounded-3xl p-10 sm:p-14 shadow-2xl border-8 border-purple-900/10 text-center overflow-hidden print:border-4 print:shadow-none print:m-0 print:p-8">
            {/* Adornos decorativos de esquinas */}
            <div className="absolute top-0 left-0 w-28 h-28 border-t-8 border-l-8 border-purple-600 rounded-tl-2xl pointer-events-none" />
            <div className="absolute top-0 right-0 w-28 h-28 border-t-8 border-r-8 border-purple-600 rounded-tr-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-28 h-28 border-b-8 border-l-8 border-purple-600 rounded-bl-2xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-28 h-28 border-b-8 border-r-8 border-purple-600 rounded-br-2xl pointer-events-none" />

            {/* Marca de agua institucional */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
              <Award className="w-96 h-96 text-purple-900" />
            </div>

            <div className="relative z-10 space-y-6">
              {/* Logo / Cabecera */}
              <div className="flex justify-center mb-2">
                <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-purple-100 text-purple-800 text-xs font-black uppercase tracking-widest">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>Empoderas Diversas • Red de Formación</span>
                </div>
              </div>

              <h2 className="text-xs sm:text-sm font-black uppercase tracking-[0.25em] text-slate-500">
                Certificado de Acreditación y Participación
              </h2>

              <p className="text-xs text-slate-500 max-w-lg mx-auto">
                La corporación y red de capacitación <strong>Empoderas Diversas</strong> hace constar que:
              </p>

              {/* Nombre de la Estudiante */}
              <div className="py-3">
                <h3 className="text-3xl sm:text-5xl font-black text-purple-950 tracking-tight font-serif">
                  {currentUser?.name}
                </h3>
                <p className="text-xs font-semibold text-slate-600 mt-2">
                  Documento de Identidad: <strong>{currentUser?.documentId || 'Registrada en plataforma'}</strong>
                </p>
              </div>

              <p className="text-xs sm:text-sm text-slate-700 max-w-2xl mx-auto leading-relaxed">
                Ha completado satisfactoriamente los módulos de formación integral, liderazgo transformacional, habilidades digitales y gestión de proyectos comunitarios, cumpliendo con los estándares de asistencia sincrónica virtual y entrega de actividades prácticas.
              </p>

              {/* Sellos y Firmas */}
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

              {/* Pie de Página con Código de Verificación */}
              <div className="pt-8 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
                <span className="flex items-center space-x-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Código Único de Verificación: <strong>ED-{currentUser?.id?.slice(-8).toUpperCase()}</strong></span>
                </span>
                <span>
                  Fecha de expedición: {new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
