import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { DifficultyLevel, Exercise } from '../../../../core/models';
import { DifficultyApiService } from '../../../../core/services/difficulty-api.service';
import { ExerciseApiService } from '../../../../core/services/exercise-api.service';
import { ExerciseCardComponent } from '../../../../shared/components/exercise-card/exercise-card.component';

@Component({
  selector: 'app-selection',
  standalone: true,
  imports: [
    CommonModule,
    NzCardModule,
    NzEmptyModule,
    NzMenuModule,
    NzSpinModule,
    ExerciseCardComponent
  ],
  templateUrl: './selection.component.html',
  styleUrls: ['./selection.component.scss']
})
export class SelectionComponent implements OnInit {
  readonly levelsMenu = [1, 2, 3, 4, 5];

  levels: DifficultyLevel[] = [];
  exercises: Exercise[] = [];
  selectedIndex = 0;
  loading = true;
  listLoading = false;

  private readonly difficultyApi = inject(DifficultyApiService);
  private readonly exerciseApi = inject(ExerciseApiService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.loadLevels();
  }

  get selectedLevelTitle(): string {
    return `Упражнения уровня ${this.selectedIndex + 1}`;
  }

  selectLevel(index: number): void {
    if (this.selectedIndex === index) {
      return;
    }
    this.selectedIndex = index;
    this.loadExercises();
  }

  onSelect(exercise: Exercise): void {
    this.router.navigate(['/trainer/execution'], {
      queryParams: {
        exerciseId: exercise.id,
        levelId: exercise.level_id
      }
    });
  }

  getDurationSeconds(exercise: Exercise): number {
    const level = this.levels.find((item) => item.id === exercise.level_id);
    const keyPressTime = level?.key_press_time ?? 0;
    const length = exercise.text?.length ?? 0;
    return keyPressTime * length;
  }

  private loadLevels(): void {
    this.loading = true;
    this.difficultyApi.getAll().subscribe({
      next: (levels) => {
        this.levels = levels;
        this.loading = false;
        this.loadExercises();
      },
      error: () => {
        this.loading = false;
        this.exercises = [];
      }
    });
  }

  private loadExercises(): void {
    const level = this.levels[this.selectedIndex];
    if (!level) {
      this.exercises = [];
      return;
    }
    this.listLoading = true;
    this.exerciseApi.getByLevel(level.id).subscribe({
      next: (exercises) => {
        this.exercises = exercises.filter((exercise) => exercise.level_id === level.id);
        this.listLoading = false;
      },
      error: () => {
        this.exercises = [];
        this.listLoading = false;
      }
    });
  }
}
