import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { DifficultyLevel, Exercise } from '../../../../core/models';
import { DifficultyApiService } from '../../../../core/services/difficulty-api.service';
import { ExerciseApiService } from '../../../../core/services/exercise-api.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ExerciseCardComponent } from '../../../../shared/components/exercise-card/exercise-card.component';

@Component({
  selector: 'app-exercises',
  standalone: true,
  imports: [
    CommonModule,
    NzCardModule,
    NzEmptyModule,
    NzMenuModule,
    NzModalModule,
    NzSpinModule,
    ExerciseCardComponent
  ],
  templateUrl: './exercises.component.html',
  styleUrls: ['./exercises.component.scss']
})
export class ExercisesComponent implements OnInit {
  readonly levelsMenu = [1, 2, 3, 4, 5];

  levels: DifficultyLevel[] = [];
  exercises: Exercise[] = [];
  selectedIndex = 0;
  loading = true;
  listLoading = false;

  private readonly difficultyApi = inject(DifficultyApiService);
  private readonly exerciseApi = inject(ExerciseApiService);
  private readonly notifications = inject(NotificationService);
  private readonly modal = inject(NzModalService);
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

  onEdit(exercise: Exercise): void {
    this.router.navigate(['/admin/exercises/edit', exercise.id]);
  }

  onDelete(exercise: Exercise): void {
    this.modal.confirm({
      nzTitle: 'Удалить упражнение?',
      nzOnOk: () => this.deleteExercise(exercise)
    });
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
        this.exercises = exercises;
        this.listLoading = false;
      },
      error: () => {
        this.exercises = [];
        this.listLoading = false;
      }
    });
  }

  private deleteExercise(exercise: Exercise): void {
    this.exerciseApi.delete(exercise.id).subscribe({
      next: () => {
        this.notifications.success('Упражнение удалено');
        this.loadExercises();
      },
      error: () => {
        this.notifications.error('Ошибка при удалении упражнения');
      }
    });
  }
}
