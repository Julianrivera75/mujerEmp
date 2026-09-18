'use client';

import React, { useEffect, useState } from 'react';
import { User, Phone, CheckCircle2, ShieldCheck, Save } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { SkeletonCard } from '@/components/ui/Skeleton';
import FileUpload from '@/components/FileUpload';
import { useToast } from '@/components/ui/Toast';
import { ROLE_META, type Role } from '@/lib/roles';

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
        console.error('Error cargando perfil:', err);
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
        body: JSON.stringify({ phone, currentPassword: currentPassword || undefined, newPassword: newPassword || undefined }),
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
    <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-800 flex items-center gap-3">
          <User className="w-7 h-7 text-role-accent" />
          <span>Mi perfil y seguridad</span>
        </h1>
        <p className="text-slate-500 text-sm mt-1">Consulta los datos de tu cuenta, periodo de vinculación y actualiza tu contraseña de acceso.</p>
      </div>

      {loading || !profile ? (
        <SkeletonCard />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card variant="glass" className="p-6 space-y-4">
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
              <span className="inline-block mt-2 text-[11px] font-bold px-3 py-0.5 rounded-full bg-role-soft text-role-accent">{ROLE_META[profile.role].label}</span>
            </div>

            <div className="space-y-2.5 pt-4 border-t border-slate-100 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Estado:</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {profile.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Documento:</span>
                <span className="font-semibold text-slate-700">{profile.documentId || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Fecha inicio:</span>
                <span className="font-semibold text-slate-700">{profile.startDate ? new Date(profile.startDate).toLocaleDateString('es-ES') : 'Indefinido'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Fecha fin:</span>
                <span className="font-semibold text-slate-700">{profile.endDate ? new Date(profile.endDate).toLocaleDateString('es-ES') : 'Indefinido'}</span>
              </div>
            </div>
          </Card>

          <Card variant="glass" className="md:col-span-2 p-6 sm:p-8">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-role-accent" />
              <span>Actualizar datos de contacto y contraseña</span>
            </h2>

            {errorMsg && <div role="alert" className="mb-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs">{errorMsg}</div>}

            <form onSubmit={handleSave} className="space-y-4">
              <Input label="Teléfono de contacto" placeholder="+57 300 000 0000" value={phone} onChange={(e) => setPhone(e.target.value)} leftIcon={<Phone className="w-4 h-4" />} />

              <div className="pt-4 border-t border-slate-100 space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Cambiar contraseña (opcional)</h3>
                <Input label="Contraseña actual" type="password" placeholder="••••••••" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input label="Nueva contraseña" type="password" placeholder="Mínimo 6 caracteres" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                  <Input label="Confirmar nueva contraseña" type="password" placeholder="Repite la nueva contraseña" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button type="submit" loading={saving} leftIcon={<Save className="w-4 h-4" />}>
                  Guardar cambios
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
