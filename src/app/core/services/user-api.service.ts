import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { User } from '../models';

@Injectable({ providedIn: 'root' })
export class UserApiService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getUserNameById(userId: string): Observable<User> {
    return this.http
      .get<{ user: User }>(`${this.base}/users/${userId}`)
      .pipe(map((res) => res.user));
  }

}


