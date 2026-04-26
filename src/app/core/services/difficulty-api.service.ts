import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DifficultyLevel } from '../models';
import { DifficultyLevelCreateRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class DifficultyApiService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAll(): Observable<DifficultyLevel[]> {
    return this.http.get<DifficultyLevel[]>(`${this.base}/difficulty-levels`);
  }

  getById(id: number): Observable<DifficultyLevel> {
    return this.http.get<DifficultyLevel>(`${this.base}/difficulty-levels/${id}`);
  }

  create(body: DifficultyLevelCreateRequest): Observable<DifficultyLevel> {
    return this.http.post<DifficultyLevel>(`${this.base}/difficulty-levels`, body);
  }

  update(id: number, body: DifficultyLevelCreateRequest): Observable<DifficultyLevel> {
    return this.http.put<DifficultyLevel>(`${this.base}/difficulty-levels/${id}`, body);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/difficulty-levels/${id}`);
  }
}


