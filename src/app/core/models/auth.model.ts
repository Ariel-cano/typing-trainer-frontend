import { User } from './user.model';

export interface LoginRequest {
  login: string; // min 4, max 8
  password: string; // min 4, max 10
}

export interface LoginResponse {
  token: string;
}

export interface RegisterRequest {
  login: string; // min 4, max 8
  password: string; // min 4, max 10
}

export interface RegisterResponse {
  user: User;
}
