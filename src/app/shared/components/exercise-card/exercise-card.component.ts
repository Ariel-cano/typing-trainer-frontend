import { CommonModule } from '@angular/common';
import {Component, EventEmitter, Input, Output} from '@angular/core';
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

  get previewText(): string {
    const text = this.exercise?.text ?? '';
    if (text.length <= 60) {
      return text;
    }
    return `${text.slice(0, 60)}...`;
  }
}

