'use client';

import { useEffect, useRef } from 'react';

type Variant = 'brand' | 'admin' | 'mentor' | 'student';
type RGB = [number, number, number];

const PALETTES: Record<Variant, RGB[]> = {
  brand: [
    [217, 70, 239],
    [147, 51, 234],
    [99, 102, 241],
  ],
  admin: [
    [147, 51, 234],
    [99, 102, 241],
    [139, 92, 246],
  ],
  mentor: [
    [20, 184, 166],
    [16, 185, 129],
    [6, 182, 212],
  ],
  student: [
    [217, 70, 239],
    [236, 72, 153],
    [168, 85, 247],
  ],
};

interface Props {
  variant?: Variant;
  intensity?: 'hero' | 'ambient';
  interactive?: boolean;
  contained?: boolean;
  tone?: 'light' | 'dark';
  className?: string;
}

export function ParticleField({
  variant = 'brand',
  intensity = 'ambient',
  interactive = false,
  contained = false,
  tone = 'light',
  className,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const small = window.matchMedia('(max-width: 767px)').matches;
    const hero = intensity === 'hero';
    const lift = (c: RGB): RGB => (tone === 'dark' ? (c.map((v) => Math.round(v + (255 - v) * 0.35)) as RGB) : c);
    const palette = PALETTES[variant].map(lift);
    const alphaK = tone === 'dark' ? 1.3 : 1;

    type P = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      a: number;
      c: RGB;
      tw: number;
      twSpeed: number;
      depth: number;
      sparkle: boolean;
    };
    let ps: P[] = [];
    let w = 0;
    let h = 0;
    let raf = 0;
    let last = 0;
    let running = false;
    let resizeT = 0;
    const mouse = { x: -9999, y: -9999 };
    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    const size = () =>
      contained
        ? { w: canvas.parentElement?.clientWidth ?? 0, h: canvas.parentElement?.clientHeight ?? 0 }
        : { w: window.innerWidth, h: window.innerHeight };

    const build = () => {
      let n = Math.floor((w * h) / (hero ? 13000 : 30000));
      n = Math.min(n, small ? (hero ? 50 : 20) : hero ? 130 : 45);
      if ((navigator.hardwareConcurrency ?? 8) <= 4) n = Math.floor(n * 0.7);
      ps = Array.from({ length: n }, (_, i) => {
        // Profundidad simulada: partículas "cercanas" más grandes, brillantes y rápidas.
        const depth = rand(0.35, 1.4);
        return {
          x: rand(0, w),
          y: rand(0, h),
          vx: rand(-0.12, 0.12) * depth,
          vy: rand(-0.2, -0.03) * depth,
          r: rand(0.7, hero ? 3.2 : 2.2) * depth,
          a: rand(0.2, hero ? 0.75 : 0.6),
          tw: rand(0, Math.PI * 2),
          twSpeed: rand(0.015, 0.045),
          depth,
          sparkle: hero && i % 11 === 0,
          c: palette[Math.floor(Math.random() * palette.length)],
        };
      });
    };

    const resize = (force = false) => {
      const s = size();
      if (!force && s.w === w && Math.abs(s.h - h) < 150) return;
      const dpr = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2);
      w = s.w;
      h = s.h;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    };

    const draw = (dt: number) => {
      ctx.clearRect(0, 0, w, h);
      const link = hero ? 150 : 110;
      const linkA = hero ? 0.24 : 0.14;
      for (const p of ps) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.tw += p.twSpeed * dt;
        if (interactive) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 140 * 140 && d2 > 0.01) {
            const d = Math.sqrt(d2);
            const f = (1 - d / 140) * 0.6;
            p.x += (dx / d) * f * dt;
            p.y += (dy / d) * f * dt;
          }
        }
        if (p.x < -10) p.x = w + 10;
        else if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        else if (p.y > h + 10) p.y = -10;
      }
      ctx.lineWidth = 1;
      for (let i = 0; i < ps.length; i++) {
        for (let j = i + 1; j < ps.length; j++) {
          const a = ps[i];
          const b = ps[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < link * link) {
            const closeness = 1 - Math.sqrt(d2) / link;
            const o = closeness * closeness * linkA * alphaK * ((a.depth + b.depth) / 2);
            const mixed: RGB = [
              Math.round((a.c[0] + b.c[0]) / 2),
              Math.round((a.c[1] + b.c[1]) / 2),
              Math.round((a.c[2] + b.c[2]) / 2),
            ];
            ctx.strokeStyle = `rgba(${mixed[0]},${mixed[1]},${mixed[2]},${o})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Orden por profundidad: las "lejanas" se pintan primero, dando sensación de parallax.
      const painted = hero ? [...ps].sort((a, b) => a.depth - b.depth) : ps;

      for (const p of painted) {
        const twinkle = 0.7 + 0.3 * Math.sin(p.tw);
        const alpha = Math.min(1, p.a * twinkle * alphaK);
        const [r, g, b] = p.c;

        if (hero) {
          // Halo suave detrás de cada partícula para dar profundidad y brillo.
          const glowR = p.r * 4.5;
          const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
          glow.addColorStop(0, `rgba(${r},${g},${b},${alpha * 0.35})`);
          glow.addColorStop(1, `rgba(${r},${g},${b},0)`);
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();

        // Núcleo blanco en las partículas "sparkle" para simular un destello vivo.
        if (p.sparkle && twinkle > 0.92) {
          ctx.fillStyle = `rgba(255,255,255,${(twinkle - 0.92) * 6})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 0.5, 0, Math.PI * 2);
          ctx.fill();

          const flare = p.r * 3.2;
          ctx.strokeStyle = `rgba(255,255,255,${(twinkle - 0.92) * 3})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(p.x - flare, p.y);
          ctx.lineTo(p.x + flare, p.y);
          ctx.moveTo(p.x, p.y - flare);
          ctx.lineTo(p.x, p.y + flare);
          ctx.stroke();
        }
      }
    };

    const loop = (t: number) => {
      if (!running) return;
      const dt = Math.min(t - last, 50) / 16.667;
      last = t;
      draw(dt);
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (reduce || running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const onVis = () => (document.hidden ? stop() : start());
    const onResize = () => {
      window.clearTimeout(resizeT);
      resizeT = window.setTimeout(() => resize(), 150);
    };
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    };
    const onLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };

    resize(true);
    if (reduce) draw(0);
    else start();

    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('resize', onResize);
    if (interactive) {
      window.addEventListener('pointermove', onMove, { passive: true });
      window.addEventListener('pointerleave', onLeave);
    }
    const ro = contained && canvas.parentElement ? new ResizeObserver(() => onResize()) : null;
    if (ro && canvas.parentElement) ro.observe(canvas.parentElement);

    return () => {
      stop();
      window.clearTimeout(resizeT);
      ro?.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerleave', onLeave);
    };
  }, [variant, intensity, interactive, contained, tone]);

  return (
    <canvas
      ref={ref}
      data-fx
      aria-hidden="true"
      className={['pointer-events-none animate-fx-in', contained ? 'absolute inset-0' : 'fixed inset-0 z-fx', className]
        .filter(Boolean)
        .join(' ')}
    />
  );
}
