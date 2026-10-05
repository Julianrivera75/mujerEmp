'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
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
  Repeat,
  MessageCircle,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useActivity } from '@/components/ActivityProvider';
import { NotificationBell } from '@/components/NotificationBell';
import { Avatar } from '@/components/ui/Avatar';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { ROLE_META, type Role } from '@/lib/roles';
import { cn } from '@/lib/cn';
import { logClientError } from '@/lib/client-log';

interface NavbarProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
    /** Todos los roles de la cuenta; con más de uno se muestra el selector de vista. */
    roles?: Role[];
    status: 'ACTIVO' | 'INACTIVO';
    avatar?: string | null;
  };
}

const adminLinks = [
  { href: '/admin', label: 'Panel', icon: LayoutDashboard },
  { href: '/admin/usuarios', label: 'Usuarios', icon: Users },
  { href: '/admin/clases', label: 'Programación', icon: Calendar },
  { href: '/admin/asistencias', label: 'Asistencias', icon: CheckCircle2 },
  { href: '/chat', label: 'Chat', icon: MessageCircle },
];

const mentorLinks = [
  { href: '/mentor', label: 'Mis clases', icon: Calendar },
  { href: '/mentor/asistencias', label: 'Asistencias', icon: CheckCircle2 },
  { href: '/mentor/tareas', label: 'Tareas', icon: ClipboardList },
  { href: '/chat', label: 'Chat', icon: MessageCircle },
];

const studentLinks = [
  { href: '/estudiante', label: 'Mis clases', icon: Video },
  { href: '/estudiante/repositorio', label: 'Clases grabadas', icon: BookOpen },
  { href: '/estudiante/tareas', label: 'Mis tareas', icon: ClipboardList },
  { href: '/estudiante/asistencias', label: 'Mi asistencia', icon: CheckCircle2 },
  { href: '/estudiante/certificado', label: 'Certificados', icon: Award },
  { href: '/chat', label: 'Chat', icon: MessageCircle },
];

export default function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const layoutId = useId();
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { unreadMessages } = useActivity();
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

  const otherRoles = (user.roles ?? []).filter((r) => r !== user.role);

  const handleSwitchRole = async (role: Role) => {
    try {
      const res = await fetch('/api/auth/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (res.ok) {
        // Recarga completa para que el panel, el menú y los permisos se calculen con la vista nueva.
        window.location.assign(data.redirectUrl || '/');
      }
    } catch (err) {
      logClientError('Error cambiando de vista:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      logClientError('Error cerrando sesión:', err);
    }
  };

  return (
    <header
      className={cn(
        'glass-card sticky top-0 z-nav border-b border-white/60 transition-shadow duration-200',
        scrolled && 'shadow-soft',
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href={homeHref} className="group">
            <Logo variant="compact" />
          </Link>

          <nav className="relative hidden items-center gap-1 md:flex">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'relative flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors duration-200',
                    isActive ? 'text-white' : 'text-slate-600 hover:bg-role-soft/70 hover:text-role-ink',
                  )}
                >
                  {isActive && (
                    <m.span
                      layoutId={`navbar-pill-${layoutId}`}
                      className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-role-from to-role-to"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                  <span>{item.label}</span>
                  {item.href === '/chat' && unreadMessages > 0 && (
                    <span
                      aria-label={`${unreadMessages} mensajes sin leer`}
                      className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white"
                    >
                      {unreadMessages > 9 ? '9+' : unreadMessages}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <NotificationBell />
            <div ref={menuRef} className="relative hidden sm:block">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="flex items-center gap-2.5 rounded-2xl p-1.5 pr-2.5 transition-colors hover:bg-role-soft"
              >
                <Avatar avatarKey={user.avatar} fallbackInitial={user.name.charAt(0)} size="sm" />
                <div className="text-right">
                  <p className="text-xs font-bold leading-tight text-slate-800">{user.name}</p>
                  <RoleBadge role={user.role} className="mt-0.5" />
                </div>
                <ChevronDown
                  className={cn('h-3.5 w-3.5 text-slate-500 transition-transform', menuOpen && 'rotate-180')}
                />
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="glass-panel absolute right-0 z-nav mt-2 w-52 rounded-2xl border border-white/60 p-1.5 shadow-lift"
                >
                  <Link
                    href="/perfil"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-role-soft hover:text-role-ink"
                  >
                    <UserIcon className="h-4 w-4" />
                    <span>Mi perfil</span>
                  </Link>
                  {otherRoles.map((role) => (
                    <button
                      key={role}
                      role="menuitem"
                      onClick={() => handleSwitchRole(role)}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-role-soft hover:text-role-ink"
                    >
                      <Repeat className="h-4 w-4" />
                      <span>Cambiar a vista de {ROLE_META[role].label}</span>
                    </button>
                  ))}
                  <button
                    role="menuitem"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Cerrar sesión</span>
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => setDrawerOpen(true)}
              className="tap-target rounded-xl p-2.5 text-slate-600 transition-colors hover:bg-role-soft md:hidden"
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" />
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
            otherRoles={otherRoles}
            onSwitchRole={handleSwitchRole}
            unreadMessages={unreadMessages}
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
  otherRoles,
  onSwitchRole,
  unreadMessages,
}: {
  unreadMessages: number;
  otherRoles: Role[];
  onSwitchRole: (role: Role) => void;
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

  // El header usa backdrop-filter y atrapa a sus hijos fixed: el menú se dibuja fuera de él.
  return createPortal(
    <div data-role={ROLE_META[user.role].variant}>
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-modal md:hidden"
      >
        <button
          type="button"
          aria-label="Cerrar menú"
          tabIndex={-1}
          className="absolute inset-0 cursor-default bg-slate-900/50 backdrop-blur-sm"
          onClick={onClose}
        />
        <m.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          className="glass-panel absolute right-0 top-0 flex h-full w-[85vw] max-w-xs flex-col overflow-y-auto p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        >
          <div className="mb-6 flex items-center justify-between">
            <Avatar avatarKey={user.avatar} fallbackInitial={user.name.charAt(0)} size="sm" />
            <button
              onClick={onClose}
              aria-label="Cerrar menú"
              className="tap-target rounded-xl p-2 text-slate-500 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-sm font-bold text-slate-800">{user.name}</p>
          <RoleBadge role={user.role} className="mb-5 mt-1 self-start" />

          <nav className="flex flex-1 flex-col gap-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-2.5 rounded-xl px-3.5 py-3 text-sm font-semibold transition-colors',
                    isActive
                      ? 'bg-gradient-to-r from-role-from to-role-to text-white'
                      : 'text-slate-600 hover:bg-role-soft',
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                  <span>{item.label}</span>
                  {item.href === '/chat' && unreadMessages > 0 && (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 text-[11px] font-bold text-white">
                      {unreadMessages}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <Link
            href="/perfil"
            onClick={onClose}
            className="flex items-center gap-2.5 rounded-xl px-3.5 py-3 text-sm font-semibold text-slate-600 hover:bg-role-soft"
          >
            <UserIcon className="h-4 w-4" />
            <span>Mi perfil</span>
          </Link>
          {otherRoles.map((role) => (
            <button
              key={role}
              onClick={() => onSwitchRole(role)}
              className="flex items-center gap-2.5 rounded-xl px-3.5 py-3 text-sm font-semibold text-slate-600 hover:bg-role-soft"
            >
              <Repeat className="h-4 w-4" />
              <span>Cambiar a vista de {ROLE_META[role].label}</span>
            </button>
          ))}
          <button
            onClick={onLogout}
            className="flex items-center gap-2.5 rounded-xl px-3.5 py-3 text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            <span>Cerrar sesión</span>
          </button>
        </m.div>
      </m.div>
    </div>,
    document.body,
  );
}
