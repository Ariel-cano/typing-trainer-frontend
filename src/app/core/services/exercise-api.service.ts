import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Exercise } from '../models';
import { ExerciseCreateRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class ExerciseApiService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Exercise[]> {
    return this.http.get<Exercise[]>(`${this.base}/exercises`);
  }

  getByLevel(levelId: number): Observable<Exercise[]> {
    const params = new HttpParams().set('level_id', String(levelId));
    return this.http.get<Exercise[]>(`${this.base}/exercises`, { params });
  }

  getById(id: number): Observable<Exercise> {
    return this.http.get<Exercise>(`${this.base}/exercises/${id}`);
  }

  create(body: ExerciseCreateRequest): Observable<Exercise> {
    return this.http.post<Exercise>(`${this.base}/exercises`, body);
  }

  update(id: number, body: ExerciseCreateRequest): Observable<Exercise> {
    return this.http.put<Exercise>(`${this.base}/exercises/${id}`, body);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/exercises/${id}`);
  }
}


