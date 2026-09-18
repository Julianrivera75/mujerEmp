export interface Submission {
  id: string;
  submittedAt: string;
  notes: string | null;
  fileUrl: string | null;
  fileType: string | null;
  grade: number | null;
  feedback: string | null;
  student: { id: string; name: string; email: string };
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  classSession: { id: string; title: string };
  submissions: Submission[];
}
