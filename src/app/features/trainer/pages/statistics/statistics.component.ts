import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTableModule } from 'ng-zorro-antd/table';
import { BaseChartDirective } from 'ng2-charts';
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  ChartData,
  ChartOptions,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip
} from 'chart.js';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { DifficultyApiService } from '../../../../core/services/difficulty-api.service';
import { ExerciseApiService } from '../../../../core/services/exercise-api.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { DifficultyLevel, Exercise, Statistic } from '../../../../core/models';
import { StatisticsApiService } from '../../../../core/services/statistics-api.service';

Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  LineController,
  BarController
);

@Component({
  selector: 'app-trainer-statistics',
  standalone: true,
  imports: [
    CommonModule,
    NzMenuModule,
    NzCardModule,
    NzTableModule,
    NzEmptyModule,
    NzSpinModule,
    BaseChartDirective
  ],
  templateUrl: './statistics.component.html',
  styleUrls: ['./statistics.component.scss']
})
export class StatisticsComponent implements OnInit {
  private readonly statisticsApi = inject(StatisticsApiService);
  private readonly authState = inject(AuthStateService);
  private readonly notificationService = inject(NotificationService);
  private readonly difficultyApi = inject(DifficultyApiService);
  private readonly exerciseApi = inject(ExerciseApiService);

  readonly loading = signal(false);
  readonly allStats = signal<Statistic[]>([]);
  readonly levels = signal<DifficultyLevel[]>([]);
  readonly exercises = signal<Exercise[]>([]);
  readonly levelsMenu = [1, 2, 3, 4, 5];
  selectedIndex = 0;
  readonly selectedLevelId = signal<string | null>(null);

  readonly filteredStats = computed(() => {
    const levelId = this.selectedLevelId();
    const stats = this.allStats();
    const filtered = levelId ? stats.filter((s) => s.level_id === levelId) : [];
    return filtered.sort((a, b) => {
      const ad = a.created_at ? Date.parse(a.created_at) : 0;
      const bd = b.created_at ? Date.parse(b.created_at) : 0;
      return bd - ad;
    });
  });

  readonly bestStatsByExercise = computed(() => {
    const stats = this.filteredStats();
    const bestByExercise = new Map<string, Statistic>();

    for (const s of stats) {
      const exerciseId = s.exercise_id;
      if (!exerciseId) continue;

      const current = bestByExercise.get(exerciseId);
      if (!current) {
        bestByExercise.set(exerciseId, s);
        continue;
      }

      const sSpeed = s.speed ?? 0;
      const cSpeed = current.speed ?? 0;
      if (sSpeed !== cSpeed) {
        if (sSpeed > cSpeed) bestByExercise.set(exerciseId, s);
        continue;
      }

      const sMistakes = s.mistakes_percent ?? 0;
      const cMistakes = current.mistakes_percent ?? 0;
      if (sMistakes !== cMistakes) {
        if (sMistakes < cMistakes) bestByExercise.set(exerciseId, s);
        continue;
      }

      const sTime = s.execution_time ?? Number.MAX_SAFE_INTEGER;
      const cTime = current.execution_time ?? Number.MAX_SAFE_INTEGER;
      if (sTime !== cTime) {
        if (sTime < cTime) bestByExercise.set(exerciseId, s);
        continue;
      }

      const sd = s.created_at ? Date.parse(s.created_at) : 0;
      const cd = current.created_at ? Date.parse(current.created_at) : 0;
      if (sd > cd) bestByExercise.set(exerciseId, s);
    }

    const orderMap = this.exerciseIdToOrder();

    return Array.from(bestByExercise.values()).sort((a, b) => {
      const ao = a.exercise_id ? (orderMap.get(a.exercise_id) ?? Number.POSITIVE_INFINITY) : Number.POSITIVE_INFINITY;
      const bo = b.exercise_id ? (orderMap.get(b.exercise_id) ?? Number.POSITIVE_INFINITY) : Number.POSITIVE_INFINITY;
      if (ao !== bo) return ao - bo;

      const ad = a.created_at ? Date.parse(a.created_at) : 0;
      const bd = b.created_at ? Date.parse(b.created_at) : 0;
      return ad - bd;
    });
  });

  private readonly exerciseIdToOrder = computed(() => {
    const map = new Map<string, number>();
    this.exercises().forEach((e, i) => {
      if (e?.id) map.set(e.id, i + 1);
    });
    return map;
  });

  readonly chartLabels = computed(() => {
    const orderMap = this.exerciseIdToOrder();
    return this.bestStatsByExercise().map((s) => {
      const id = s.exercise_id;
      if (!id) return '?';
      const n = orderMap.get(id);
      return typeof n === 'number' ? String(n) : '?';
    });
  });

  readonly avgKeyPressTimeSeconds = computed(() => {
    return this.bestStatsByExercise().map((s) => {
      const speed = s.speed ?? 0;
      if (speed <= 0) return 0;
      return Number((60 / speed).toFixed(3));
    });
  });

  readonly mistakesPercent = computed(() =>
    this.bestStatsByExercise().map((s) => s.mistakes_percent ?? 0)
  );

  readonly lineChartData = computed<ChartData<'line'>>(() => ({
    labels: this.chartLabels(),
    datasets: [
      {
        label: 'Время, сек',
        data: this.avgKeyPressTimeSeconds(),
        borderColor: '#1677ff',
        backgroundColor: 'rgba(22, 119, 255, 0.15)',
        pointRadius: 3,
        tension: 0.25,
        fill: true
      }
    ]
  }));

  readonly barChartData = computed<ChartData<'bar'>>(() => ({
    labels: this.chartLabels(),
    datasets: [
      {
        label: 'Ошибки, %',
        data: this.mistakesPercent(),
        backgroundColor: 'rgba(245, 34, 45, 0.65)',
        borderColor: 'rgba(245, 34, 45, 1)',
        borderWidth: 1
      }
    ]
  }));

  readonly lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false }
    },
    scales: {
      x: { title: { display: true, text: 'Номер упражнения' } },
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Время, сек' }
      }
    }
  };

  readonly barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false }
    },
    scales: {
      x: { title: { display: true, text: 'Номер упражнения' } },
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Количество ошибок, %' },
        suggestedMax: 100
      }
    }
  };

  ngOnInit(): void {
    this.load();
  }

  selectLevel(index: number): void {
    if (this.selectedIndex === index) {
      return;
    }
    this.selectedIndex = index;
    this.selectedLevelId.set(this.levels().at(index)?.id ?? null);
    this.loadExercisesForSelectedLevel();
  }

  private load(): void {
    const userId = this.authState.currentUser()?.id ?? '';
    if (!userId) {
      this.allStats.set([]);
      this.selectedLevelId.set(null);
      this.exercises.set([]);
      return;
    }

    this.loading.set(true);
    this.difficultyApi.getAll().subscribe({
      next: (levels) => {
        this.levels.set(levels ?? []);
        this.statisticsApi.getByUser(userId).subscribe({
          next: (stats) => {
            this.allStats.set(stats ?? []);

            const latest = (stats ?? [])
              .slice()
              .sort((a, b) => {
                const ad = a.created_at ? Date.parse(a.created_at) : 0;
                const bd = b.created_at ? Date.parse(b.created_at) : 0;
                return bd - ad;
              })[0];

            const latestLevelId = latest?.level_id;
            const idx = latestLevelId ? this.levels().findIndex((l) => l.id === latestLevelId) : -1;
            this.selectedIndex = idx >= 0 ? idx : 0;
            this.selectedLevelId.set(this.levels().at(this.selectedIndex)?.id ?? null);
            this.loadExercisesForSelectedLevel();
          },
          error: () => {
            this.notificationService.warning('Не удалось загрузить статистику');
            this.allStats.set([]);
            this.selectedLevelId.set(this.levels().at(this.selectedIndex)?.id ?? null);
            this.loadExercisesForSelectedLevel();
          }
        }).add(() => this.loading.set(false));
      },
      error: () => {
        this.levels.set([]);
        this.statisticsApi.getByUser(userId).subscribe({
          next: (stats) => {
            this.allStats.set(stats ?? []);
            this.selectedIndex = 0;
            this.selectedLevelId.set(null);
            this.exercises.set([]);
          },
          error: () => {
            this.notificationService.warning('Не удалось загрузить статистику');
            this.allStats.set([]);
            this.selectedIndex = 0;
            this.selectedLevelId.set(null);
            this.exercises.set([]);
          }
        }).add(() => this.loading.set(false));
      }
    });
  }

  private loadExercisesForSelectedLevel(): void {
    this.exercises.set([]);
    const levelId = this.selectedLevelId();
    if (!levelId) {
      return;
    }

    this.exerciseApi.getByLevel(levelId).subscribe({
      next: (exercises) => {
        this.exercises.set((exercises ?? []).filter((e) => e.level_id === levelId));
      },
      error: () => {
        this.exercises.set([]);
      }
    });
  }
}

