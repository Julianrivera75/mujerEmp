'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sparkles, ArrowRight, Lock, Mail, ShieldAlert } from 'lucide-react';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inactiveParam = searchParams.get('error') === 'inactive';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(
    inactiveParam ? 'Tu cuenta se encuentra inactiva. Por favor, comunícate con el administrador.' : ''
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'No se pudo iniciar sesión.');
        setLoading(false);
        return;
      }

      router.push(data.redirectUrl || '/');
      router.refresh();
    } catch (err) {
      setError('Error al conectar con el servidor.');
      setLoading(false);
    }
  };

  const setTestAccount = (testEmail: string, testPass: string) => {
    setEmail(testEmail);
    setPassword(testPass);
    setError('');
  };

  return (
    <div className="w-full max-w-md relative z-10">
      {/* Encabezado con Logo y Marca */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-tr from-fuchsia-600 via-purple-600 to-indigo-600 text-white shadow-xl shadow-purple-500/30 mb-4 transform hover:scale-105 transition-transform">
          <Sparkles className="w-8 h-8 animate-pulse" />
        </div>
        <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-fuchsia-600 via-purple-700 to-indigo-800 bg-clip-text text-transparent">
          Empoderas Diversas
        </h1>
        <p className="text-slate-600 text-sm mt-1 font-medium">
          Plataforma de Capacitación y Mentoría Virtual
        </p>
      </div>

      {/* Tarjeta de Inicio de Sesión */}
      <div className="glass-card rounded-3xl p-8 shadow-2xl border border-white/80">
        <h2 className="text-xl font-bold text-slate-800 mb-2 text-center">
          Bienvenida/o al Portal
        </h2>
        <p className="text-slate-500 text-xs text-center mb-6">
          Ingresa tus credenciales para acceder a tus clases, horarios y tareas.
        </p>

        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start space-x-2.5">
            <ShieldAlert className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@empoderas.org"
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/70 border border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/15 text-sm text-slate-800 transition-all outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/70 border border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/15 text-sm text-slate-800 transition-all outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 px-4 rounded-2xl text-white font-bold text-sm bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 hover:from-fuchsia-700 hover:via-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Ingresar a la Plataforma</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Acceso Rápido para Pruebas */}
        <div className="mt-8 pt-6 border-t border-slate-200/60">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center mb-3">
            ⚡ Acceso rápido de demostración:
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setTestAccount('admin@empoderas.org', '123456')}
              className="py-2 px-2 text-center rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-bold border border-purple-200 transition-colors"
            >
              👑 Admin
            </button>
            <button
              type="button"
              onClick={() => setTestAccount('carolina.mentor@empoderas.org', '123456')}
              className="py-2 px-2 text-center rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold border border-teal-200 transition-colors"
            >
              👩‍🏫 Mentora
            </button>
            <button
              type="button"
              onClick={() => setTestAccount('sofia.estudiante@empoderas.org', '123456')}
              className="py-2 px-2 text-center rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-800 text-xs font-bold border border-pink-200 transition-colors"
            >
              🎓 Estudiante
            </button>
          </div>
          <div className="mt-2 text-center">
            <button
              type="button"
              onClick={() => setTestAccount('inactiva@empoderas.org', '123456')}
              className="text-[11px] text-slate-400 hover:text-red-500 underline"
            >
              Probar usuario inactivo (inactiva@empoderas.org)
            </button>
          </div>
        </div>
      </div>

      {/* Pie informativo */}
      <p className="text-center text-xs text-slate-500 mt-6 font-medium">
        Empoderas Diversas © {new Date().getFullYear()} • Transformando realidades mediante educación
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      {/* Elementos decorativos de fondo con animación */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-fuchsia-400/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob pointer-events-none" />
      <div className="absolute top-20 right-10 w-80 h-80 bg-purple-400/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob [animation-delay:2s] pointer-events-none" />
      <div className="absolute -bottom-10 left-1/3 w-80 h-80 bg-indigo-400/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob [animation-delay:4s] pointer-events-none" />

      <Suspense fallback={<div className="text-purple-600 font-bold">Cargando portal...</div>}>
        <LoginFormContent />
      </Suspense>
    </div>
  );
}
