import { Injectable, inject } from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly message = inject(NzMessageService);

  success(text: string): void {
    this.message.success(text);
  }

  error(text: string): void {
    this.message.error(text);
  }

  warning(text: string): void {
    this.message.warning(text);
  }
}

