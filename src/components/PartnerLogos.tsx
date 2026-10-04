import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/cn';

interface Partner {
  name: string;
  src: string;
  width: number;
  height: number;
  /** Logo pensado para fondo oscuro: se muestra dentro de una pastilla oscura. */
  dark?: boolean;
}

/** Para sumar una organización aliada basta con agregarla aquí y guardar su logo en public/logos. */
const PARTNERS: Partner[] = [
  {
    name: 'Alcaldía Local de Santa Fe, Bogotá',
    src: '/logos/alcaldia-santa-fe.png',
    width: 360,
    height: 92,
    dark: true,
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

/** Con pocas organizaciones el carrusel no tiene qué recorrer: se muestran quietas y centradas. */
const MIN_FOR_CAROUSEL = 4;
const SECONDS_PER_LOGO = 4;

function PartnerItem({ partner, hidden }: { partner: Partner; hidden?: boolean }) {
  const height = partner.dark ? 28 : 40;
  return (
    <li
      aria-hidden={hidden || undefined}
      className={cn('flex-shrink-0 pr-8 motion-reduce:pr-0', hidden && 'motion-reduce:hidden')}
    >
      <span
        className={cn(
          'flex h-12 items-center justify-center opacity-90 transition-opacity hover:opacity-100',
          partner.dark && 'rounded-xl bg-slate-900 px-3.5',
        )}
      >
        <Image
          src={partner.src}
          alt={hidden ? '' : partner.name}
          width={partner.width}
          height={partner.height}
          style={{ height, width: 'auto' }}
        />
      </span>
    </li>
  );
}

/** Carrusel continuo con los logos de las organizaciones aliadas. */
export function PartnerLogos({ className }: { className?: string }) {
  const carousel = PARTNERS.length >= MIN_FOR_CAROUSEL;

  return (
    <section aria-label="Organizaciones aliadas" className={cn('text-center', className)}>
      <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Con el respaldo de</p>
      <div
        className={cn(
          'glass-card group overflow-hidden rounded-2xl py-3 shadow-soft',
          carousel && '[mask-image:linear-gradient(to_right,transparent,#000_10%,#000_90%,transparent)]',
        )}
      >
        <ul
          style={carousel ? { animationDuration: `${PARTNERS.length * SECONDS_PER_LOGO}s` } : undefined}
          className={cn(
            'flex items-center',
            carousel
              ? 'w-max animate-marquee hover:[animation-play-state:paused] motion-reduce:w-auto motion-reduce:animate-none motion-reduce:flex-wrap motion-reduce:justify-center motion-reduce:gap-x-6 motion-reduce:gap-y-3 motion-reduce:px-4'
              : 'flex-wrap justify-center gap-x-6 gap-y-3 px-4',
          )}
        >
          {PARTNERS.map((partner) => (
            <PartnerItem key={partner.name} partner={partner} />
          ))}
          {carousel &&
            PARTNERS.map((partner) => <PartnerItem key={`${partner.name}-copia`} partner={partner} hidden />)}
        </ul>
      </div>
    </section>
  );
}
