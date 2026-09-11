'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import YouTubeEmbed from '@/components/YouTubeEmbed';
import { 
  BookOpen, 
  Youtube, 
  Calendar, 
  Clock, 
  FileText, 
  Download, 
  ExternalLink,
  Loader2,
  PlayCircle,
  Video
} from 'lucide-react';

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
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [classes, setClasses] = useState<ClassSessionWithResources[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassSessionWithResources | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [meRes, classesRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/classes'),
        ]);

        const meData = await meRes.json();
        setCurrentUser(meData.user);

        const classesData = await classesRes.json();
        const allClasses: ClassSessionWithResources[] = classesData.classes || [];
        setClasses(allClasses);

        // Seleccionar por defecto la primera clase que tenga YouTube o la primera
        const withYoutube = allClasses.find((c) => c.youtubeUrl);
        setSelectedClass(withYoutube || allClasses[0] || null);
      } catch (err) {
        console.error('Error cargando repositorio:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {currentUser && <Navbar user={currentUser} />}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Encabezado */}
        <div className="mb-8">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold uppercase tracking-wider mb-2">
            <Youtube className="w-4 h-4" />
            <span>Biblioteca Audiovisual</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800">
            Repositorio de Clases Grabadas en YouTube
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Repasa todas las clases dictadas por tus mentoras cuando lo desees, reproduce los videos directamente aquí y descarga materiales de estudio.
          </p>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3 text-red-500" />
            <p>Cargando grabaciones del repositorio...</p>
          </div>
        ) : classes.length === 0 ? (
          <div className="glass-card rounded-3xl p-12 text-center text-slate-500 border border-white">
            <BookOpen className="w-12 h-12 mx-auto text-purple-300 mb-2" />
            <p className="font-bold text-slate-700">Aún no hay clases registradas en el repositorio.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Reproductor de YouTube y Detalles de la Clase Seleccionada */}
            <div className="lg:col-span-2 space-y-6">
              {selectedClass ? (
                <>
                  <YouTubeEmbed
                    url={selectedClass.youtubeUrl}
                    title={selectedClass.title}
                    notes={selectedClass.recordingNotes}
                  />

                  {/* Descripción y Materiales descargables */}
                  <div className="glass-card rounded-3xl p-6 border border-white shadow-lg space-y-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">{selectedClass.title}</h2>
                      <p className="text-xs text-slate-500 mt-1">
                        Impartida por: <strong className="text-teal-700">{selectedClass.mentor.name}</strong> • Fecha de la sesión: {new Date(selectedClass.dateStart).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>

                    {selectedClass.description && (
                      <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
                        {selectedClass.description}
                      </p>
                    )}

                    {/* Materiales y Recursos */}
                    {selectedClass.resources && selectedClass.resources.length > 0 && (
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                          Materiales y Recursos Adjuntos:
                        </h3>
                        <div className="space-y-2">
                          {selectedClass.resources.map((res) => (
                            <a
                              key={res.id}
                              href={res.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-between p-3 rounded-xl bg-purple-50/60 hover:bg-purple-100/80 border border-purple-100 text-xs font-bold text-purple-900 transition-colors"
                            >
                              <div className="flex items-center space-x-2">
                                <FileText className="w-4 h-4 text-purple-600" />
                                <span>{res.title}</span>
                              </div>
                              <ExternalLink className="w-3.5 h-3.5 text-purple-500" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-slate-400">Selecciona una clase para reproducir.</div>
              )}
            </div>

            {/* Lista Lateral de Clases Disponibles */}
            <div className="space-y-3">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-500 px-1">
                Lista de Clases Grabadas ({classes.length})
              </h2>

              <div className="space-y-2.5 max-h-[800px] overflow-y-auto pr-1">
                {classes.map((cls) => {
                  const isSelected = selectedClass?.id === cls.id;
                  const hasYoutube = !!cls.youtubeUrl;

                  return (
                    <button
                      key={cls.id}
                      onClick={() => setSelectedClass(cls)}
                      className={`w-full text-left p-4 rounded-2xl transition-all border flex flex-col justify-between ${
                        isSelected
                          ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/20 border-red-400'
                          : 'bg-white hover:bg-red-50/40 border-slate-100 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5 w-full">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {new Date(cls.dateStart).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        </span>

                        {hasYoutube ? (
                          <span className={`inline-flex items-center space-x-1 text-[11px] font-bold ${
                            isSelected ? 'text-white' : 'text-red-600'
                          }`}>
                            <PlayCircle className="w-3.5 h-3.5" />
                            <span>Video listo</span>
                          </span>
                        ) : (
                          <span className={`text-[10px] italic ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>
                            Próximamente
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-xs leading-snug line-clamp-2">{cls.title}</h3>
                      <p className={`text-[11px] mt-1 ${isSelected ? 'text-red-100' : 'text-slate-400'}`}>
                        {cls.mentor.name}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
