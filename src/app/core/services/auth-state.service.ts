import { Injectable, computed, signal } from '@angular/core';
import { User } from '../models/user.model';

const TOKEN_KEY = 'kbt_token';
const USER_KEY = 'kbt_user';

@Injectable({ providedIn: 'root' })
export class AuthStateService {
  private _token = signal<string | null>(null);
  private _user = signal<User | null>(null);

  readonly token = computed(() => this._token());
  readonly currentUser = computed(() => this._user());
  readonly isAuthenticated = computed(() => !!this._token());
  readonly isAdmin = computed(() => this._user()?.role === 'admin');

  login(token: string, user: User): void {
    this._token.set(token);
    this._user.set(user);
    try {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (e) {
      // ignore localStorage errors
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
      }
    } catch (e) {
      console.warn('AuthStateService: loadFromStorage failed', e);
    }
  }
}

