'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { logClientError } from '@/lib/client-log';

interface RouteErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/** Contenido común de los límites de error de cada segmento. */
export function RouteError({ error, reset }: RouteErrorProps) {
  useEffect(() => {
    logClientError('Error de la página', error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl py-16">
      <EmptyState
        icon={AlertTriangle}
        title="Algo salió mal"
        description={
          error.digest
            ? `No pudimos mostrar esta página. Si el problema continúa, comparte este código con la administración: ${error.digest}`
            : 'No pudimos mostrar esta página. Intenta de nuevo.'
        }
        action={<Button onClick={reset}>Reintentar</Button>}
      />
    </div>
  );
}
