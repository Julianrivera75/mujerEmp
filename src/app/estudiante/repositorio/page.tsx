'use client';

import React, { useEffect, useState } from 'react';
import YouTubeEmbed from '@/components/YouTubeEmbed';
import FileLink from '@/components/FileLink';
import { BookOpen, Youtube, FileText, ExternalLink, PlayCircle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { formatDateLong, formatDayMonthShort } from '@/lib/format';
import { logClientError } from '@/lib/client-log';

interface ClassSessionWithResources {
  id: string;
  title: string;
  description: string | null;
  dateStart: string;
  dateEnd: string;
  youtubeUrl: string | null;
  recordingNotes: string | null;
  mentor: { name: string; email: string };
  resources: { id: string; title: string; type: string; url: string }[];
}

export default function StudentRepositoryPage() {
  const [classes, setClasses] = useState<ClassSessionWithResources[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassSessionWithResources | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/classes');
        const data = await res.json();
        const allClasses: ClassSessionWithResources[] = data.classes || [];
        setClasses(allClasses);
        const withYoutube = allClasses.find((c) => c.youtubeUrl);
        setSelectedClass(withYoutube || allClasses[0] || null);
      } catch (err) {
        logClientError('Error cargando repositorio:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <Badge tone="danger" className="mb-2">
          <Youtube className="h-3.5 w-3.5" />
          <span>Biblioteca audiovisual</span>
        </Badge>
        <h1 className="font-display text-2xl font-bold text-slate-800 sm:text-3xl">Repositorio de clases grabadas</h1>
        <p className="mt-1 text-sm text-slate-500">
          Repasa las clases dictadas por tus mentoras cuando lo desees, reproduce los videos y descarga materiales de
          estudio.
        </p>
      </div>

      {loading ? (
        <SkeletonCard />
      ) : classes.length === 0 ? (
        <Card variant="glass" className="p-0">
          <EmptyState icon={BookOpen} title="Aún no hay clases registradas en el repositorio" />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {selectedClass ? (
              <>
                <YouTubeEmbed
                  url={selectedClass.youtubeUrl}
                  title={selectedClass.title}
                  notes={selectedClass.recordingNotes}
                />

                <Card variant="glass" className="space-y-4 p-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">{selectedClass.title}</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Impartida por: <strong className="text-teal-700">{selectedClass.mentor.name}</strong> · Fecha de
                      la sesión: {formatDateLong(selectedClass.dateStart)}
                    </p>
                  </div>

                  {selectedClass.description && (
                    <p className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-xs leading-relaxed text-slate-600">
                      {selectedClass.description}
                    </p>
                  )}

                  {selectedClass.resources.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">
                        Materiales y recursos adjuntos
                      </h3>
                      <div className="space-y-2">
                        {selectedClass.resources.map((res) => (
                          <FileLink
                            key={res.id}
                            fileUrl={res.url}
                            isStoredFile={res.type === 'DOCUMENT'}
                            className="flex items-center justify-between rounded-xl border border-role-accent/15 bg-role-soft p-3 text-xs font-bold text-slate-800 transition-colors hover:brightness-95"
                          >
                            <span className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-role-ink" />
                              <span>{res.title}</span>
                            </span>
                            <ExternalLink className="h-3.5 w-3.5 text-role-ink" />
                          </FileLink>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              </>
            ) : (
              <div className="p-8 text-center text-slate-500">Selecciona una clase para reproducir.</div>
            )}
          </div>

          <div className="space-y-3">
            <h2 className="px-1 text-sm font-black uppercase tracking-wider text-slate-500">
              Lista de clases grabadas ({classes.length})
            </h2>

            <div className="max-h-[800px] space-y-2.5 overflow-y-auto pr-1">
              {classes.map((cls) => {
                const isSelected = selectedClass?.id === cls.id;
                return (
                  <button
                    key={cls.id}
                    onClick={() => setSelectedClass(cls)}
                    className={cn(
                      'flex w-full flex-col justify-between rounded-2xl border p-4 text-left transition-all',
                      isSelected
                        ? 'border-red-400 bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lift'
                        : 'border-slate-100 bg-white text-slate-800 hover:bg-red-50/40',
                    )}
                  >
                    <div className="mb-1.5 flex w-full items-center justify-between">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-bold',
                          isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600',
                        )}
                      >
                        {formatDayMonthShort(cls.dateStart)}
                      </span>
                      {cls.youtubeUrl ? (
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 text-[11px] font-bold',
                            isSelected ? 'text-white' : 'text-red-600',
                          )}
                        >
                          <PlayCircle className="h-3.5 w-3.5" />
                          <span>Video listo</span>
                        </span>
                      ) : (
                        <span className={cn('text-[10px] italic', isSelected ? 'text-white/70' : 'text-slate-500')}>
                          Próximamente
                        </span>
                      )}
                    </div>
                    <h3 className="line-clamp-2 text-xs font-bold leading-snug">{cls.title}</h3>
                    <p className={cn('mt-1 text-[11px]', isSelected ? 'text-red-100' : 'text-slate-500')}>
                      {cls.mentor.name}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
