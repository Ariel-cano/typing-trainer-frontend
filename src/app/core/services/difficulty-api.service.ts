import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DifficultyLevel } from '../models';
import { DifficultyLevelCreateRequest } from '../models';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class DifficultyApiService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAll(): Observable<DifficultyLevel[]> {
    return this.http
      .get<{ difficulty_levels: DifficultyLevel[] }>(`${this.base}/difficulty-levels`)
      .pipe(map((response) => response.difficulty_levels ?? []));
  }

  getById(id: string): Observable<DifficultyLevel> {
     return this.http
      .get<{ difficulty_level: DifficultyLevel }>(`${this.base}/difficulty-levels/${id}`)
      .pipe(map((response) => response.difficulty_level));
  }

  create(body: DifficultyLevelCreateRequest): Observable<DifficultyLevel> {
    return this.http
      .post<{ difficulty_level: DifficultyLevel }>(`${this.base}/difficulty-levels`, body)
      .pipe(map((response) => response.difficulty_level));
  }

  update(id: string, body: DifficultyLevelCreateRequest): Observable<DifficultyLevel> {
    return this.http
      .patch<{ difficulty_level: DifficultyLevel }>(`${this.base}/difficulty-levels/${id}`, body)
      .pipe(map((response) => response.difficulty_level));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/difficulty-levels/${id}`);
  }
}
