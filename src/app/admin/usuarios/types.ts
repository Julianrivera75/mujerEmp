export interface UserItem {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MENTOR' | 'STUDENT';
  status: 'ACTIVO' | 'INACTIVO';
  documentId: string | null;
  phone: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  isMinor: boolean;
  guardianName: string | null;
  guardianContact: string | null;
  guardianConsentAt: string | null;
  termsAcceptedAt: string | null;
  anonymizedAt: string | null;
  _count: {
    attendances: number;
    enrolledClasses: number;
    mentoredClasses: number;
    submissions: number;
  };
}
