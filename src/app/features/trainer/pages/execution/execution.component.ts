import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { DifficultyLevel, Exercise, KeyboardZone } from '../../../../core/models';
import { DifficultyApiService } from '../../../../core/services/difficulty-api.service';
import { ExerciseApiService } from '../../../../core/services/exercise-api.service';
import { KeyboardZoneApiService } from '../../../../core/services/keyboard-zone-api.service';

@Component({
  selector: 'app-execution',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzIconModule, NzSwitchModule],
  templateUrl: './execution.component.html',
  styleUrls: ['./execution.component.scss']
})
export class ExecutionComponent implements OnInit {
  readonly exercise = signal<Exercise | null>(null);
  readonly level = signal<DifficultyLevel | null>(null);
  readonly zones = signal<KeyboardZone[]>([]);
  readonly tokens = signal<string[]>([]);

  readonly charactersTyped = signal(0);
  readonly errors = signal(0);
  readonly timerDisplay = signal('00:00');

  readonly charactersTotal = computed(() => this.tokens().length);
  readonly allowedMistakes = computed(() => this.level()?.allowed_mistakes ?? 0);

  readonly musicEnabled = signal(false);
  readonly keyboardVisible = signal(true);

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly exerciseApi = inject(ExerciseApiService);
  private readonly difficultyApi = inject(DifficultyApiService);
  private readonly keyboardZoneApi = inject(KeyboardZoneApiService);

  ngOnInit(): void {
    const exerciseId = this.route.snapshot.queryParamMap.get('exerciseId');
    const levelId = this.route.snapshot.queryParamMap.get('levelId');

    if (exerciseId) {
      this.exerciseApi.getById(exerciseId).subscribe({
        next: (exercise) => {
          this.exercise.set(exercise);
          this.tokens.set(this.parseExercise(exercise.text));
        }
      });
    }

    if (levelId) {
      this.difficultyApi.getById(levelId).subscribe({
        next: (level) => {
          this.level.set(level);
        }
      });
    }

    this.keyboardZoneApi.getAll().subscribe({
      next: (zones) => {
        this.zones.set(zones);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/trainer/selection']);
  }

  private parseExercise(text: string): string[] {
    return text ? text.split('') : [];
  }
}
