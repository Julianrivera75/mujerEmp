'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { User, Phone, CheckCircle2, ShieldCheck, Save, Download } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { SkeletonCard } from '@/components/ui/Skeleton';
import FileUpload from '@/components/FileUpload';
import { useToast } from '@/components/ui/Toast';
import { ROLE_META, type Role } from '@/lib/roles';
import { formatDate } from '@/lib/format';
import { logClientError } from '@/lib/client-log';

interface FullProfile {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: 'ACTIVO' | 'INACTIVO';
  phone: string | null;
  documentId: string | null;
  startDate: string | null;
  endDate: string | null;
  avatar: string | null;
}

export default function ProfilePage() {
  const { show } = useToast();
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [phone, setPhone] = useState('');
  const [avatarKey, setAvatarKey] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.user) {
          setProfile(data.user);
          setPhone(data.user.phone || '');
          setAvatarKey(data.user.avatar || null);
        }
      } catch (err) {
        logClientError('Error cargando perfil:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleAvatarUploaded = async (key: string) => {
    setAvatarSaving(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: key }),
      });
      if (!res.ok) {
        const data = await res.json();
        show('error', data.error || 'No se pudo guardar la foto de perfil.');
        return;
      }
      setAvatarKey(key);
      show('success', 'Foto de perfil actualizada.');
    } catch (err) {
      show('error', 'Error de conexión al guardar la foto.');
    } finally {
      setAvatarSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (newPassword && newPassword !== confirmPassword) {
      setErrorMsg('La nueva contraseña y su confirmación no coinciden.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'No se pudo actualizar el perfil.');
        return;
      }

      show('success', 'Datos actualizados.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setErrorMsg('Error de conexión con el servidor.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="flex items-center gap-3 font-display text-2xl font-bold text-slate-800 sm:text-3xl">
          <User className="h-7 w-7 text-role-accent" />
          <span>Mi perfil y seguridad</span>
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Consulta los datos de tu cuenta, periodo de vinculación y actualiza tu contraseña de acceso.
        </p>
      </div>

      {loading || !profile ? (
        <SkeletonCard />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card variant="glass" className="space-y-4 p-6">
            <Avatar avatarKey={avatarKey} fallbackInitial={profile.name.charAt(0)} size="xl" ring className="mx-auto" />

            <div className="flex justify-center">
              <FileUpload
                category="avatar"
                accept="image/png,image/jpeg,image/webp"
                label={avatarSaving ? 'Guardando...' : 'Cambiar foto'}
                onUploaded={(key) => handleAvatarUploaded(key)}
              />
            </div>

            <div className="text-center">
              <h2 className="text-lg font-bold text-slate-800">{profile.name}</h2>
              <p className="text-xs text-slate-500">{profile.email}</p>
              <span className="mt-2 inline-block rounded-full bg-role-soft px-3 py-0.5 text-[11px] font-bold text-role-accent">
                {ROLE_META[profile.role].label}
              </span>
            </div>

            <div className="space-y-2.5 border-t border-slate-100 pt-4 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Estado:</span>
                <span className="flex items-center gap-1 font-bold text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {profile.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Documento:</span>
                <span className="font-semibold text-slate-700">{profile.documentId || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Fecha inicio:</span>
                <span className="font-semibold text-slate-700">
                  {profile.startDate ? formatDate(profile.startDate) : 'Indefinido'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Fecha fin:</span>
                <span className="font-semibold text-slate-700">
                  {profile.endDate ? formatDate(profile.endDate) : 'Indefinido'}
                </span>
              </div>
            </div>
          </Card>

          <Card variant="glass" className="p-6 sm:p-8 md:col-span-2">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800">
              <ShieldCheck className="h-5 w-5 text-role-accent" />
              <span>Actualizar datos de contacto y contraseña</span>
            </h2>

            {errorMsg && (
              <div role="alert" className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <Input
                label="Teléfono de contacto"
                placeholder="+57 300 000 0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                leftIcon={<Phone className="h-4 w-4" />}
              />

              <div className="space-y-3 border-t border-slate-100 pt-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Cambiar contraseña (opcional)
                </h3>
                <Input
                  label="Contraseña actual"
                  type="password"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input
                    label="Nueva contraseña"
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <Input
                    label="Confirmar nueva contraseña"
                    type="password"
                    placeholder="Repite la nueva contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button type="submit" loading={saving} leftIcon={<Save className="h-4 w-4" />}>
                  Guardar cambios
                </Button>
              </div>
            </form>
          </Card>

          <Card variant="glass" className="p-6 sm:p-8 md:col-span-3">
            <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-slate-800">
              <Download className="h-5 w-5 text-role-accent" />
              <span>Tus datos personales</span>
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-slate-600">
              Tienes derecho a conocer los datos que guardamos sobre ti. Descarga una copia en formato JSON con tu
              información de cuenta, asistencia, entregas y calificaciones. Para solicitar la rectificación o la
              supresión de tus datos, consulta la{' '}
              <Link href="/privacidad" className="font-semibold text-role-accent underline">
                política de tratamiento de datos
              </Link>
              .
            </p>
            <div className="mt-4">
              <Button href="/api/auth/export" variant="secondary" leftIcon={<Download className="h-4 w-4" />} download>
                Descargar mis datos
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
