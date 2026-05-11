export interface User {
  id: string;
  login: string;
  role: 'admin' | 'user';
  createdAt?: string;
}

