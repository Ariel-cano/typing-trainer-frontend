import { Injectable, computed, signal } from '@angular/core';
import { User } from '../models';

const TOKEN_KEY = 'kbt_token';
const USER_KEY = 'kbt_user';

type JwtPayload = {
  user_id?: string;
  login?: string;
  role?: 'admin' | 'user';
};

@Injectable({ providedIn: 'root' })
export class AuthStateService {
  private _token = signal<string | null>(null);
  private _user = signal<User | null>(null);

  readonly token = computed(() => this._token());
  readonly currentUser = computed(() => this._user());
  readonly isAuthenticated = computed(() => !!this._token());
  readonly isAdmin = computed(() => this._user()?.role === 'admin');

  private parseJwt(token: string): JwtPayload | null {
    try {
      const payload = token.split('.')[1];
      if (!payload) return null;
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decoded) as JwtPayload;
    } catch {
      return null;
    }
  }

  login(token: string, fallbackLogin?: string): void {
    const payload = this.parseJwt(token);
    const user: User = {
      id: payload?.user_id ??  '',
      login: payload?.login ?? fallbackLogin ?? '',
      role: payload?.role ?? 'user'
    };

    this._token.set(token);
    this._user.set(user);
    try {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (e) {
      console.warn('AuthStateService: failed to persist auth state', e);
    }
  }

  logout(): void {
    this._token.set(null);
    this._user.set(null);
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch (e) {
      console.warn('AuthStateService: failed to clear storage', e);
    }
  }

  loadFromStorage(): void {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const userJson = localStorage.getItem(USER_KEY);
      if (token) {
        this._token.set(token);
      }
      if (userJson) {
        try {
          const user = JSON.parse(userJson) as User;
          this._user.set(user);
        } catch (e) {
          console.warn('AuthStateService: invalid user in storage', e);
          this._user.set(null);
        }
      } else if (token) {
        const payload = this.parseJwt(token);
        if (payload) {
          const user: User = {
            id: payload.user_id ?? '',
            login: payload.login ?? '',
            role: payload.role ?? 'user'
          };
          this._user.set(user);
        }
      }
    } catch (e) {
      console.warn('AuthStateService: loadFromStorage failed', e);
    }
  }
}

