import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import {Router, RouterLink} from '@angular/router';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { AuthApiService } from '../../../../core/services/auth-api.service';
import { AuthStateService } from '../../../../core/services/auth-state.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NzFormModule, NzInputModule, NzButtonModule, NzIconModule, NzAlertModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authApi = inject(AuthApiService);
  private authState = inject(AuthStateService);
  private router = inject(Router);

  form = this.fb.group({
    login: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(8)]],
    password: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(10)]]
  });

  loading = false;
  error: string | null = null;
  passwordVisible = signal(false);

  private parseJwt(token: string): any {
    try {
      const payload = token.split('.')[1];
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decodeURIComponent(escape(decoded)));
    } catch {
      return null;
    }
  }

  onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = null;

    const { login, password } = this.form.value;
    this.authApi.login({ login, password } as any).subscribe({
      next: (res: any) => {
        const token = res?.token;
        let user = res?.user;
        if (!user && token) {
          const payload = this.parseJwt(token) || {};
          user = { id: payload.sub || '', login: payload.login || login, password: '', role: payload.role || 'user' };
        }
        if (token && user) {
          this.authState.login(token, user);
          if (user.role === 'admin') {
            this.router.navigate(['/admin/difficulty']);
          } else {
            this.router.navigate(['/trainer/selection']);
          }
        } else {
          this.error = 'Invalid response from server';
        }
        this.loading = false;
      },
      error: (err: any) => {
        if (err?.status === 401) {
          this.error = 'Неверный логин или пароль';
        } else {
          this.error = 'Ошибка сервера';
        }
        this.loading = false;
      }
    });
  }
}

