export interface User {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: Date | null;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Track {
  id: string;
  title: string;
  description: string;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Module {
  id: string;
  title: string;
  content: string;
  trackId: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Submission {
  id: string;
  userId: string;
  moduleId: string;
  code: string;
  status: string;
  feedback: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DefendSession {
  id: string;
  userId: string;
  moduleId: string;
  status: string;
  conversation: any; // JSON string or object
  createdAt: Date;
  updatedAt: Date;
}

export interface WarRoom {
  id: string;
  name: string;
  hostId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRSScore {
  id: string;
  userId: string;
  score: number;
  details: any;
  createdAt: Date;
  updatedAt: Date;
}
