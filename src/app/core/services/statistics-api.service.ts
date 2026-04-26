import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Statistic } from '../models';
import { StatisticCreateRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class StatisticsApiService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  create(body: StatisticCreateRequest): Observable<Statistic> {
    return this.http.post<Statistic>(`${this.base}/statistics`, body);
  }

  getByUser(userId: number): Observable<Statistic[]> {
    const params = new HttpParams().set('user_id', String(userId));
    return this.http.get<Statistic[]>(`${this.base}/statistics`, { params });
  }

  getByLevel(levelId: number): Observable<Statistic[]> {
    const params = new HttpParams().set('level_id', String(levelId));
    return this.http.get<Statistic[]>(`${this.base}/statistics`, { params });
  }
}


