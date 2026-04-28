import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { AuthApiService } from '../../../../core/services/auth-api.service';
import { AuthStateService } from '../../../../core/services/auth-state.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, NzInputModule, NzButtonModule, NzIconModule, NzAlertModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
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

  onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = null;

    const { login, password } = this.form.value;

    this.authApi.register({ login: login!, password: password! }).subscribe({
      next: () => {
        this.authApi.login({ login: login!, password: password! }).subscribe({
          next: (res) => {
            this.authState.login(res.token, login ?? undefined);
            this.router.navigate(['/trainer/selection']);
            this.loading = false;
          },
          error: () => {
            this.error = 'Ошибка входа после регистрации';
            this.loading = false;
          }
        });
      },
      error: (err) => {
        const code = err?.error?.error?.code;
        if (err?.status === 409 && code === 'LOGIN_EXISTS') {
          this.error = 'Пользователь с таким логином уже существует';
        } else {
          this.error = 'Ошибка сервера';
        }
        this.loading = false;
      }
    });
  }
}
