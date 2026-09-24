'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import type { UserItem } from '../types';

export type UserFormData = {
  name: string;
  email: string;
  password: string;
  role: string;
  status: string;
  documentId: string;
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

  React.useEffect(() => {
    if (open) {
      setFormData(buildInitialForm(mode, selectedUser));
      setErrorMsg('');
    }
  }, [open, mode, selectedUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      onSaved();
    } catch (err) {
      setErrorMsg('Error al conectar con el servidor.');
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={mode === 'create' ? 'Crear nuevo usuario' : 'Editar usuario'} size="md">
      {errorMsg && <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200">{errorMsg}</div>}

      <form id="user-form" onSubmit={handleSubmit} className="space-y-4 text-left">
        <Input
          label="Nombre completo"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Correo electrónico"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <Input
            label={mode === 'create' ? 'Contraseña' : 'Nueva contraseña (opcional)'}
            type="password"
            required={mode === 'create'}
            placeholder={mode === 'edit' ? 'Dejar en blanco para no cambiar' : '••••••'}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select label="Rol en la plataforma" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
            <option value="STUDENT">Estudiante</option>
            <option value="MENTOR">Mentor(a)</option>
            <option value="ADMIN">Administrador</option>
          </Select>
          <Select label="Estado de acceso" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
            <option value="ACTIVO">Activo (permite ingreso)</option>
            <option value="INACTIVO">Inactivo (bloquea ingreso)</option>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Documento de identidad"
            placeholder="Ej: CC-12345678"
            value={formData.documentId}
            onChange={(e) => setFormData({ ...formData, documentId: e.target.value })}
          />
          <Input
            label="Teléfono de contacto"
            placeholder="Ej: +57 300 000 0000"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-role-soft border border-role-accent/15">
          <Input
            label="Fecha de inicio"
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
          />
          <Input
            label="Fecha de finalización"
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
          />
        </div>
        <div className="p-4 rounded-2xl border border-slate-200 space-y-3">
          <label className="flex items-start gap-3 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isMinor}
              onChange={(e) => setFormData({ ...formData, isMinor: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded"
            />
            <span>
              <strong>Es menor de 18 años.</strong>
              <span className="block text-xs text-slate-500">
                Su acceso solo se habilita cuando se registra la autorización de su representante legal (Ley 1581 de 2012, art. 7).
              </span>
            </span>
          </label>

          {formData.isMinor && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <label className="flex items-start gap-3 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.guardianConsent}
                  onChange={(e) => setFormData({ ...formData, guardianConsent: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded"
                />
                <span>Confirmo que recibí la autorización expresa del representante legal para el tratamiento de los datos de esta persona.</span>
              </label>
            </>
          )}
        </div>
      </form>

      <div className="flex items-center justify-end gap-3 pt-5 mt-5 border-t border-slate-100">
        <Button variant="ghost" onClick={onClose} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" form="user-form" loading={submitting}>
          {mode === 'create' ? 'Guardar usuario' : 'Actualizar usuario'}
        </Button>
      </div>
    </Modal>
  );
}

function buildInitialForm(mode: 'create' | 'edit', user: UserItem | null): UserFormData {
  if (mode === 'edit' && user) {
    return {
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      status: user.status,
      documentId: user.documentId || '',
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
    status: 'ACTIVO',
    documentId: '',
    phone: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString().split('T')[0],
    isMinor: false,
    guardianName: '',
    guardianContact: '',
    guardianConsent: false,
  };
}
