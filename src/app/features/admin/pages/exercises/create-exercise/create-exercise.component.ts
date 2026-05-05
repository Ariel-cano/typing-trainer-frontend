import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzSegmentedModule } from 'ng-zorro-antd/segmented';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { DifficultyApiService } from '../../../../../core/services/difficulty-api.service';
import { ExerciseApiService } from '../../../../../core/services/exercise-api.service';
import { KeyboardZoneApiService } from '../../../../../core/services/keyboard-zone-api.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { DifficultyLevel, ExerciseCreateRequest, KeyboardZone } from '../../../../../core/models';

@Component({
  selector: 'app-create-exercise-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NzButtonModule,
    NzCardModule,
    NzInputModule,
    NzInputNumberModule,
    NzSegmentedModule,
    NzSpinModule,
    NzIconModule
  ],
  templateUrl: './create-exercise.component.html',
  styleUrls: ['./create-exercise.component.scss']
})
export class CreateExerciseComponent implements OnInit {
  readonly MIN_EXERCISE_LENGTH = 10;
  readonly MAX_EXERCISE_LENGTH = 180;
  readonly LEVELS_COUNT = 5;

  readonly mode = signal<'manual' | 'auto'>('manual');
  readonly selectedLevel = signal<DifficultyLevel | null>(null);
  readonly generatedText = signal('');

  readonly modeOptions = [
    { label: 'Ручной режим', value: 'manual' },
    { label: 'Автоматический режим', value: 'auto' }
  ];

  levels: DifficultyLevel[] = [];
  zones: KeyboardZone[] = [];
  loading = true;
  saving = false;
  currentMinLength = this.MIN_EXERCISE_LENGTH;
  currentMaxLength = this.MAX_EXERCISE_LENGTH;
  allowedSymbolsDisplay = '';
  private allowedSymbols: string[] = [];

  private readonly fb = inject(FormBuilder);
  private readonly difficultyApi = inject(DifficultyApiService);
  private readonly exerciseApi = inject(ExerciseApiService);
  private readonly zonesApi = inject(KeyboardZoneApiService);
  private readonly notifications = inject(NotificationService);
  protected readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly form = this.fb.nonNullable.group({
    text: this.fb.nonNullable.control('', [Validators.required]),
    levelNumber: this.fb.nonNullable.control(1, [Validators.required, Validators.min(1), Validators.max(this.LEVELS_COUNT)]),
    length: this.fb.nonNullable.control(this.MIN_EXERCISE_LENGTH, [Validators.required])
  });

  private readonly symbolMap: Record<string, string | null> = {
    Comma: ',',
    Period: '.',
    Semicolon: ';',
    Slash: '/',
    Minus: '-',
    Equals: '=',
    Backslash: '\\',
    Space: ' ',
    Tab: null,
    Enter: null,
    Shift: null,
    Backspace: null,
    CapsLock: null
  };

  private exerciseId: string | null = null;
  private isEditMode = false;

  ngOnInit(): void {
    this.exerciseId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.exerciseId;
    this.loadData();
    this.form.controls.levelNumber.valueChanges.subscribe((value) => {
      this.onLevelChange(value);
    });
  }

  get textLength(): number {
    return this.form.controls.text.value.length;
  }

  onModeChange(value: string): void {
    if (value !== 'manual' && value !== 'auto') {
      return;
    }
    this.mode.set(value);
    this.updateLengthControlState();
  }

  onGenerate(): void {
    if (this.saving) {
      return;
    }
    const level = this.selectedLevel();
    if (!level) {
      this.notifications.warning('Выберите уровень сложности');
      return;
    }
    const lengthValue = this.form.controls.length.value;
    const length = this.clampNumber(lengthValue, this.currentMinLength, this.currentMaxLength);
    const zones = this.zones.filter((zone) => level.keyboard_zone_ids?.includes(zone.id));
    const text = this.generateText(length, zones);
    if (!text) {
      this.notifications.warning('Недостаточно символов для генерации');
      return;
    }
    this.generatedText.set(text);
    this.form.controls.text.setValue(text);
    this.form.controls.text.markAsDirty();
  }

  onBack(): void {
    this.router.navigateByUrl('/admin/exercises');
  }

  onSave(): void {
    if (this.saving) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const level = this.selectedLevel();
    if (!level) {
      this.notifications.warning('Выберите уровень сложности');
      return;
    }
    const rawText = this.form.controls.text.value ?? '';
    const text = rawText;
    if (!rawText.trim()) {
      this.notifications.warning('Введите текст упражнения');
      return;
    }
    if (text.length > this.currentMaxLength) {
      this.notifications.warning('Текст превышает максимальную длину для этого уровня');
      return;
    }
    if (text.length < this.currentMinLength) {
      this.notifications.warning('Текст слишком короткий для этого уровня');
      return;
    }
    const payload: ExerciseCreateRequest = {
      text,
      level_id: level.id
    };
    this.saving = true;
    const request$ = this.isEditMode && this.exerciseId
      ? this.exerciseApi.update(this.exerciseId, payload)
      : this.exerciseApi.create(payload);
    request$.subscribe({
      next: () => {
        this.notifications.success(this.isEditMode ? 'Упражнение обновлено' : 'Упражнение создано');
        this.saving = false;
      },
      error: () => {
        this.notifications.error(this.isEditMode ? 'Ошибка при обновлении упражнения' : 'Ошибка при создании упражнения');
        this.saving = false;
      }
    });
  }

  isSaveDisabled(): boolean {
    if (this.saving || this.form.invalid) {
      return true;
    }
    if (this.mode() === 'auto') {
      return !this.form.controls.text.value?.trim();
    }
    return false;
  }

  private loadData(): void {
    this.loading = true;
    const exercise$ = this.exerciseId ? this.exerciseApi.getById(this.exerciseId) : of(null);
    forkJoin({
      levels: this.difficultyApi.getAll(),
      zones: this.zonesApi.getAll(),
      exercise: exercise$
    }).subscribe({
      next: ({ levels, zones, exercise }) => {
        this.levels = levels;
        this.zones = zones;
        let levelNumber = 1;
        if (exercise) {
          const levelIndex = this.levels.findIndex((level) => level.id === exercise.level_id);
          levelNumber = levelIndex >= 0 ? levelIndex + 1 : 1;
          this.form.controls.text.setValue(exercise.text);
          this.form.controls.levelNumber.setValue(levelNumber, { emitEvent: false });
        }
        const selected = this.getLevelByNumber(levelNumber);
        this.selectedLevel.set(selected);
        this.updateConstraints(selected);
        this.updateLengthControlState();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  private onLevelChange(levelNumber: number): void {
    const safeValue = this.clampNumber(levelNumber, 1, this.LEVELS_COUNT);
    if (safeValue !== levelNumber) {
      this.form.controls.levelNumber.setValue(safeValue, { emitEvent: false });
    }
    const level = this.getLevelByNumber(safeValue);
    this.selectedLevel.set(level);
    this.updateConstraints(level);
  }

  private updateConstraints(level: DifficultyLevel | null): void {
    const min = level?.min_exercise_length ?? this.MIN_EXERCISE_LENGTH;
    const max = level?.max_exercise_length ?? this.MAX_EXERCISE_LENGTH;
    this.currentMinLength = min;
    this.currentMaxLength = max;

    this.setAllowedSymbols(level);

    const textControl = this.form.controls.text;
    textControl.setValidators([
      Validators.required,
      Validators.minLength(min),
      Validators.maxLength(max),
      this.buildAllowedSymbolsValidator(this.allowedSymbols)
    ]);
    textControl.updateValueAndValidity({ emitEvent: false });

    const lengthControl = this.form.controls.length;
    lengthControl.setValidators([Validators.required, Validators.min(min), Validators.max(max)]);
    const clampedLength = this.clampNumber(lengthControl.value, min, max);
    lengthControl.setValue(clampedLength, { emitEvent: false });
    lengthControl.updateValueAndValidity({ emitEvent: false });
  }

  private updateLengthControlState(): void {
    const lengthControl = this.form.controls.length;
    if (this.mode() === 'auto') {
      lengthControl.enable({ emitEvent: false });
    } else {
      lengthControl.disable({ emitEvent: false });
    }
  }

  private getLevelByNumber(levelNumber: number): DifficultyLevel | null {
    const index = levelNumber - 1;
    return this.levels[index] ?? null;
  }

  private generateText(length: number, zones: KeyboardZone[]): string {
    const allowedChars = zones.flatMap((zone) => this.parseZoneSymbols(zone));
    if (allowedChars.length === 0 || length <= 0) {
      return '';
    }

    const allowsSpace = allowedChars.includes(' ');
    const nonSpaceChars = allowedChars.filter((char) => char !== ' ');

    if (!allowsSpace || nonSpaceChars.length === 0) {
      const source = nonSpaceChars.length > 0 ? nonSpaceChars : allowedChars;
      return this.buildRandomString(length, source);
    }

    let result = '';
    let wordLen = 0;
    let targetWordLen = this.randomWordLength();

    for (let i = 0; i < length; i++) {
      const remaining = length - i;
      if (wordLen > 0 && wordLen >= targetWordLen && remaining > 1) {
        result += ' ';
        wordLen = 0;
        targetWordLen = this.randomWordLength();
        continue;
      }

      const nextChar = nonSpaceChars[Math.floor(Math.random() * nonSpaceChars.length)];
      result += nextChar;
      wordLen++;
    }

    return result;
  }

  private buildRandomString(length: number, source: string[]): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += source[Math.floor(Math.random() * source.length)];
    }
    return result;
  }

  private buildAllowedSymbolsValidator(allowed: string[]): ValidatorFn {
    const allowedSet = new Set(allowed.map((symbol) => symbol.toLowerCase()));
    return (control) => {
      const value = control.value ?? '';
      if (!value) {
        return null;
      }
      if (allowedSet.size === 0) {
        return { invalidSymbols: true };
      }
      for (const char of value) {
        if (!allowedSet.has(char.toLowerCase())) {
          return { invalidSymbols: true };
        }
      }
      return null;
    };
  }

  private setAllowedSymbols(level: DifficultyLevel | null): void {
    if (!level) {
      this.allowedSymbols = [];
      this.allowedSymbolsDisplay = '';
      return;
    }
    const symbols = this.zones
      .filter((zone) => level.keyboard_zone_ids?.includes(zone.id))
      .flatMap((zone) => this.parseZoneSymbols(zone));

    const unique = Array.from(new Set(symbols));
    this.allowedSymbols = unique;
    this.allowedSymbolsDisplay = this.formatAllowedSymbols(unique);
  }

  private formatAllowedSymbols(symbols: string[]): string {
    if (symbols.length === 0) {
      return '—';
    }
    return symbols
      .map((symbol) => (symbol === ' ' ? 'space' : symbol))
      .join(', ');
  }

  private parseZoneSymbols(zone: KeyboardZone): string[] {
    return zone.symbols
      .split(',')
      .map((symbol) => symbol.trim())
      .filter(Boolean)
      .flatMap((symbol) => {
        if (symbol.length === 1) {
          return [symbol];
        }
        const mapped = this.symbolMap[symbol];
        return mapped ? [mapped] : [];
      });
  }

  private randomWordLength(): number {
    return Math.floor(Math.random() * 4 + 4);
  }

  private clampNumber(value: number, min: number, max: number): number {
    if (Number.isNaN(value)) {
      return min;
    }
    return Math.min(Math.max(value, min), max);
  }
}

