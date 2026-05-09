import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Statistic } from '../models';
import { StatisticCreateRequest } from '../models';

type StatisticSingleResponse = {
  statistic: Statistic;
};

type StatisticListResponse = {
  statistics: Statistic[];
};

@Injectable({ providedIn: 'root' })
export class StatisticsApiService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  create(body: StatisticCreateRequest): Observable<Statistic> {
    return this.http
      .post<StatisticSingleResponse>(`${this.base}/statistics`, body)
      .pipe(map((res) => res.statistic));
  }

  getByUser(userId: string): Observable<Statistic[]> {
    return this.http
      .get<StatisticListResponse>(`${this.base}/statistics/users/${userId}`)
      .pipe(map((res) => res.statistics ?? []));
  }

  getByLevel(levelId: string, params?: { limit?: number; offset?: number }): Observable<Statistic[]> {
    let httpParams = new HttpParams();
    if (params?.limit !== undefined) httpParams = httpParams.set('limit', String(params.limit));
    if (params?.offset !== undefined) httpParams = httpParams.set('offset', String(params.offset));

    return this.http
      .get<StatisticListResponse>(`${this.base}/statistics/levels/${levelId}`, { params: httpParams })
      .pipe(map((res) => res.statistics ?? []));
  }
}


