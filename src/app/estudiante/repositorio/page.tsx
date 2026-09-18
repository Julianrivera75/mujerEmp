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
        console.error('Error cargando repositorio:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <Badge tone="danger" className="mb-2">
          <Youtube className="w-3.5 h-3.5" />
          <span>Biblioteca audiovisual</span>
        </Badge>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-800">Repositorio de clases grabadas</h1>
        <p className="text-slate-500 text-sm mt-1">
          Repasa las clases dictadas por tus mentoras cuando lo desees, reproduce los videos y descarga materiales de estudio.
        </p>
      </div>

      {loading ? (
        <SkeletonCard />
      ) : classes.length === 0 ? (
        <Card variant="glass" className="p-0">
          <EmptyState icon={BookOpen} title="Aún no hay clases registradas en el repositorio" />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {selectedClass ? (
              <>
                <YouTubeEmbed url={selectedClass.youtubeUrl} title={selectedClass.title} notes={selectedClass.recordingNotes} />

                <Card variant="glass" className="p-6 space-y-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">{selectedClass.title}</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Impartida por: <strong className="text-teal-700">{selectedClass.mentor.name}</strong> · Fecha de la sesión:{' '}
                      {new Date(selectedClass.dateStart).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>

                  {selectedClass.description && (
                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/70 p-4 rounded-2xl border border-slate-100">{selectedClass.description}</p>
                  )}

                  {selectedClass.resources.length > 0 && (
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">Materiales y recursos adjuntos</h3>
                      <div className="space-y-2">
                        {selectedClass.resources.map((res) => (
                          <FileLink
                            key={res.id}
                            fileUrl={res.url}
                            isStoredFile={res.type === 'DOCUMENT'}
                            className="flex items-center justify-between p-3 rounded-xl bg-role-soft hover:brightness-95 border border-role-accent/15 text-xs font-bold text-slate-800 transition-colors"
                          >
                            <span className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-role-accent" />
                              <span>{res.title}</span>
                            </span>
                            <ExternalLink className="w-3.5 h-3.5 text-role-accent" />
                          </FileLink>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              </>
            ) : (
              <div className="p-8 text-center text-slate-400">Selecciona una clase para reproducir.</div>
            )}
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-500 px-1">Lista de clases grabadas ({classes.length})</h2>

            <div className="space-y-2.5 max-h-[800px] overflow-y-auto pr-1">
              {classes.map((cls) => {
                const isSelected = selectedClass?.id === cls.id;
                return (
                  <button
                    key={cls.id}
                    onClick={() => setSelectedClass(cls)}
                    className={cn(
                      'w-full text-left p-4 rounded-2xl transition-all border flex flex-col justify-between',
                      isSelected ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lift border-red-400' : 'bg-white hover:bg-red-50/40 border-slate-100 text-slate-800',
                    )}
                  >
                    <div className="flex items-center justify-between mb-1.5 w-full">
                      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600')}>
                        {new Date(cls.dateStart).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </span>
                      {cls.youtubeUrl ? (
                        <span className={cn('inline-flex items-center gap-1 text-[11px] font-bold', isSelected ? 'text-white' : 'text-red-600')}>
                          <PlayCircle className="w-3.5 h-3.5" />
                          <span>Video listo</span>
                        </span>
                      ) : (
                        <span className={cn('text-[10px] italic', isSelected ? 'text-white/70' : 'text-slate-400')}>Próximamente</span>
                      )}
                    </div>
                    <h3 className="font-bold text-xs leading-snug line-clamp-2">{cls.title}</h3>
                    <p className={cn('text-[11px] mt-1', isSelected ? 'text-red-100' : 'text-slate-400')}>{cls.mentor.name}</p>
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
