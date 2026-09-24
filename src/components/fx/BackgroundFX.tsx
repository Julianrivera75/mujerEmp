'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { AuroraBackground } from './AuroraBackground';
import { roleFromPathname } from '@/lib/roles';

const ParticleField = dynamic(() => import('./ParticleField').then((m) => m.ParticleField), { ssr: false });

/** Fondo global: montado una sola vez en app/layout.tsx, no se remonta al navegar. */
export default function BackgroundFX() {
  const pathname = usePathname();
  const variant = roleFromPathname(pathname ?? '');

  return (
    <div data-fx aria-hidden="true" className="pointer-events-none fixed inset-0 z-fx">
      <AuroraBackground spotCount={2} />
      <ParticleField variant={variant} intensity="ambient" />
    </div>
  );
}
