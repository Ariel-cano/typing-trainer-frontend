import { User } from './user.model';

// auth.loginRequest (Swagger)
export interface LoginRequest {
  login: string; // min 4, max 8
  password: string; // min 4, max 10
}

// auth.LoginResponse (Swagger)
export interface LoginResponse {
  token: string;
}

// auth.registerRequest (Swagger)
export interface RegisterRequest {
  login: string; // min 4, max 8
  password: string; // min 4, max 10
}

// auth.registerUserResponse (Swagger)
export interface RegisterUserResponse {
  id: string;
  login: string;
  role: 'admin' | 'user';
  createdAt?: string; // example in Swagger
}

// auth.registerResponse (Swagger)
export interface RegisterResponse {
  user: RegisterUserResponse;
}
