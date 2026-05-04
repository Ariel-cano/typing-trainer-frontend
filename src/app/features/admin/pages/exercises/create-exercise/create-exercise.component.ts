import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzSegmentedModule } from 'ng-zorro-antd/segmented';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { DifficultyApiService } from '../../../../../core/services/difficulty-api.service';
import { ExerciseApiService } from '../../../../../core/services/exercise-api.service';
import { KeyboardZoneApiService } from '../../../../../core/services/keyboard-zone-api.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { DifficultyLevel, ExerciseCreateRequest, KeyboardZone } from '../../../../../core/models';

type AllowedSymbol = {
  kind: 'char' | 'token';
  value: string;
  label: string;
};

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
    NzSpinModule
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
  private allowedSymbols: AllowedSymbol[] = [];

  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    text: this.fb.nonNullable.control('', [Validators.required]),
    levelNumber: this.fb.nonNullable.control(1, [Validators.required, Validators.min(1), Validators.max(this.LEVELS_COUNT)]),
    length: this.fb.nonNullable.control(this.MIN_EXERCISE_LENGTH, [Validators.required])
  });

  private readonly symbolMap: Record<string, AllowedSymbol | null> = {
    Comma: { kind: 'char', value: ',', label: ',' },
    Period: { kind: 'char', value: '.', label: '.' },
    Semicolon: { kind: 'char', value: ';', label: ';' },
    Slash: { kind: 'char', value: '/', label: '/' },
    Minus: { kind: 'char', value: '-', label: '-' },
    Equals: { kind: 'char', value: '=', label: '=' },
    Backslash: { kind: 'char', value: '\\', label: '\\' },
    Space: { kind: 'char', value: ' ', label: 'Space' },
    Tab: { kind: 'token', value: '[Tab]', label: 'Tab' },
    Enter: { kind: 'token', value: '[Enter]', label: 'Enter' },
    Shift: { kind: 'token', value: '[Shift]', label: 'Shift' },
    Backspace: { kind: 'token', value: '[Backspace]', label: 'Backspace' },
    CapsLock: { kind: 'token', value: '[CapsLock]', label: 'CapsLock' }
  };

  constructor(
    private readonly difficultyApi: DifficultyApiService,
    private readonly exerciseApi: ExerciseApiService,
    private readonly zonesApi: KeyboardZoneApiService,
    private readonly notifications: NotificationService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.form.controls.levelNumber.valueChanges.subscribe((value) => {
      this.onLevelChange(value);
    });
  }

  get textLength(): number {
    return this.countSymbols(this.form.controls.text.value);
  }

  get specialKeys(): AllowedSymbol[] {
    return this.allowedSymbols.filter(
      (symbol) => symbol.kind === 'token' || (symbol.kind === 'char' && symbol.value === ' ')
    );
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

  onSave(): void {
    if (this.saving) {
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
    const symbolCount = this.countSymbols(text);
    if (symbolCount > this.currentMaxLength) {
      this.notifications.warning('Текст превышает максимальную длину для этого уровня');
      return;
    }
    if (symbolCount < this.currentMinLength) {
      this.notifications.warning('Текст слишком короткий для этого уровня');
      return;
    }
    const payload: ExerciseCreateRequest = {
      text,
      level_id: level.id
    };
    this.saving = true;
    this.exerciseApi.create(payload).subscribe({
      next: () => {
        this.notifications.success('Упражнение создано');
        this.saving = false;
        this.router.navigate(['/admin/exercises']);
      },
      error: () => {
        this.notifications.error('Ошибка при создании упражнения');
        this.saving = false;
      }
    });
  }

  insertSpecialKey(symbol: AllowedSymbol, textarea: HTMLTextAreaElement): void {
    if (this.mode() === 'auto') {
      return;
    }
    const value = this.form.controls.text.value ?? '';
    const insertValue = symbol.kind === 'token' ? symbol.value : symbol.value;
    const start = textarea.selectionStart ?? value.length;
    const end = textarea.selectionEnd ?? value.length;
    const next = value.slice(0, start) + insertValue + value.slice(end);
    this.form.controls.text.setValue(next);
    this.form.controls.text.markAsDirty();
    const cursor = start + insertValue.length;
    setTimeout(() => {
      textarea.selectionStart = cursor;
      textarea.selectionEnd = cursor;
      textarea.focus();
    });
  }

  isSaveDisabled(): boolean {
    if (this.saving || this.form.invalid) {
      return true;
    }
    if (this.mode() === 'auto') {
      return !this.generatedText().trim();
    }
    return false;
  }

  private loadData(): void {
    this.loading = true;
    forkJoin({
      levels: this.difficultyApi.getAll(),
      zones: this.zonesApi.getAll()
    }).subscribe({
      next: ({ levels, zones }) => {
        this.levels = levels;
        this.zones = zones;
        const firstLevel = this.getLevelByNumber(1);
        this.selectedLevel.set(firstLevel);
        this.updateConstraints(firstLevel);
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
      this.buildLengthValidator(min, max),
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
    const allowed = zones.flatMap((zone) => this.parseZoneSymbols(zone));
    if (allowed.length === 0 || length <= 0) {
      return '';
    }

    const spaceSymbol = allowed.find((symbol) => symbol.kind === 'char' && symbol.value === ' ') ?? null;
    const nonSpace = allowed.filter((symbol) => symbol.kind !== 'char' || symbol.value !== ' ');

    if (!spaceSymbol || nonSpace.length === 0) {
      return this.buildRandomString(length, nonSpace.length > 0 ? nonSpace : allowed);
    }

    let result = '';
    let wordLen = 0;
    let targetWordLen = this.randomWordLength();

    for (let i = 0; i < length; i++) {
      const remaining = length - i;
      if (wordLen > 0 && wordLen >= targetWordLen && remaining > 1) {
        result += spaceSymbol.value;
        wordLen = 0;
        targetWordLen = this.randomWordLength();
        continue;
      }

      const nextSymbol = nonSpace[Math.floor(Math.random() * nonSpace.length)];
      result += nextSymbol.value;
      wordLen++;
    }

    return result;
  }

  private buildRandomString(length: number, source: AllowedSymbol[]): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += source[Math.floor(Math.random() * source.length)].value;
    }
    return result;
  }

  private buildAllowedSymbolsValidator(allowed: AllowedSymbol[]): ValidatorFn {
    const allowedChars = new Set(
      allowed
        .filter((symbol) => symbol.kind === 'char')
        .map((symbol) => symbol.value.toLowerCase())
    );
    const allowedTokens = new Set(
      allowed
        .filter((symbol) => symbol.kind === 'token')
        .map((symbol) => symbol.value.toLowerCase())
    );

    return (control) => {
      const value = control.value ?? '';
      if (!value) {
        return null;
      }
      if (allowedChars.size === 0 && allowedTokens.size === 0) {
        return { invalidSymbols: true };
      }

      const symbols = this.parseTextSymbols(value);
      if (symbols.invalid) {
        return { invalidSymbols: true };
      }

      for (const symbol of symbols.items) {
        if (symbol.kind === 'token') {
          if (!allowedTokens.has(symbol.value.toLowerCase())) {
            return { invalidSymbols: true };
          }
        } else if (!allowedChars.has(symbol.value.toLowerCase())) {
          return { invalidSymbols: true };
        }
      }

      return null;
    };
  }

  private buildLengthValidator(min: number, max: number): ValidatorFn {
    return (control) => {
      const value = control.value ?? '';
      if (!value) {
        return null;
      }
      const length = this.countSymbols(value);
      if (length < min) {
        return { minlength: true };
      }
      if (length > max) {
        return { maxlength: true };
      }
      return null;
    };
  }

  private countSymbols(value: string): number {
    return this.parseTextSymbols(value).items.length;
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

    const unique = new Map(symbols.map((symbol) => [symbol.value, symbol]));
    this.allowedSymbols = Array.from(unique.values());
    this.allowedSymbolsDisplay = this.formatAllowedSymbols(this.allowedSymbols);
  }

  private formatAllowedSymbols(symbols: AllowedSymbol[]): string {
    if (symbols.length === 0) {
      return '—';
    }
    return symbols
      .map((symbol) => {
        if (symbol.kind === 'token') {
          return symbol.value;
        }
        return symbol.value === ' ' ? 'space' : symbol.value;
      })
      .join(', ');
  }

  private parseZoneSymbols(zone: KeyboardZone): AllowedSymbol[] {
    return zone.symbols
      .split(',')
      .map((symbol) => symbol.trim())
      .filter(Boolean)
      .map((symbol) => {
        if (symbol.length === 1) {
          return { kind: 'char', value: symbol, label: symbol } satisfies AllowedSymbol;
        }
        return this.symbolMap[symbol] ?? null;
      })
      .filter((symbol): symbol is AllowedSymbol => Boolean(symbol));
  }

  private parseTextSymbols(value: string): { items: AllowedSymbol[]; invalid: boolean } {
    const items: AllowedSymbol[] = [];
    let invalid = false;
    let index = 0;

    while (index < value.length) {
      if (value[index] === '[') {
        const end = value.indexOf(']', index + 1);
        if (end > index + 1) {
          const token = value.slice(index, end + 1);
          items.push({ kind: 'token', value: token, label: token });
          index = end + 1;
          continue;
        }
        invalid = true;
      }

      items.push({ kind: 'char', value: value[index], label: value[index] });
      index += 1;
    }

    return { items, invalid };
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

