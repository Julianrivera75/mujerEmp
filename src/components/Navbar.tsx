'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Sparkles, 
  LogOut, 
  Users, 
  Calendar, 
  CheckCircle2, 
  BookOpen, 
  Video, 
  ClipboardList, 
  GraduationCap, 
  LayoutDashboard,
  Award,
  User as UserIcon
} from 'lucide-react';

interface NavbarProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: 'ADMIN' | 'MENTOR' | 'STUDENT';
    status: 'ACTIVO' | 'INACTIVO';
  };
}

export default function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Error cerrando sesión:', err);
    }
  };

  const getRoleBadge = () => {
    switch (user.role) {
      case 'ADMIN':
        return {
          label: 'Administradora',
          bg: 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-purple-200',
        };
      case 'MENTOR':
        return {
          label: 'Mentora',
          bg: 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-teal-200',
        };
      case 'STUDENT':
        return {
          label: 'Estudiante',
          bg: 'bg-gradient-to-r from-fuchsia-500 to-pink-600 text-white shadow-pink-200',
        };
    }
  };

  const badge = getRoleBadge();

  // Enlaces según el rol
  const adminLinks = [
    { href: '/admin', label: 'Panel', icon: LayoutDashboard },
    { href: '/admin/usuarios', label: 'Usuarios (Mentores & Estudiantes)', icon: Users },
    { href: '/admin/clases', label: 'Programación Mensual', icon: Calendar },
    { href: '/admin/asistencias', label: 'Reporte de Asistencias', icon: CheckCircle2 },
  ];

  const mentorLinks = [
    { href: '/mentor', label: 'Mis Clases & Horario', icon: Calendar },
    { href: '/mentor/asistencias', label: 'Asistencias en Vivo', icon: CheckCircle2 },
    { href: '/mentor/tareas', label: 'Tareas & Calificaciones', icon: ClipboardList },
  ];

  const studentLinks = [
    { href: '/estudiante', label: 'Mis Clases & En vivo', icon: Video },
    { href: '/estudiante/repositorio', label: 'Repositorio (Grabaciones YouTube)', icon: BookOpen },
    { href: '/estudiante/tareas', label: 'Mis Tareas & Notas', icon: ClipboardList },
    { href: '/estudiante/asistencias', label: 'Mi Asistencia', icon: CheckCircle2 },
    { href: '/estudiante/certificado', label: 'Mi Certificado', icon: Award },
  ];

  const navLinks = user.role === 'ADMIN' ? adminLinks : user.role === 'MENTOR' ? mentorLinks : studentLinks;

  return (
    <header className="sticky top-0 z-50 glass-card border-b border-white/60 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Marca */}
          <Link href={user.role === 'ADMIN' ? '/admin' : user.role === 'MENTOR' ? '/mentor' : '/estudiante'} className="flex items-center space-x-3 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-fuchsia-600 via-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/25 transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight bg-gradient-to-r from-fuchsia-600 via-purple-700 to-indigo-800 bg-clip-text text-transparent">
                Empoderas Diversas
              </span>
              <span className="block text-[11px] font-semibold text-purple-700 uppercase tracking-wider">
                Plataforma de Capacitación
              </span>
            </div>
          </Link>

          {/* Menú de Navegación */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                      : 'text-slate-600 hover:text-purple-700 hover:bg-purple-50/70'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-purple-500'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Usuario & Cerrar sesión */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3 pl-2 sm:border-l border-slate-200">
              <Link
                href="/perfil"
                className="flex items-center space-x-2.5 p-1.5 rounded-2xl hover:bg-purple-50 transition-colors group"
                title="Ver mi perfil y seguridad"
              >
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs group-hover:scale-105 transition-transform">
                  <UserIcon className="w-4 h-4" />
                </div>
                <div className="hidden sm:block text-right">
                  <p className="text-xs font-bold text-slate-800 leading-tight group-hover:text-purple-700 transition-colors">
                    {user.name}
                  </p>
                  <div className="mt-0.5">
                    <span className={`inline-block text-[10px] font-semibold px-2 py-0.2 rounded-full shadow-sm ${badge.bg}`}>
                      {badge.label}
                    </span>
                  </div>
                </div>
              </Link>
              <button
                onClick={handleLogout}
                title="Cerrar sesión"
                className="p-2.5 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors duration-200"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Subbarra móvil */}
      <div className="md:hidden flex overflow-x-auto px-4 py-2 border-t border-slate-200/50 bg-white/70 space-x-1 no-scrollbar">
        {navLinks.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-shrink-0 flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-600 hover:bg-purple-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
}
