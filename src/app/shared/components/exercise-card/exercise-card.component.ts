import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { Exercise } from '../../../core/models';

@Component({
  selector: 'app-exercise-card',
  standalone: true,
  imports: [CommonModule, NzButtonModule, NzCardModule, NzIconModule],
  templateUrl: './exercise-card.component.html',
  styleUrls: ['./exercise-card.component.scss']
})
export class ExerciseCardComponent {
  @Input({ required: true }) exercise!: Exercise;
  @Output() edit = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();
  @Input() order!: number;
  @Input() mode: 'admin' | 'trainee' = 'admin';
  @Input() durationSeconds?: number | null;

  get previewText(): string {
    const text = this.exercise?.text ?? '';
    if (text.length <= 60) {
      return text;
    }
    return `${text.slice(0, 60)}...`;
  }

  get formattedDuration(): string {
    const total = Math.max(0, Math.ceil(this.durationSeconds ?? 0));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}
