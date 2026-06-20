export interface Clinic {
  id: string;
  slug: string;
  name: string;
  timezone: string;
  createdAt: string;
}

export interface Doctor {
  id: string;
  clinicId: string;
  slug: string;
  name: string;
  specialization: string;
  avgConsultMinutes: number;
  createdAt: string;
}

export interface Receptionist {
  id: string;
  clinicId: string;
  username: string;
  passwordHash: string;
  createdAt: string;
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
  createdAt: string;
  calledAt: string | null;
  completedAt: string | null;
  estimatedWaitMinutes?: number | null;
  tokensAhead?: number | null;
}

export interface QueueSnapshot {
  clinicId: string;
  clinicName: string;
  doctorId: string;
  doctorName: string;
  avgConsultMinutes: number;
  date: string;
  serving: TokenRecord | null;
  waiting: TokenRecord[];
  done: TokenRecord[];
  skipped: TokenRecord[];
  generatedAt: string;
}
