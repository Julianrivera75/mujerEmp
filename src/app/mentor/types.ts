export interface MentorClass {
  id: string;
  title: string;
  description: string | null;
  dateStart: string;
  dateEnd: string;
  meetLink: string | null;
  youtubeUrl: string | null;
  recordingNotes: string | null;
  status: string;
  enrollments: { student: { id: string; name: string; email: string; documentId: string | null } }[];
  attendances: { studentId: string; joinedAt: string; student: { name: string } }[];
  assignments: { id: string; title: string; dueDate: string }[];
  resources: { id: string; title: string; type: string; url: string }[];
}
