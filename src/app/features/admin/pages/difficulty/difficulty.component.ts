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
import { NotificationService } from '../../../../core/services/notification.service';
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

  private readonly zoneGroupDefs = [
    { label: '1 зона (синяя и темно-синяя)', names: ['en_green', 'en_blue'], primary: 'en_green' },
    { label: '2 зона (зеленая и голубая)', names: ['en_yellow', 'en_indigo'], primary: 'en_yellow' },
    { label: '3 зона (оранжевая и желтая)', names: ['en_orange', 'en_purple'], primary: 'en_orange' },
    { label: '4 зона (красная + светло-зеленая)', names: ['en_red', 'en_pink'], primary: 'en_red' },
    { label: '5 зона (пробел)', names: ['en_thumb'], primary: 'en_thumb' }
  ] as const;

  readonly levelsMenu = [1, 2, 3, 4, 5];

  levels: DifficultyLevel[] = [];
  zones: KeyboardZone[] = [];
  zoneGroups: { id: string; label: string; ids: string[] }[] = [];
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
    private notifications: NotificationService
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
        this.zoneGroups = this.buildZoneGroups(zones);
        this.levels = levels;
        this.selectedIndex = 0;
        if (this.levels.length > 0) {
          this.patchForm(this.levels[0]);
        } else {
          this.resetForm();
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
    } else {
      this.resetForm();
    }
  }

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notifications.warning('Проверьте значения формы');
      return;
    }
    this.saving = true;
    const level = this.levels[this.selectedIndex];
    const value = this.form.getRawValue();
    const selectedGroupIds = value.keyboard_zone_ids ?? [];
    const allSelectedZoneIds: string[] = [];
    selectedGroupIds.forEach(primaryId => {
      const group = this.zoneGroups.find(g => g.id === primaryId);
      if (group) {
        allSelectedZoneIds.push(...group.ids);
      } else {
        allSelectedZoneIds.push(primaryId);
      }
    });
    const uniqueIds = Array.from(new Set(allSelectedZoneIds));
    if (uniqueIds.length === 0) {
      this.saving = false;
      this.notifications.warning('Выберите хотя бы одну зону');
      return;
    }
    const min = Number(value.min_exercise_length ?? this.MIN_EXERCISE_LENGTH);
    const max = Number(value.max_exercise_length ?? this.MAX_EXERCISE_LENGTH);
    const mistakes = Number(value.allowed_mistakes ?? 0);
    const keyPress = Number(value.key_press_time ?? 1);
    const payload: DifficultyLevelCreateRequest = {
      keyboard_zone_ids: uniqueIds,
      min_exercise_length: Number.isFinite(min) ? min : this.MIN_EXERCISE_LENGTH,
      max_exercise_length: Number.isFinite(max) ? max : this.MAX_EXERCISE_LENGTH,
      allowed_mistakes: Number.isFinite(mistakes) ? mistakes : 0,
      key_press_time: Number.isFinite(keyPress) ? keyPress : 1
    };

    const request$ = level
      ? this.difficultyApi.update(level.id, payload)
      : this.difficultyApi.create(payload);

    request$.subscribe({
      next: (updated) => {
        this.levels[this.selectedIndex] = updated;
        this.patchForm(updated);
        this.form.markAsPristine();
        this.notifications.success('Настройки сохранены');
        this.saving = false;
      },
      error: (err) => {
        const message = err?.error?.error?.message ?? 'Ошибка сохранения';
        this.notifications.error(message);
        this.saving = false;
      }
    });
  }

  private patchForm(level: DifficultyLevel): void {
    const selectedIds = this.mapIdsToGroupPrimaryIds(level.keyboard_zone_ids ?? []);
    this.form.patchValue({
      keyboard_zone_ids: selectedIds,
      min_exercise_length: level.min_exercise_length ?? this.MIN_EXERCISE_LENGTH,
      max_exercise_length: level.max_exercise_length ?? this.MAX_EXERCISE_LENGTH,
      allowed_mistakes: level.allowed_mistakes ?? 0,
      key_press_time: level.key_press_time ?? 1
    });
  }

  private resetForm(): void {
    this.form.reset({
      keyboard_zone_ids: [],
      min_exercise_length: this.MIN_EXERCISE_LENGTH,
      max_exercise_length: this.MAX_EXERCISE_LENGTH,
      allowed_mistakes: 5,
      key_press_time: 1.0
    });
  }

  private buildZoneGroups(zones: KeyboardZone[]): { id: string; label: string; ids: string[] }[] {
    const byName = new Map(zones.map((zone) => [zone.name, zone.id]));
    return this.zoneGroupDefs.map((def) => {
      const ids = def.names.map((name) => byName.get(name)).filter((id): id is string => !!id);
      const primaryId = byName.get(def.primary);
      return {
        id: primaryId ?? '',
        label: def.label,
        ids
      };
    }).filter((group) => group.id);
  }

  private mapIdsToGroupPrimaryIds(ids: string[]): string[] {
    const idSet = new Set(ids);
    return this.zoneGroups
      .filter((group) => group.ids.some((id) => idSet.has(id)))
      .map((group) => group.id);
  }

  private minMaxLengthValidator(group: AbstractControl): ValidationErrors | null {
    const min = group.get('min_exercise_length')?.value;
    const max = group.get('max_exercise_length')?.value;
    if (min != null && max != null && min > max) {
      return { minMaxLength: true };
    }
    return null;
  }
}
