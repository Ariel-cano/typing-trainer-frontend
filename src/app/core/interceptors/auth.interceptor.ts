import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthStateService } from '../services/auth-state.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthStateService);
  const token = auth.token();

  const urlWithoutQuery = req.url.split('?')[0];
  if (urlWithoutQuery.endsWith('/login') || urlWithoutQuery.endsWith('/register')) {
    return next(req);
  }

  if (token) {
    const cloned = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
    return next(cloned);
  }

  return next(req);
};


