import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { AuthStateService } from '../services/auth-state.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthStateService);
  const router = inject(Router);
  const message = inject(NzMessageService);

  return next(req).pipe(
    catchError((err: any) => {
      const status = err?.status;

      if (status === 401) {
        try {
          auth.logout();
        } catch {}
        try {
          router.navigate(['/auth/login']);
        } catch {}
        return throwError(() => err);
      }

      if (status === 409 && err?.error?.code === 'LOGIN_EXISTS') {
        return throwError(() => err);
      }

      if (status === 403) {
        try {
          message.error('Недостаточно прав');
        } catch {}
        return throwError(() => err);
      }

      return throwError(() => err);
    })
  );
};

