import type { Requirement } from '@/lib/delivery';

interface Submission {
  id: string;
  submittedAt: string;
  notes: string | null;
  fileUrl: string | null;
  fileType: string | null;
  fileKeys?: string[];
  fileNames?: string[];
  linkUrl?: string | null;
  grade: number | null;
  feedback: string | null;
  gradedAt: string | null;
}

export interface StudentAssignment {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  fileRequirement: Requirement;
  linkRequirement: Requirement;
  textRequirement: Requirement;
  maxFiles: number;
  allowLate: boolean;
  attachmentName?: string | null;
  attachmentUrl?: string | null;
  classSession: { id: string; title: string };
  creator: { name: string };
  submissions: Submission[];
}
