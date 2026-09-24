'use client';

import React, { useState } from 'react';
import { FileText, PlusCircle, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import FileUpload from '@/components/FileUpload';
import FileLink from '@/components/FileLink';
import type { MentorClass } from '../types';

interface ResourcesModalProps {
  cls: MentorClass | null;
  onClose: () => void;
  onUpdated: (updated: MentorClass) => void;
}

export function ResourcesModal({ cls, onClose, onUpdated }: ResourcesModalProps) {
  const [title, setTitle] = useState('');
  const [link, setLink] = useState('');
  const [uploadedKey, setUploadedKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const { show } = useToast();

  const reset = () => {
    setTitle('');
    setLink('');
    setUploadedKey(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cls) return;
    setSaving(true);
    try {
      const res = await fetch('/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          uploadedKey
            ? { classId: cls.id, title, type: 'DOCUMENT', url: uploadedKey }
            : { classId: cls.id, title, type: 'LINK', url: link },
        ),
      });
      const data = await res.json();
      if (res.ok) {
        onUpdated({ ...cls, resources: [...cls.resources, data.resource] });
        reset();
        show('success', 'Material agregado.');
      } else {
        show('error', data.error || 'No se pudo agregar el material.');
      }
    } catch (err) {
      show('error', 'Error de conexión al agregar el material.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!cls || !deleteTarget) return;
    try {
      const res = await fetch(`/api/resources?id=${deleteTarget}`, { method: 'DELETE' });
      if (res.ok) {
        onUpdated({ ...cls, resources: cls.resources.filter((r) => r.id !== deleteTarget) });
        show('success', 'Material eliminado.');
      } else {
        show('error', 'No se pudo eliminar el material.');
      }
    } catch (err) {
      show('error', 'Error de conexión al eliminar el material.');
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <>
      <Modal
        open={Boolean(cls)}
        onClose={handleClose}
        title="Materiales de clase"
        description={cls ? `Clase: ${cls.title}` : undefined}
      >
        <div className="mb-5 max-h-56 space-y-2 overflow-y-auto">
          {cls?.resources.length === 0 ? (
            <p className="py-3 text-center text-xs italic text-slate-400">Sin materiales agregados todavía.</p>
          ) : (
            cls?.resources.map((res) => (
              <div
                key={res.id}
                className="flex items-center justify-between rounded-xl border border-role-accent/15 bg-role-soft p-2.5 text-xs"
              >
                <FileLink
                  fileUrl={res.url}
                  isStoredFile={res.type === 'DOCUMENT'}
                  className="flex items-center gap-1.5 font-bold text-slate-800 hover:text-role-accent"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span className="max-w-[220px] truncate">{res.title}</span>
                </FileLink>
                <button
                  onClick={() => setDeleteTarget(res.id)}
                  className="ml-2 text-slate-400 hover:text-red-600"
                  aria-label={`Eliminar ${res.title}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleAdd} className="space-y-3 border-t border-slate-100 pt-3">
          <Input
            label="Título del material"
            required
            placeholder="Ej: Guía de ejercicios — Módulo 3"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Input
            label="Enlace (Drive, Canva, etc.)"
            type="url"
            placeholder="https://drive.google.com/..."
            value={link}
            disabled={Boolean(uploadedKey)}
            onChange={(e) => {
              setLink(e.target.value);
              if (e.target.value) setUploadedKey(null);
            }}
          />

          <div className="flex items-center">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="px-2 text-[10px] font-bold uppercase text-slate-400">o subí un archivo</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <FileUpload
            category="resource"
            accept=".pdf,image/png,image/jpeg,image/webp"
            label="Subir PDF o imagen (máx. 25 MB)"
            onUploaded={(key) => {
              setUploadedKey(key);
              setLink('');
            }}
          />

          <Button
            type="submit"
            loading={saving}
            disabled={!title || (!link && !uploadedKey)}
            className="w-full"
            leftIcon={<PlusCircle className="h-4 w-4" />}
          >
            Agregar material
          </Button>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="¿Eliminar este material?"
        description="Las estudiantes ya no podrán verlo en el repositorio de la clase."
        confirmLabel="Eliminar"
      />
    </>
  );
}
