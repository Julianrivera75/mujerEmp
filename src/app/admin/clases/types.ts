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
  status: string;
}
