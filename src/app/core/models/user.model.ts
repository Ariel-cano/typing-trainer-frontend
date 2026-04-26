export interface User {
  id: string; // UUID
  login: string; // login: 4-8 chars
  password: string; // password: 4-10 chars
  role: 'admin' | 'user'; // role value from backend
}

