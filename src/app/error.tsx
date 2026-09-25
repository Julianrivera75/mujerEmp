'use client';

import { RouteError } from '@/components/feedback/RouteError';

export default function Error(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="contenido" className="min-h-dvh">
      <RouteError {...props} />
    </main>
  );
}
