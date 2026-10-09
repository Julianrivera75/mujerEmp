'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { logClientError } from '@/lib/client-log';

interface ReportModalProps {
  /** Mensaje que se reporta; si es nulo, el cuadro está cerrado. */
  messageId: string | null;
  onClose: () => void;
}

/** Pide el motivo y envía a la administración el reporte de un mensaje recibido. */
export function ReportModal({ messageId, onClose }: ReportModalProps) {
  const { show } = useToast();
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (messageId) {
      setReason('');
      setError('');
    }
  }, [messageId]);

  const submit = async () => {
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/chat/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo enviar el reporte.');
        return;
      }
      show('success', 'Reporte enviado a la administración.');
      onClose();
    } catch (err) {
      logClientError('Error reportando un mensaje:', err);
      setError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal open={messageId !== null} onClose={() => !sending && onClose()} title="Reportar este mensaje" size="sm">
      <div className="space-y-3">
        <p className="text-xs text-slate-600">
          La administración recibirá una copia del mensaje y tu motivo para revisarlo. La otra persona no se entera.
        </p>
        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</div>}
        <label htmlFor="report-reason" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
          ¿Qué pasó?
        </label>
        <textarea
          id="report-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          maxLength={500}
          placeholder="Cuéntanos por qué lo reportas..."
          className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-base text-slate-800 focus:border-role-accent focus:outline-none focus:ring-2 focus:ring-role-accent/20"
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={sending}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={sending} disabled={reason.trim().length < 3}>
            Enviar reporte
          </Button>
        </div>
      </div>
    </Modal>
  );
}
