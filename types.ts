export enum UserRole {
  CLIENT = "CLIENT",
  ADMIN = "ADMIN",
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  calendarLinked?: boolean;
}

export interface Appointment {
  id: string;
  clientName: string;
  service: string;
  startTime: string;
  endTime: string;
  status: "confirmed" | "pending" | "cancelled";
  clientEmail?: string; // Email of the client who booked this appointment
}

export interface Service {
  id: string;
  title: string;
  description: string;
  duration: number;
  price: string;
  icon: string;
}

export interface PendingAction {
  type: "create" | "cancel" | "confirm";
  data: any;
  summary: string;
}

export interface TranscriptItem {
  id: string;
  role: "user" | "model";
  text: string;
  isComplete: boolean;
}
