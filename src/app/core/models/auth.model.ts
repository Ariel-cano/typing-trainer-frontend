export interface LoginRequest {
  login: string;
  password: string;
}

export interface LoginResponse {
  token: string;
}

export interface RegisterRequest {
  login: string;
  password: string;
}

export interface RegisterUserResponse {
  id: string;
  login: string;
  role: 'admin' | 'user';
  createdAt: string;
}

export interface RegisterResponse {
  user: RegisterUserResponse;
}
