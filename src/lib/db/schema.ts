
export interface Clinic {
  id: string;
  slug: string;
  name: string;
  timezone: string;
  createdAt: any;
}

export interface Doctor {
  id: string;
  clinicId: string;
  slug: string;
  name: string;
  specialization: string;
  avgConsultMinutes: number;
  createdAt: any;
}

export type TokenStatus = 'waiting' | 'serving' | 'done' | 'skipped';

export interface TokenRecord {
  id: string;
  clinicId: string;
  doctorId: string;
  date: string; // YYYY-MM-DD
  tokenNumber: number;
  patientName: string;
  phone: string | null;
  status: TokenStatus;
  createdAt: any;
  calledAt: any | null;
  completedAt: any | null;
}
