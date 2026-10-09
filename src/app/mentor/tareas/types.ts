import type { DeliveryType } from '@/lib/delivery';

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
  deliveryType: DeliveryType;
  notesRequired: boolean;
  allowLate: boolean;
  /** Archivo con las instrucciones (nombre y dirección firmada temporal), si la mentora lo adjuntó. */
  attachmentName?: string | null;
  attachmentUrl?: string | null;
  classSession: { id: string; title: string; _count?: { enrollments: number } };
  creator?: { id: string; name: string };
  submissions: Submission[];
}
