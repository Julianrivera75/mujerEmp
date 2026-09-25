import { SkeletonCard } from '@/components/ui/Skeleton';

/** Estado de carga común de los segmentos mientras llegan los datos de la página. */
export function RouteLoading() {
  return (
    <div className="space-y-6" role="status" aria-live="polite" aria-label="Cargando contenido">
      <div className="h-10 w-64 animate-pulse rounded-xl bg-slate-200/70" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
