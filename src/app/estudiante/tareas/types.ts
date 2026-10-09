import type { DeliveryType } from '@/lib/delivery';

interface Submission {
  id: string;
  submittedAt: string;
  notes: string | null;
  fileUrl: string | null;
  fileType: string | null;
  grade: number | null;
  feedback: string | null;
  gradedAt: string | null;
}

export interface StudentAssignment {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  deliveryType: DeliveryType;
  notesRequired: boolean;
  allowLate: boolean;
  attachmentName?: string | null;
  attachmentUrl?: string | null;
  classSession: { id: string; title: string };
  creator: { name: string };
  submissions: Submission[];
}
