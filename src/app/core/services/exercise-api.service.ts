import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Exercise, ExerciseCreateRequest } from '../models';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ExerciseApiService {
  private base = environment.apiUrl;
  private readonly http = inject(HttpClient);

  getAll(): Observable<Exercise[]> {
    return this.http
      .get<{ exercises: Exercise[] }>(`${this.base}/exercises`)
      .pipe(map((response) => response.exercises ?? []));
  }

  getByLevel(levelId: string): Observable<Exercise[]> {
    const params = new HttpParams().set('level_id', String(levelId));
    return this.http
      .get<{ exercises: Exercise[] }>(`${this.base}/exercises`, { params })
      .pipe(map((response) => response.exercises ?? []));
  }

  getById(id: string): Observable<Exercise> {
    return this.http
      .get<{ exercise: Exercise }>(`${this.base}/exercises/${id}`)
      .pipe(map((response) => response.exercise));
  }

  create(body: ExerciseCreateRequest): Observable<Exercise> {
    return this.http
      .post<{ exercise: Exercise }>(`${this.base}/exercises`, body)
      .pipe(map((response) => response.exercise));
  }

  update(id: string, body: ExerciseCreateRequest): Observable<Exercise> {
    return this.http
      .patch<{ exercise: Exercise }>(`${this.base}/exercises/${id}`, body)
      .pipe(map((response) => response.exercise));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/exercises/${id}`);
  }
}
