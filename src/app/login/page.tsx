'use client';

import { resetNotificationPopups } from '@/components/NotificationPopups';
import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { m } from 'framer-motion';
import { ArrowRight, Lock, Mail, ShieldAlert, Video, ClipboardList, Award } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { PartnerLogos } from '@/components/PartnerLogos';
import { Input } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { ParticleField } from '@/components/fx/ParticleField';
import { AuroraBackground } from '@/components/fx/AuroraBackground';
import { fadeUp, stagger } from '@/lib/motion';

const VALUE_POINTS = [
  { icon: Video, text: 'Clases en vivo con tu mentora, sin salir de la plataforma' },
  { icon: ClipboardList, text: 'Tareas, entregas y retroalimentación en un solo lugar' },
  { icon: Award, text: 'Certificado de acreditación al completar tu formación' },
];

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inactiveParam = searchParams.get('error') === 'inactive';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

      resetNotificationPopups();
      router.push(data.redirectUrl || '/');
      router.refresh();
    } catch (err) {
      setError('Error al conectar con el servidor.');
      setLoading(false);
    }
  };

  return (
    <m.div variants={stagger} initial="hidden" animate="show" className="w-full max-w-md">
      <m.div variants={fadeUp} className="mb-6 flex flex-col items-center gap-3 text-center lg:hidden">
        <Logo />
        <p className="max-w-xs text-sm font-medium text-slate-600">Tu red de mentoría para crecer sin límites</p>
      </m.div>

      <m.div variants={fadeUp} className="glass-card rounded-3xl border border-white/80 p-7 shadow-lift sm:p-8">
        <h1 className="mb-1 font-display text-xl font-bold text-slate-800">Bienvenido/a al portal</h1>
        <p className="mb-6 text-xs text-slate-500">
          Ingresa tus credenciales para acceder a tus clases, horarios y tareas.
        </p>

        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700"
          >
            <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
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
            placeholder="tucorreo@ejemplo.com"
            leftIcon={<Mail className="h-4 w-4" />}
          />

          <PasswordInput
            label="Contraseña"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            leftIcon={<Lock className="h-4 w-4" />}
          />

          <Button
            type="submit"
            loading={loading}
            className="mt-2 w-full"
            rightIcon={<ArrowRight className="h-4 w-4" />}
          >
            Ingresar a la plataforma
          </Button>
        </form>
      </m.div>

      <PartnerLogos className="mt-6 sm:-mx-12" />

      <p className="mt-6 text-center text-xs font-medium text-slate-500">
        Empoderadas Diversas © {new Date().getFullYear()} · Transformando familias
      </p>
      <nav
        aria-label="Información legal"
        className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs font-medium text-slate-500"
      >
        <Link href="/terminos" className="hover:text-role-ink hover:underline">
          Términos y condiciones
        </Link>
        <Link href="/privacidad" className="hover:text-role-ink hover:underline">
          Tratamiento de datos
        </Link>
        <Link href="/cookies" className="hover:text-role-ink hover:underline">
          Cookies
        </Link>
      </nav>
    </m.div>
  );
}

export default function LoginPage() {
  return (
    <div data-role="brand" className="relative flex min-h-dvh items-stretch">
      <div className="relative hidden overflow-hidden rounded-r-3xl bg-gradient-to-br from-[#701a75] via-[#3b0764] to-[#1e1b4b] lg:flex lg:w-[55%]">
        <ParticleField variant="brand" intensity="hero" interactive contained tone="dark" />
        <AuroraBackground spotCount={3} />
        <m.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="relative z-10 mx-auto flex w-full max-w-xl flex-col justify-center px-10 text-white xl:px-12"
        >
          <m.div variants={fadeUp}>
            <Logo variant="mark-only" tone="white" />
          </m.div>
          <m.h2
            variants={fadeUp}
            className="mt-8 font-display text-4xl font-bold leading-[1.05] tracking-tight xl:text-5xl"
          >
            Tu red de mentoría para crecer{' '}
            <span className="whitespace-nowrap bg-gradient-to-r from-fuchsia-300 to-pink-300 bg-clip-text text-transparent">
              sin límites
            </span>
          </m.h2>
          <m.ul variants={fadeUp} className="mt-10 space-y-3">
            {VALUE_POINTS.map((point, i) => (
              <li
                key={i}
                className="flex items-center gap-4 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md"
              >
                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <point.icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <p className="text-[15px] leading-snug text-white/90">{point.text}</p>
              </li>
            ))}
          </m.ul>
          <m.p variants={fadeUp} className="mt-8 text-xs font-semibold uppercase tracking-wider text-white/60">
            Plataforma de Capacitación
          </m.p>
        </m.div>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden p-4 sm:p-8">
        <AuroraBackground spotCount={2} />
        <Suspense fallback={<div className="text-sm font-bold text-purple-600">Cargando portal...</div>}>
          <LoginFormContent />
        </Suspense>
      </div>
    </div>
  );
}
