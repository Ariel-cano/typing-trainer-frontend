import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { KeyboardZone } from '../models';

@Injectable({ providedIn: 'root' })
export class KeyboardZoneApiService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAll(): Observable<KeyboardZone[]> {
    return this.http.get<KeyboardZone[]>(`${this.base}/keyboard-zones`);
  }
}


