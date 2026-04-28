import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { AuthApiService } from '../../../../core/services/auth-api.service';
import { AuthStateService } from '../../../../core/services/auth-state.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, NzInputModule, NzButtonModule, NzIconModule, NzAlertModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authApi = inject(AuthApiService);
  private authState = inject(AuthStateService);
  private router = inject(Router);

  form = this.fb.group({
    login: ['', [Validators.required]],
    password: ['', [Validators.required]]
  });

  loading = false;
  error: string | null = null;
  passwordVisible = signal(false);

  onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = null;

    const { login, password } = this.form.value;
    this.authApi.login({ login: login!, password: password! }).subscribe({
      next: (res) => {
        this.authState.login(res.token, login ?? undefined);
        const user = this.authState.currentUser();
        if (user?.role === 'admin') {
          this.router.navigate(['/admin/difficulty']);
        } else {
          this.router.navigate(['/trainer/selection']);
        }
        this.loading = false;
      },
      error: (err) => {
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
