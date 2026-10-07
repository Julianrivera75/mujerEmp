export interface ClassItem {
  id: string;
  title: string;
  description: string | null;
  dateStart: string;
  dateEnd: string;
  meetLink: string | null;
  youtubeUrl: string | null;
  recordingNotes: string | null;
  status: string;
  monthKey: string;
  imageKey?: string | null;
  /** URL firmada de lectura del afiche (vence en 1 hora). */
  imageUrl?: string | null;
  /** Hasta tres fotos de la clase, en orden (claves y URLs firmadas). */
  imageKeys?: string[];
  imageUrls?: string[];
  mentor: { id: string; name: string; email: string };
  enrollments: { student: { id: string; name: string; email: string } }[];
  attendances: { student: { id: string; name: string } }[];
}

export interface SimpleUser {
  id: string;
  name: string;
  email: string;
}

/** Usuaria tal como la devuelve /api/admin/users (solo los campos que usa esta pantalla). */
export interface ManagedUser extends SimpleUser {
  role: string;
  extraRoles?: string[];
  status: string;
}
