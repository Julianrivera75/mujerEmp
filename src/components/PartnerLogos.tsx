import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/cn';

interface Partner {
  name: string;
  src: string;
  width: number;
  height: number;
  /** Logos pensados para fondo oscuro se muestran sobre una base oscura. */
  dark?: boolean;
  /** El logo ya trae su propio fondo de color: no lleva base ni margen. */
  bare?: boolean;
}

const PARTNERS: Partner[] = [
  {
    name: 'Alcaldía Local de Santa Fe, Bogotá',
    src: '/logos/alcaldia-santa-fe.png',
    width: 360,
    height: 128,
    bare: true,
  },
  { name: 'Fundación Voces Poderosas', src: '/logos/voces-poderosas.png', width: 360, height: 155 },
  { name: 'Impacto 360', src: '/logos/impacto-360.png', width: 360, height: 360 },
  { name: 'CUC University', src: '/logos/cuc-university.png', width: 360, height: 107, dark: true },
  { name: 'Lyda Correa by BusinessVitalityUs', src: '/logos/lyda-correa.png', width: 360, height: 170, dark: true },
  {
    name: 'Museo Empresarial & Cultural Colombia',
    src: '/logos/museo-empresarial-cultural.png',
    width: 360,
    height: 143,
  },
  { name: 'Mujeres en Break', src: '/logos/mujeres-en-break.png', width: 300, height: 331 },
  { name: "Mago's Apple Fix Miami", src: '/logos/magos-apple-fix.png', width: 240, height: 243, dark: true },
];

const TILE_HEIGHT = 44;

/** Franja con los logos de las organizaciones aliadas. */
export function PartnerLogos({ className }: { className?: string }) {
  return (
    <section aria-label="Organizaciones aliadas" className={cn('text-center', className)}>
      <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Con el respaldo de</p>
      <ul className="flex flex-wrap items-center justify-center gap-x-3 gap-y-3">
        {PARTNERS.map((partner) => (
          <li
            key={partner.name}
            className={cn(
              'flex items-center justify-center rounded-xl',
              partner.bare ? '' : 'px-2.5 py-1.5',
              partner.bare
                ? 'overflow-hidden p-0'
                : partner.dark
                  ? 'bg-slate-900'
                  : 'bg-white shadow-soft ring-1 ring-slate-100',
            )}
          >
            <Image
              src={partner.src}
              alt={partner.name}
              width={partner.width}
              height={partner.height}
              style={{ height: TILE_HEIGHT, width: 'auto' }}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
