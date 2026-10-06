'use client';

import React, { useEffect, useState } from 'react';
import { Users, UserPlus, Search, Edit3, UserX, KeyRound } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Field';
import { Table, THead, TRow, TCell, ResponsiveRow } from '@/components/ui/Table';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { StatusPill } from '@/components/ui/Badge';
import { Switch } from '@/components/ui/Switch';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonRow } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Badge } from '@/components/ui/Badge';
import { PasswordReveal } from '@/components/PasswordReveal';
import { numberLabel } from '@/lib/labels';
import { CredentialsExport } from './_components/CredentialsExport';
import { UserFormModal } from './_components/UserFormModal';
import type { UserItem } from './types';
import { formatDate } from '@/lib/format';
import { logClientError } from '@/lib/client-log';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const { show } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [anonTarget, setAnonTarget] = useState<UserItem | null>(null);
  const [resetTarget, setResetTarget] = useState<UserItem | null>(null);
  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState<{ name: string; email: string; password: string } | null>(null);
  const [anonymizing, setAnonymizing] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<UserItem | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const usersRes = await fetch('/api/admin/users');
      const usersData = await usersRes.json();
      setUsers(usersData.users || []);
    } catch (err) {
      logClientError('Error cargando usuarios:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    setModalMode('create');
    setSelectedUser(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: UserItem) => {
    setModalMode('edit');
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (user: UserItem) => {
    const newStatus = user.status === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u)));
    try {
      const res = await fetch('/api/admin/users/toggle-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, status: newStatus }),
      });
      if (!res.ok) {
        setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, status: user.status } : u)));
        show('error', 'No se pudo actualizar el estado del usuario.');
      } else {
        show('success', `${user.name} quedó ${newStatus === 'ACTIVO' ? 'activa' : 'inactiva'}.`);
      }
    } catch (err) {
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, status: user.status } : u)));
      show('error', 'Error de conexión al actualizar el estado.');
    }
  };

  /** Restablece la contraseña de una persona y la muestra una sola vez. */
  const handleConfirmReset = async () => {
    if (!resetTarget) return;
    setResetting(true);
    try {
      const res = await fetch('/api/admin/users/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [resetTarget.id] }),
      });
      const data = await res.json();
      const credential = data.credentials?.[0];
      if (!res.ok || !credential) {
        show('error', data.error || 'No se pudo restablecer la contraseña. Usa el formulario de edición.');
        return;
      }
      setResetResult({ name: credential.name, email: credential.email, password: credential.password });
    } catch (err) {
      logClientError('Error restableciendo la contraseña:', err);
      show('error', 'Error de conexión al restablecer la contraseña.');
    } finally {
      setResetting(false);
      setResetTarget(null);
    }
  };

  const handleConfirmAnonymize = async () => {
    if (!anonTarget) return;
    setAnonymizing(true);
    try {
      const res = await fetch('/api/admin/users/anonymize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: anonTarget.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        show('error', data.error || 'No se pudo anonimizar la cuenta.');
      } else {
        show(
          'success',
          data.filesFailed
            ? 'Cuenta anonimizada. Algunos archivos no pudieron eliminarse del almacenamiento; revísalos.'
            : 'Cuenta anonimizada.',
        );
        loadData();
      }
    } catch (err) {
      show('error', 'Error de conexión al anonimizar la cuenta.');
    } finally {
      setAnonymizing(false);
      setAnonTarget(null);
    }
  };

  const handleSaved = () => {
    setIsModalOpen(false);
    show('success', modalMode === 'create' ? 'Usuario creado.' : 'Cambios guardados.');
    loadData();
  };

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.memberNumber && u.memberNumber.toLowerCase().includes(search.toLowerCase()));
    const matchRole =
      roleFilter === 'ALL' || u.role === roleFilter || u.extraRoles?.includes(roleFilter as UserItem['role']);
    const matchStatus = statusFilter === 'ALL' || u.status === statusFilter;
    return matchSearch && matchRole && matchStatus;
  });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Comunidad"
        title="Gestión de usuarios"
        description="Crea estudiantes y mentoras, controla su estado y define sus fechas de vigencia."
        actions={
          <div className="flex flex-wrap gap-2">
            <CredentialsExport users={users} />
            <Button leftIcon={<UserPlus className="h-4 w-4" />} onClick={handleOpenCreate}>
              Crear usuario
            </Button>
          </div>
        }
      />

      <Card variant="glass" className="flex flex-col items-center gap-4 p-5 md:flex-row">
        <div className="w-full flex-1">
          <Input
            placeholder="Nombre, correo o número..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>
        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 md:flex md:w-auto md:items-center">
          <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="w-full md:w-auto">
            <option value="ALL">Todos los roles</option>
            <option value="STUDENT">Estudiantes</option>
            <option value="MENTOR">Mentoras</option>
            <option value="ADMIN">Administradoras</option>
          </Select>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full md:w-auto">
            <option value="ALL">Todos los estados</option>
            <option value="ACTIVO">Solo activos</option>
            <option value="INACTIVO">Solo inactivos</option>
          </Select>
        </div>
      </Card>

      <Card variant="glass" className="overflow-hidden p-0">
        {loading ? (
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No hay usuarios con estos filtros"
            description="Ajusta la búsqueda o crea el primer usuario de este segmento."
            action={
              <Button variant="secondary" leftIcon={<UserPlus className="h-4 w-4" />} onClick={handleOpenCreate}>
                Crear usuario
              </Button>
            }
          />
        ) : (
          <>
            {/* Tabla — visible ≥ md */}
            <div className="hidden md:block">
              <Table caption="Usuarias de la plataforma">
                <THead>
                  <TRow>
                    <TCell head>Usuario &amp; rol</TCell>
                    <TCell head>Estado</TCell>
                    <TCell head>Número y contacto</TCell>
                    <TCell head>Vigencia</TCell>
                    <TCell head>Actividad</TCell>
                    <TCell head className="text-right">
                      Acciones
                    </TCell>
                  </TRow>
                </THead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <TRow key={u.id}>
                      <TCell>
                        <div className="flex items-center gap-3">
                          <Avatar fallbackInitial={u.name.charAt(0)} size="sm" />
                          <div>
                            <p className="font-bold leading-tight text-slate-800">{u.name}</p>
                            <p className="text-xs text-slate-500">{u.email}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              <UserRoles user={u} />
                              {u.anonymizedAt && <Badge tone="neutral">Anonimizada</Badge>}
                              {u.isMinor && (
                                <Badge tone={u.guardianConsentAt ? 'info' : 'warning'}>
                                  {u.guardianConsentAt ? 'Menor con autorización' : 'Menor sin autorización'}
                                </Badge>
                              )}
                              {!u.anonymizedAt && !u.termsAcceptedAt && (
                                <Badge tone="warning">Términos pendientes</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </TCell>
                      <TCell>
                        <div className="flex items-center gap-2.5">
                          <Switch
                            checked={u.status === 'ACTIVO'}
                            onChange={() => (u.status === 'ACTIVO' ? setDeactivateTarget(u) : handleToggleStatus(u))}
                            label={`Cambiar estado de ${u.name}`}
                          />
                          <StatusPill
                            label={u.status === 'ACTIVO' ? 'Activo' : 'Inactivo'}
                            tone={u.status === 'ACTIVO' ? 'success' : 'danger'}
                          />
                        </div>
                      </TCell>
                      <TCell className="text-xs">
                        <p className="font-medium text-slate-700">
                          {numberLabel(u.role)}: {u.memberNumber || 'sin número'}
                        </p>
                        <p className="text-slate-500">{u.phone || 'Sin teléfono'}</p>
                      </TCell>
                      <TCell className="text-xs">
                        <p>
                          <span className="font-semibold text-slate-700">Inicio del acceso: </span>
                          {u.startDate ? formatDate(u.startDate) : 'Indefinido'}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-700">Fin del acceso: </span>
                          {u.endDate ? formatDate(u.endDate) : 'Sin límite'}
                        </p>
                      </TCell>
                      <TCell className="text-xs">
                        {u.role === 'STUDENT' && (
                          <p>
                            Ingresos: <strong className="text-emerald-700">{u._count.attendances}</strong> · Tareas:{' '}
                            <strong className="text-role-ink">{u._count.submissions}</strong>
                          </p>
                        )}
                        {u.role === 'MENTOR' && (
                          <p>
                            Clases asignadas: <strong className="text-teal-700">{u._count.mentoredClasses}</strong>
                          </p>
                        )}
                        {u.role === 'ADMIN' && <span className="text-slate-500">Acceso total</span>}
                      </TCell>
                      <TCell className="text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(u)}
                            disabled={Boolean(u.anonymizedAt)}
                            className="tap-target rounded-xl p-2 text-role-ink transition-colors hover:bg-role-soft disabled:pointer-events-none disabled:opacity-40"
                            aria-label={`Editar ${u.name}`}
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setResetTarget(u)}
                            disabled={Boolean(u.anonymizedAt) || u.status !== 'ACTIVO' || u.role === 'ADMIN'}
                            className="tap-target rounded-xl p-2 text-slate-500 transition-colors hover:bg-role-soft hover:text-role-ink disabled:pointer-events-none disabled:opacity-40"
                            aria-label={`Restablecer la contraseña de ${u.name}`}
                            title="Restablecer contraseña"
                          >
                            <KeyRound className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setAnonTarget(u)}
                            disabled={Boolean(u.anonymizedAt)}
                            className="tap-target rounded-xl p-2 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:pointer-events-none disabled:opacity-40"
                            aria-label={`Anonimizar a ${u.name}`}
                            title="Anonimizar (derecho de supresión)"
                          >
                            <UserX className="h-4 w-4" />
                          </button>
                        </div>
                      </TCell>
                    </TRow>
                  ))}
                </tbody>
              </Table>
            </div>

            {/* Tarjetas apiladas — < md */}
            <div className="space-y-3 divide-y divide-slate-100 p-3 md:hidden">
              {filteredUsers.map((u) => (
                <div key={u.id} className="rounded-2xl border border-slate-100 p-4">
                  <div className="mb-3 flex items-center gap-3">
                    <Avatar fallbackInitial={u.name.charAt(0)} size="sm" />
                    <div className="flex-1">
                      <p className="font-bold leading-tight text-slate-800">{u.name}</p>
                      <UserRoles user={u} className="mt-1" />
                    </div>
                  </div>
                  <ResponsiveRow
                    columns={[
                      {
                        label: 'Estado',
                        value: (
                          <span className="inline-flex items-center gap-2.5">
                            <Switch
                              checked={u.status === 'ACTIVO'}
                              onChange={() => (u.status === 'ACTIVO' ? setDeactivateTarget(u) : handleToggleStatus(u))}
                              label={`Cambiar estado de ${u.name}`}
                            />
                            <StatusPill
                              label={u.status === 'ACTIVO' ? 'Activo' : 'Inactivo'}
                              tone={u.status === 'ACTIVO' ? 'success' : 'danger'}
                            />
                          </span>
                        ),
                      },
                      { label: numberLabel(u.role), value: u.memberNumber || 'Sin número' },
                      {
                        label: 'Vigencia',
                        value: u.endDate ? formatDate(u.endDate) : 'Sin límite',
                      },
                    ]}
                  />
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleOpenEdit(u)}
                      disabled={Boolean(u.anonymizedAt)}
                      className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-role-soft text-xs font-bold text-role-ink disabled:opacity-40"
                      aria-label={`Editar ${u.name}`}
                    >
                      <Edit3 className="h-4 w-4" />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => setResetTarget(u)}
                      disabled={Boolean(u.anonymizedAt) || u.status !== 'ACTIVO' || u.role === 'ADMIN'}
                      className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-slate-100 text-xs font-bold text-slate-600 disabled:opacity-40"
                      aria-label={`Restablecer la contraseña de ${u.name}`}
                    >
                      <KeyRound className="h-4 w-4" />
                      <span>Clave</span>
                    </button>
                    <button
                      onClick={() => setAnonTarget(u)}
                      disabled={Boolean(u.anonymizedAt)}
                      className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-red-50 text-xs font-bold text-red-600 disabled:opacity-40"
                      aria-label={`Anonimizar a ${u.name}`}
                    >
                      <UserX className="h-4 w-4" />
                      <span>Anonimizar</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      <ConfirmDialog
        open={Boolean(resetTarget)}
        onCancel={() => setResetTarget(null)}
        onConfirm={handleConfirmReset}
        title="¿Restablecer la contraseña?"
        description={
          resetTarget
            ? `Se fijará una contraseña nueva para ${resetTarget.name} (el número de estudiante sin guiones, o un número aleatorio si no tiene). Reemplaza la actual, cierra sus sesiones y deberá cambiarla al entrar.`
            : undefined
        }
        confirmLabel="Restablecer"
        danger={false}
        loading={resetting}
      />

      <Modal
        open={Boolean(resetResult)}
        onClose={() => setResetResult(null)}
        title="Nueva contraseña"
        size="sm"
        footer={<Button onClick={() => setResetResult(null)}>Listo, ya la copié</Button>}
      >
        {resetResult && <PasswordReveal {...resetResult} />}
      </Modal>

      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        onCancel={() => setDeactivateTarget(null)}
        onConfirm={() => {
          if (deactivateTarget) handleToggleStatus(deactivateTarget);
          setDeactivateTarget(null);
        }}
        title="¿Desactivar esta cuenta?"
        description={
          deactivateTarget
            ? `${deactivateTarget.name} no podrá iniciar sesión hasta que la actives de nuevo.`
            : undefined
        }
        confirmLabel="Desactivar"
        danger
      />

      <ConfirmDialog
        open={Boolean(anonTarget)}
        onCancel={() => setAnonTarget(null)}
        onConfirm={handleConfirmAnonymize}
        title="¿Anonimizar esta cuenta?"
        description={
          anonTarget
            ? `Se eliminarán de forma permanente el nombre, correo, número de estudiante, teléfono, foto y archivos entregados de ${anonTarget.name}, y su acceso quedará bloqueado. Esta acción no se puede deshacer.`
            : undefined
        }
        confirmLabel="Anonimizar cuenta"
        loading={anonymizing}
      />

      <UserFormModal
        open={isModalOpen}
        mode={modalMode}
        selectedUser={selectedUser}
        onClose={() => setIsModalOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  );
}

/** Rol principal y roles adicionales de una cuenta. */
function UserRoles({ user, className }: { user: UserItem; className?: string }) {
  return (
    <span className={`inline-flex flex-wrap gap-1 ${className ?? ''}`}>
      <RoleBadge role={user.role} />
      {(user.extraRoles ?? []).map((role) => (
        <RoleBadge key={role} role={role} />
      ))}
    </span>
  );
}
