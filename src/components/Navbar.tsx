'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, m } from 'framer-motion';
import {
  LogOut,
  Users,
  Calendar,
  CheckCircle2,
  BookOpen,
  Video,
  ClipboardList,
  LayoutDashboard,
  Award,
  User as UserIcon,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Avatar } from '@/components/ui/Avatar';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { cn } from '@/lib/cn';

interface NavbarProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: 'ADMIN' | 'MENTOR' | 'STUDENT';
    status: 'ACTIVO' | 'INACTIVO';
    avatar?: string | null;
  };
}

const adminLinks = [
  { href: '/admin', label: 'Panel', icon: LayoutDashboard },
  { href: '/admin/usuarios', label: 'Usuarios', icon: Users },
  { href: '/admin/clases', label: 'Programación', icon: Calendar },
  { href: '/admin/asistencias', label: 'Asistencias', icon: CheckCircle2 },
];

const mentorLinks = [
  { href: '/mentor', label: 'Mis clases', icon: Calendar },
  { href: '/mentor/asistencias', label: 'Asistencias', icon: CheckCircle2 },
  { href: '/mentor/tareas', label: 'Tareas', icon: ClipboardList },
];

const studentLinks = [
  { href: '/estudiante', label: 'Mis clases', icon: Video },
  { href: '/estudiante/repositorio', label: 'Repositorio', icon: BookOpen },
  { href: '/estudiante/tareas', label: 'Mis tareas', icon: ClipboardList },
  { href: '/estudiante/asistencias', label: 'Mi asistencia', icon: CheckCircle2 },
  { href: '/estudiante/certificado', label: 'Constancia', icon: Award },
];

export default function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const layoutId = useId();
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const navLinks = user.role === 'ADMIN' ? adminLinks : user.role === 'MENTOR' ? mentorLinks : studentLinks;
  const homeHref = user.role === 'ADMIN' ? '/admin' : user.role === 'MENTOR' ? '/mentor' : '/estudiante';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Error cerrando sesión:', err);
    }
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-nav glass-card border-b border-white/60 transition-shadow duration-200',
        scrolled && 'shadow-soft',
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href={homeHref} className="group">
            <Logo variant="compact" />
          </Link>

          <nav className="hidden md:flex items-center gap-1 relative">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors duration-200',
                    isActive ? 'text-white' : 'text-slate-600 hover:text-role-accent hover:bg-role-soft/70',
                  )}
                >
                  {isActive && (
                    <m.span
                      layoutId={`navbar-pill-${layoutId}`}
                      className="absolute inset-0 rounded-xl bg-gradient-to-r from-role-from to-role-to -z-10"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <Icon className="w-4 h-4" strokeWidth={1.75} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <div ref={menuRef} className="relative hidden sm:block">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="flex items-center gap-2.5 p-1.5 pr-2.5 rounded-2xl hover:bg-role-soft transition-colors"
              >
                <Avatar avatarKey={user.avatar} fallbackInitial={user.name.charAt(0)} size="sm" />
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-800 leading-tight">{user.name}</p>
                  <RoleBadge role={user.role} className="mt-0.5" />
                </div>
                <ChevronDown className={cn('w-3.5 h-3.5 text-slate-400 transition-transform', menuOpen && 'rotate-180')} />
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-52 glass-panel rounded-2xl shadow-lift border border-white/60 p-1.5 z-nav"
                >
                  <Link
                    href="/perfil"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-role-soft hover:text-role-accent transition-colors"
                  >
                    <UserIcon className="w-4 h-4" />
                    <span>Mi perfil</span>
                  </Link>
                  <button
                    role="menuitem"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Cerrar sesión</span>
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => setDrawerOpen(true)}
              className="md:hidden p-2.5 rounded-xl text-slate-600 hover:bg-role-soft transition-colors"
              aria-label="Abrir menú"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {drawerOpen && (
          <MobileDrawer
            user={user}
            navLinks={navLinks}
            pathname={pathname ?? ''}
            onClose={() => setDrawerOpen(false)}
            onLogout={handleLogout}
          />
        )}
      </AnimatePresence>
    </header>
  );
}

function MobileDrawer({
  user,
  navLinks,
  pathname,
  onClose,
  onLogout,
}: {
  user: NavbarProps['user'];
  navLinks: { href: string; label: string; icon: React.ElementType }[];
  pathname: string;
  onClose: () => void;
  onLogout: () => void;
}) {
  const onCloseRef = React.useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="md:hidden fixed inset-0 z-modal"
    >
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <m.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="absolute right-0 top-0 h-full w-72 glass-panel p-5 flex flex-col"
      >
        <div className="flex items-center justify-between mb-6">
          <Avatar avatarKey={user.avatar} fallbackInitial={user.name.charAt(0)} size="sm" />
          <button onClick={onClose} aria-label="Cerrar menú" className="p-2 rounded-xl text-slate-500 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm font-bold text-slate-800">{user.name}</p>
        <RoleBadge role={user.role} className="mt-1 mb-5 self-start" />

        <nav className="flex flex-col gap-1 flex-1">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors',
                  isActive ? 'text-white bg-gradient-to-r from-role-from to-role-to' : 'text-slate-600 hover:bg-role-soft',
                )}
              >
                <Icon className="w-4 h-4" strokeWidth={1.75} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <Link
          href="/perfil"
          onClick={onClose}
          className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-role-soft"
        >
          <UserIcon className="w-4 h-4" />
          <span>Mi perfil</span>
        </Link>
        <button
          onClick={onLogout}
          className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50"
        >
          <LogOut className="w-4 h-4" />
          <span>Cerrar sesión</span>
        </button>
      </m.div>
    </m.div>
  );
}
