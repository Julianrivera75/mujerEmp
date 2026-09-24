'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { m } from 'framer-motion';
import { ArrowRight, Lock, Mail, ShieldAlert, Eye, EyeOff, ShieldCheck, Presentation, GraduationCap, Video, ClipboardList, Award } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Input } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { ParticleField } from '@/components/fx/ParticleField';
import { AuroraBackground } from '@/components/fx/AuroraBackground';
import { fadeUp, stagger } from '@/lib/motion';

const DEMO_ACCOUNTS = [
  { email: 'admin@empoderas.org', password: '123456', label: 'Admin', icon: ShieldCheck },
  { email: 'carolina.mentor@empoderas.org', password: '123456', label: 'Mentora', icon: Presentation },
  { email: 'sofia.estudiante@empoderas.org', password: '123456', label: 'Estudiante', icon: GraduationCap },
] as const;

const VALUE_POINTS = [
  { icon: Video, text: 'Clases en vivo con tu mentora, sin salir de la plataforma' },
  { icon: ClipboardList, text: 'Tareas, entregas y retroalimentación en un solo lugar' },
  { icon: Award, text: 'Certificado de acreditación al completar tu formación' },
];

const SHOW_DEMO_LOGIN = process.env.NEXT_PUBLIC_SHOW_DEMO_LOGIN === 'true';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inactiveParam = searchParams.get('error') === 'inactive';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(
    inactiveParam ? 'Tu cuenta se encuentra inactiva. Por favor, comunícate con el administrador.' : '',
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
    <m.div variants={stagger} initial="hidden" animate="show" className="w-full max-w-md">
      <m.div variants={fadeUp} className="lg:hidden mb-6 flex justify-center">
        <Logo />
      </m.div>

      <m.div variants={fadeUp} className="glass-card rounded-3xl p-7 sm:p-8 shadow-lift border border-white/80">
        <h1 className="font-display text-xl font-bold text-slate-800 mb-1">Bienvenida al portal</h1>
        <p className="text-slate-500 text-xs mb-6">Ingresa tus credenciales para acceder a tus clases, horarios y tareas.</p>

        {error && (
          <div role="alert" className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Correo electrónico"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ejemplo@empoderas.org"
            leftIcon={<Mail className="w-4 h-4" />}
          />

          <Input
            label="Contraseña"
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            leftIcon={<Lock className="w-4 h-4" />}
            rightSlot={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-slate-400 hover:text-slate-600 p-1"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
          />

          <Button type="submit" loading={loading} className="w-full mt-2" rightIcon={<ArrowRight className="w-4 h-4" />}>
            Ingresar a la plataforma
          </Button>
        </form>

        {SHOW_DEMO_LOGIN && (
          <div className="mt-8 pt-6 border-t border-slate-200/60">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center mb-3">
              Acceso rápido de demostración
            </p>
            <div className="grid grid-cols-3 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => setTestAccount(acc.email, acc.password)}
                  className="flex flex-col items-center gap-1 py-2.5 px-2 text-center rounded-xl bg-role-soft hover:brightness-95 text-role-accent text-xs font-bold border border-role-accent/20 transition-colors"
                >
                  <acc.icon className="w-4 h-4" strokeWidth={1.75} />
                  <span>{acc.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </m.div>

      <p className="text-center text-xs text-slate-500 mt-6 font-medium">
        Empoderas Diversas © {new Date().getFullYear()} · Transformando realidades mediante educación
      </p>
      <nav aria-label="Información legal" className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs font-medium text-slate-500">
        <Link href="/terminos" className="hover:text-role-accent hover:underline">
          Términos y condiciones
        </Link>
        <Link href="/privacidad" className="hover:text-role-accent hover:underline">
          Tratamiento de datos
        </Link>
        <Link href="/cookies" className="hover:text-role-accent hover:underline">
          Cookies
        </Link>
      </nav>
    </m.div>
  );
}

export default function LoginPage() {
  return (
    <div data-role="brand" className="min-h-dvh relative flex items-stretch">
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden rounded-r-3xl bg-gradient-to-br from-[#701a75] via-[#3b0764] to-[#1e1b4b]">
        <ParticleField variant="brand" intensity="hero" interactive contained tone="dark" />
        <AuroraBackground spotCount={3} />
        <m.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="relative z-10 flex flex-col justify-center px-12 xl:px-16 text-white"
        >
          <m.div variants={fadeUp}>
            <Logo variant="mark-only" />
          </m.div>
          <m.h2 variants={fadeUp} className="font-display text-4xl xl:text-5xl leading-[1.05] tracking-tight font-bold mt-8 max-w-md">
            Tu red de mentoría para crecer sin límites
          </m.h2>
          <m.div variants={fadeUp} className="mt-10 space-y-4">
            {VALUE_POINTS.map((point, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center flex-shrink-0">
                  <point.icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
                </div>
                <p className="text-sm text-white/85 pt-1.5">{point.text}</p>
              </div>
            ))}
          </m.div>
        </m.div>
      </div>

      <div className="flex-1 relative flex items-center justify-center p-4 sm:p-8 overflow-hidden">
        <AuroraBackground spotCount={2} />
        <Suspense fallback={<div className="text-purple-600 font-bold text-sm">Cargando portal...</div>}>
          <LoginFormContent />
        </Suspense>
      </div>
    </div>
  );
}
