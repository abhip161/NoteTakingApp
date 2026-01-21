export interface User {
  id: string;
  username: string;
  createdAt: number;
}

export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  labels: string[];
  aiSummary?: string;
  createdAt: number;
  updatedAt: number;
}

export type ViewState = 'LIST' | 'EDIT' | 'CREATE';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
