'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { DateField } from '@/components/ui/DateField';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { PasswordReveal } from '@/components/PasswordReveal';
import { ACCOUNT_TYPES, accountTypeOf, isStudentAccount } from '@/lib/account-types';
import { generatePassword } from '@/lib/password-generator';
import { PHONE_HINT, PHONE_LABEL, numberLabel } from '@/lib/labels';
import type { UserItem } from '../types';

export type UserFormData = {
  name: string;
  email: string;
  password: string;
  role: string;
  extraRoles: string[];
  status: string;
  memberNumber: string;
  phone: string;
  startDate: string;
  endDate: string;
  isMinor: boolean;
  guardianName: string;
  guardianContact: string;
  guardianConsent: boolean;
};

interface UserFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  selectedUser: UserItem | null;
  onClose: () => void;
  onSaved: () => void;
}

export function UserFormModal({ open, mode, selectedUser, onClose, onSaved }: UserFormModalProps) {
  const [formData, setFormData] = useState<UserFormData>(() => buildInitialForm(mode, selectedUser));
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmRole, setConfirmRole] = useState(false);
  const [revealed, setRevealed] = useState<{ name: string; email: string; password: string } | null>(null);

  React.useEffect(() => {
    if (open) {
      setFormData(buildInitialForm(mode, selectedUser));
      setErrorMsg('');
      setSubmitting(false);
      setConfirmRole(false);
      setRevealed(null);
    }
  }, [open, mode, selectedUser]);

  // Al crear una cuenta, la contraseña inicial es el número de estudiante sin guiones ni espacios (editable).
  const passwordFromNumber = (value: string) => value.replace(/[^A-Za-z0-9]/g, '');

  const handleStudentNumberChange = (value: string) => {
    setFormData((prev) => {
      const followsNumber = mode === 'create' && isStudent && prev.password === passwordFromNumber(prev.memberNumber);
      return { ...prev, memberNumber: value, password: followsNumber ? passwordFromNumber(value) : prev.password };
    });
  };

  const isStudent = isStudentAccount(formData.role, formData.extraRoles);
  const accountType = accountTypeOf(formData.role, formData.extraRoles);

  const handleAccountTypeChange = (value: string) => {
    const type = ACCOUNT_TYPES.find((t) => t.value === value);
    if (!type) return;
    setFormData((prev) => ({ ...prev, role: type.role, extraRoles: [...type.extraRoles] }));
  };

  const roleChanged = mode === 'edit' && selectedUser !== null && formData.role !== selectedUser.role;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roleChanged) {
      setConfirmRole(true);
      return;
    }
    save();
  };

  const save = async () => {
    setSubmitting(true);
    setErrorMsg('');

    try {
      const url = '/api/admin/users';
      const method = mode === 'create' ? 'POST' : 'PUT';
      const payload = mode === 'create' ? formData : { ...formData, id: selectedUser?.id };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Error al guardar el usuario.');
        setSubmitting(false);
        return;
      }

      // El componente sigue montado tras guardar: sin esto el botón quedaba cargando la próxima vez que se abre.
      setSubmitting(false);
      if (formData.password.trim()) {
        // La contraseña solo se puede ver ahora: se muestra antes de cerrar.
        setRevealed({ name: formData.name, email: formData.email, password: formData.password.trim() });
        return;
      }
      onSaved();
    } catch (err) {
      setErrorMsg('Error al conectar con el servidor.');
      setSubmitting(false);
    }
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={mode === 'create' ? 'Crear nuevo usuario' : 'Editar usuario'}
        size="md"
      >
        {errorMsg && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{errorMsg}</div>
        )}

        {revealed && (
          <div className="space-y-4">
            <p className="text-sm text-slate-700">
              {mode === 'create' ? 'La cuenta se creó correctamente.' : 'Los cambios se guardaron.'}
            </p>
            <PasswordReveal {...revealed} />
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  setRevealed(null);
                  onSaved();
                }}
              >
                Listo, ya la copié
              </Button>
            </div>
          </div>
        )}

        <form id="user-form" hidden={Boolean(revealed)} onSubmit={handleSubmit} className="space-y-4 text-left">
          <Input
            label="Nombre completo"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Correo electrónico"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <div className="space-y-1.5">
              <PasswordInput
                label={mode === 'create' ? 'Contraseña' : 'Nueva contraseña (opcional)'}
                required={mode === 'create'}
                placeholder={mode === 'edit' ? 'Dejar en blanco para no cambiar' : ''}
                autoComplete="new-password"
                hint={
                  formData.password
                    ? 'La persona deberá cambiarla en su primer ingreso.'
                    : mode === 'edit'
                      ? 'Escribe una nueva o genera una para cambiarla.'
                      : undefined
                }
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setFormData({ ...formData, password: generatePassword() })}
                className="text-xs font-bold text-role-ink hover:underline"
              >
                Generar contraseña
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              label="Tipo de cuenta"
              value={accountType}
              onChange={(e) => handleAccountTypeChange(e.target.value)}
            >
              {ACCOUNT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
              {accountType === 'CUSTOM' && <option value="CUSTOM">Personalizado (actual)</option>}
            </Select>
            <Select
              label="Estado de acceso"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="ACTIVO">Activo (permite ingreso)</option>
              <option value="INACTIVO">Inactivo (bloquea ingreso)</option>
            </Select>
          </div>
          {isStudent && (
            <p className="-mt-2 text-xs text-slate-500">Quedará inscrita automáticamente en las clases vigentes.</p>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label={numberLabel(formData.role as 'STUDENT' | 'MENTOR' | 'ADMIN')}
              placeholder="Ej: 044-100526"
              hint={
                isStudent
                  ? 'Sale en los certificados. Al crear la cuenta se propone como contraseña inicial.'
                  : 'Número de identificación en la plataforma (opcional).'
              }
              value={formData.memberNumber}
              onChange={(e) => handleStudentNumberChange(e.target.value)}
            />
            <Input
              label={PHONE_LABEL}
              hint={PHONE_HINT}
              placeholder="Ej: +1 305 555 0123"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 rounded-2xl border border-role-accent/15 bg-role-soft p-4">
            <DateField
              label="Inicio del acceso"
              value={formData.startDate}
              onChange={(value) => setFormData({ ...formData, startDate: value })}
              help="Desde este día la persona puede iniciar sesión. Antes no podrá ingresar."
            />
            <DateField
              label="Fin del acceso (opcional)"
              value={formData.endDate}
              onChange={(value) => setFormData({ ...formData, endDate: value })}
              help="Después de este día ya no podrá ingresar. Déjalo vacío para no limitarlo."
            />
          </div>
          <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
            <div className="flex items-start gap-3">
              <input
                id="user-is-minor"
                type="checkbox"
                checked={formData.isMinor}
                onChange={(e) => setFormData({ ...formData, isMinor: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded"
              />
              <div>
                <label htmlFor="user-is-minor" className="cursor-pointer text-sm font-bold text-slate-700">
                  Es menor de 18 años
                </label>
                <p className="text-xs text-slate-500">
                  Su acceso solo se habilita cuando se registra la autorización de su representante legal (Ley 1581 de
                  2012, art. 7).
                </p>
              </div>
            </div>

            {formData.isMinor && (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input
                    label="Representante legal"
                    placeholder="Nombre completo"
                    value={formData.guardianName}
                    onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                  />
                  <Input
                    label="Contacto del representante"
                    placeholder="Correo o teléfono"
                    value={formData.guardianContact}
                    onChange={(e) => setFormData({ ...formData, guardianContact: e.target.value })}
                  />
                </div>
                <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.guardianConsent}
                    onChange={(e) => setFormData({ ...formData, guardianConsent: e.target.checked })}
                    className="mt-0.5 h-4 w-4 rounded"
                  />
                  <span>
                    Confirmo que recibí la autorización expresa del representante legal para el tratamiento de los datos
                    de esta persona.
                  </span>
                </label>
              </>
            )}
          </div>
        </form>

        {!revealed && (
          <div className="mt-5 flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
            <Button variant="ghost" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" form="user-form" loading={submitting}>
              {mode === 'create' ? 'Guardar usuario' : 'Actualizar usuario'}
            </Button>
          </div>
        )}
      </Modal>
      <ConfirmDialog
        open={confirmRole}
        onCancel={() => setConfirmRole(false)}
        onConfirm={() => {
          setConfirmRole(false);
          save();
        }}
        title="¿Cambiar el rol de esta cuenta?"
        description="El cambio modifica de inmediato los permisos y las pantallas a las que tiene acceso."
        confirmLabel="Cambiar rol"
        danger={false}
      />
    </>
  );
}

function buildInitialForm(mode: 'create' | 'edit', user: UserItem | null): UserFormData {
  if (mode === 'edit' && user) {
    return {
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      extraRoles: user.extraRoles ?? [],
      status: user.status,
      memberNumber: user.memberNumber || '',
      phone: user.phone || '',
      startDate: user.startDate ? new Date(user.startDate).toISOString().split('T')[0] : '',
      endDate: user.endDate ? new Date(user.endDate).toISOString().split('T')[0] : '',
      isMinor: user.isMinor,
      guardianName: user.guardianName || '',
      guardianContact: user.guardianContact || '',
      guardianConsent: Boolean(user.guardianConsentAt),
    };
  }
  return {
    name: '',
    email: '',
    password: '',
    role: 'STUDENT',
    extraRoles: [],
    status: 'ACTIVO',
    memberNumber: '',
    phone: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    isMinor: false,
    guardianName: '',
    guardianContact: '',
    guardianConsent: false,
  };
}
