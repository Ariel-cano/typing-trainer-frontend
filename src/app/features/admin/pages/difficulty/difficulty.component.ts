import { Component, OnInit } from '@angular/core';
import {CommonModule, NgOptimizedImage} from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors, FormGroup, FormControl } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzMessageService } from 'ng-zorro-antd/message';
import { DifficultyApiService } from '../../../../core/services/difficulty-api.service';
import { KeyboardZoneApiService } from '../../../../core/services/keyboard-zone-api.service';
import { DifficultyLevel, KeyboardZone, DifficultyLevelCreateRequest } from '../../../../core/models';

@Component({
  selector: 'app-difficulty',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NzButtonModule,
    NzCardModule,
    NzFormModule,
    NzInputNumberModule,
    NzMenuModule,
    NzSelectModule,
    NzSpinModule,
    NgOptimizedImage
  ],
  templateUrl: './difficulty.component.html',
  styleUrls: ['./difficulty.component.scss']
})
export class DifficultyComponent implements OnInit {
  readonly LEVELS_COUNT = 5;
  readonly ZONES_COUNT = 5;
  readonly MIN_KEY_PRESS_TIME = 0.5;
  readonly MAX_KEY_PRESS_TIME = 2;
  readonly MAX_MISTAKES = 10;
  readonly MIN_EXERCISE_LENGTH = 10;
  readonly MAX_EXERCISE_LENGTH = 180;

  readonly levelsMenu = [1, 2, 3, 4, 5];

  levels: DifficultyLevel[] = [];
  zones: KeyboardZone[] = [];
  selectedIndex = 0;
  loading = true;
  saving = false;

  form!: FormGroup<{
    keyboard_zone_ids: FormControl<string[]>;
    min_exercise_length: FormControl<number>;
    max_exercise_length: FormControl<number>;
    allowed_mistakes: FormControl<number>;
    key_press_time: FormControl<number>;
  }>;

  constructor(
    private fb: FormBuilder,
    private difficultyApi: DifficultyApiService,
    private zonesApi: KeyboardZoneApiService,
    private message: NzMessageService
  ) {
    this.form = this.fb.nonNullable.group({
      keyboard_zone_ids: this.fb.nonNullable.control<string[]>([], [Validators.required]),
      min_exercise_length: this.fb.nonNullable.control(this.MIN_EXERCISE_LENGTH, [Validators.required, Validators.min(10), Validators.max(180)]),
      max_exercise_length: this.fb.nonNullable.control(this.MAX_EXERCISE_LENGTH, [Validators.required, Validators.min(10), Validators.max(180)]),
      allowed_mistakes: this.fb.nonNullable.control(5, [Validators.required, Validators.min(0), Validators.max(10)]),
      key_press_time: this.fb.nonNullable.control(1.0, [Validators.required, Validators.min(0.5), Validators.max(2)])
    }, { validators: [this.minMaxLengthValidator] });
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    forkJoin({
      zones: this.zonesApi.getAll(),
      levels: this.difficultyApi.getAll()
    }).subscribe({
      next: ({ zones, levels }) => {
        this.zones = zones;
        this.levels = levels;
        this.selectedIndex = 0;
        if (this.levels.length > 0) {
          this.patchForm(this.levels[0]);
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  selectLevel(index: number): void {
    this.selectedIndex = index;
    const level = this.levels[index];
    if (level) {
      this.patchForm(level);
    }
  }

  onSave(): void {
    if (this.form.invalid || !this.levels[this.selectedIndex]) {
      return;
    }
    this.saving = true;
    const level = this.levels[this.selectedIndex];
    const value = this.form.value;
    const payload: DifficultyLevelCreateRequest = {
      number: this.selectedIndex + 1,
      keyboard_zone_ids: value.keyboard_zone_ids ?? [],
      min_exercise_length: value.min_exercise_length ?? this.MIN_EXERCISE_LENGTH,
      max_exercise_length: value.max_exercise_length ?? this.MAX_EXERCISE_LENGTH,
      allowed_mistakes: value.allowed_mistakes ?? 0,
      key_press_time: value.key_press_time ?? 1
    };
    this.difficultyApi.update(level.id, payload).subscribe({
      next: (updated) => {
        this.levels[this.selectedIndex] = updated;
        this.message.success('Настройки сохранены');
        this.saving = false;
      },
      error: () => {
        this.message.error('Ошибка сохранения');
        this.saving = false;
      }
    });
  }

  private patchForm(level: DifficultyLevel): void {
    this.form.patchValue({
      keyboard_zone_ids: level.keyboard_zone_ids ?? [],
      min_exercise_length: level.min_exercise_length ?? this.MIN_EXERCISE_LENGTH,
      max_exercise_length: level.max_exercise_length ?? this.MAX_EXERCISE_LENGTH,
      allowed_mistakes: level.allowed_mistakes ?? 0,
      key_press_time: level.key_press_time ?? 1
    });
  }

  private minMaxLengthValidator(group: AbstractControl): ValidationErrors | null {
    const min = group.get('min_exercise_length')?.value;
    const max = group.get('max_exercise_length')?.value;
    if (min != null && max != null && min >= max) {
      return { minMaxLength: true };
    }
    return null;
  }
}
