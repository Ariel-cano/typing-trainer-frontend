import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { DifficultyLevel, Exercise, KeyboardZone, StatisticCreateRequest } from '../../../../core/models';
import { DifficultyApiService } from '../../../../core/services/difficulty-api.service';
import { ExerciseApiService } from '../../../../core/services/exercise-api.service';
import { KeyboardZoneApiService } from '../../../../core/services/keyboard-zone-api.service';
import { StatisticsApiService } from '../../../../core/services/statistics-api.service';

@Component({
  selector: 'app-execution',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzIconModule, NzModalModule, NzSwitchModule],
  templateUrl: './execution.component.html',
  styleUrls: ['./execution.component.scss']
})
export class ExecutionComponent implements OnInit, OnDestroy {
  readonly exercise = signal<Exercise | null>(null);
  readonly level = signal<DifficultyLevel | null>(null);
  readonly zones = signal<KeyboardZone[]>([]);
  readonly tokens = signal<string[]>([]);

  readonly charactersTyped = signal(0);
  readonly errors = signal(0);
  readonly timerDisplay = signal('00:00');

  readonly charactersTotal = computed(() => this.tokens().length);
  readonly allowedMistakes = computed(() => this.level()?.allowed_mistakes ?? 0);
  readonly maxTimeSeconds = computed(() => {
    const pressTime = this.level()?.key_press_time ?? 0;
    return Math.max(0, Math.round(pressTime * this.tokens().length));
  });

  readonly musicEnabled = signal(false);
  readonly keyboardVisible = signal(true);

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly exerciseApi = inject(ExerciseApiService);
  private readonly difficultyApi = inject(DifficultyApiService);
  private readonly keyboardZoneApi = inject(KeyboardZoneApiService);
  private readonly statisticsApi = inject(StatisticsApiService);
  private readonly authState = inject(AuthStateService);
  private readonly modal = inject(NzModalService);

  private readonly currentIndex = signal(0);
  private readonly errorIndices = signal<Set<number>>(new Set());
  private readonly slowCorrectIndices = signal<Set<number>>(new Set());
  private readonly remainingSeconds = signal(0);
  private readonly started = signal(false);
  private timerId: number | null = null;
  private lastPressTime: number | null = null;
  private exerciseId: string | null = null;
  private levelId: string | null = null;

  ngOnInit(): void {
    this.exerciseId = this.route.snapshot.queryParamMap.get('exerciseId');
    this.levelId = this.route.snapshot.queryParamMap.get('levelId');

    if (this.exerciseId) {
      this.exerciseApi.getById(this.exerciseId).subscribe({
        next: (exercise) => {
          this.exercise.set(exercise);
          this.tokens.set(this.parseExercise(exercise.text));
          this.syncTimer();
        }
      });
    }

    if (this.levelId) {
      this.difficultyApi.getById(this.levelId).subscribe({
        next: (level) => {
          this.level.set(level);
          this.syncTimer();
        }
      });
    }

    this.keyboardZoneApi.getAll().subscribe({
      next: (zones) => {
        this.zones.set(zones);
      }
    });
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  goBack(): void {
    this.router.navigate(['/trainer/selection']);
  }

  isCorrect(index: number): boolean {
    return index < this.currentIndex() && !this.errorIndices().has(index) && !this.slowCorrectIndices().has(index);
  }

  isError(index: number): boolean {
    return this.errorIndices().has(index);
  }

  isCurrent(index: number): boolean {
    return index === this.currentIndex() && this.currentIndex() < this.tokens().length;
  }

  isSlowCorrect(index: number): boolean {
    return this.slowCorrectIndices().has(index);
  }

  @HostListener('document:keydown', ['$event'])
  handleKey(event: KeyboardEvent): void {
    if (!this.exercise() || !this.level() || this.tokens().length === 0) {
      return;
    }

    const key = event.key;
    if (key.length > 1 && key !== ' ') {
      return;
    }

    event.preventDefault();

    if (!this.started()) {
      this.started.set(true);
      this.lastPressTime = Date.now();
      this.startTimer();
    }

    const index = this.currentIndex();
    if (index >= this.tokens().length) {
      return;
    }

    const now = Date.now();
    const last = this.lastPressTime;
    const limitMs = (this.level()?.key_press_time ?? 0) * 1000;
    const lateError = last !== null && limitMs > 0 && now - last > limitMs;
    this.lastPressTime = now;

    const expected = this.tokens()[index];
    const pressed = key === ' ' ? ' ' : key;

    if (lateError) {
      if (this.normalizeChar(pressed) === this.normalizeChar(expected)) {
        this.markSlowCorrect(index, true);
        return;
      } else {
        this.markError(index, true);
        return;
      }
    }

    if (this.normalizeChar(pressed) === this.normalizeChar(expected)) {
      this.markCorrect();
    } else {
      this.markError(index, true);
    }
  }

  private normalizeChar(value: string): string {
    return value.toLowerCase();
  }

  private markCorrect(): void {
    this.advanceIndex();

    if (this.currentIndex() >= this.tokens().length) {
      this.finishExercise();
    }
  }

  private markError(index: number, advance = false): void {
    this.errors.update((value) => value + 1);
    this.errorIndices.set(new Set(this.errorIndices()).add(index));

    if (advance) {
      this.advanceIndex();
    }

    if (this.errors() >= this.allowedMistakes()) {
      this.handleTooManyErrors();
    } else if (this.currentIndex() >= this.tokens().length) {
      this.finishExercise();
    }
  }

  private markSlowCorrect(index: number, advance = false): void {
    this.errors.update((value) => value + 1);
    this.slowCorrectIndices.set(new Set(this.slowCorrectIndices()).add(index));

    if (advance) {
      this.advanceIndex();
    }

    if (this.errors() >= this.allowedMistakes()) {
      this.handleTooManyErrors();
    } else if (this.currentIndex() >= this.tokens().length) {
      this.finishExercise();
    }
  }


  private advanceIndex(): void {
    this.charactersTyped.update((value) => value + 1);
    this.currentIndex.update((value) => value + 1);
  }

  private handleTooManyErrors(): void {
    this.stopTimer();
    this.modal.confirm({
      nzTitle: 'Превышено допустимое количество ошибок',
      nzContent: 'Попробовать ещё раз?',
      nzOkText: 'Да',
      nzCancelText: 'Нет',
      nzOnOk: () => this.resetExercise(),
      nzOnCancel: () => this.router.navigate(['/trainer/selection'])
    });
  }

  private finishExercise(): void {
    this.stopTimer();

    const total = this.tokens().length;
    const maxTime = this.maxTimeSeconds();
    const remaining = this.remainingSeconds();
    const duration = Math.max(1, maxTime - remaining);

    const userId = this.authState.currentUser()?.id ?? '';
    if (!this.exerciseId || !this.levelId || !userId) {
      this.router.navigate(['/trainer/statistics']);
      return;
    }

    const stat: StatisticCreateRequest = {
      user_id: userId,
      level_id: this.levelId,
      exercise_id: this.exerciseId,
      mistakes_percent: Math.round((this.errors() / Math.max(total, 1)) * 100),
      execution_time: duration,
      speed: Math.round((total / duration) * 60)
    };

    this.statisticsApi.create(stat).subscribe({
      next: () => this.router.navigate(['/trainer/statistics']),
      error: () => this.router.navigate(['/trainer/statistics'])
    });
  }

  private resetExercise(): void {
    this.stopTimer();
    this.started.set(false);
    this.charactersTyped.set(0);
    this.errors.set(0);
    this.currentIndex.set(0);
    this.errorIndices.set(new Set());
    this.slowCorrectIndices.set(new Set());
    this.lastPressTime = null;
    this.syncTimer();
  }

  private syncTimer(): void {
    if (this.started()) {
      return;
    }
    const maxTime = this.maxTimeSeconds();
    this.remainingSeconds.set(maxTime);
    this.timerDisplay.set(this.formatTime(maxTime));
  }

  private startTimer(): void {
    if (this.timerId !== null) {
      return;
    }
    this.timerId = window.setInterval(() => {
      this.remainingSeconds.update((value) => Math.max(0, value - 1));
      this.timerDisplay.set(this.formatTime(this.remainingSeconds()));
      if (this.remainingSeconds() <= 0) {
        this.stopTimer();
        this.handleTooManyErrors();
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private formatTime(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, '0');
    const seconds = Math.floor(totalSeconds % 60)
      .toString()
      .padStart(2, '0');
    return `${minutes}:${seconds}`;
  }

  private parseExercise(text: string): string[] {
    if (!text) return [];
    return text.split('');
  }
}
