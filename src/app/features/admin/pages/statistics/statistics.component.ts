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
  LinearScale,
  Title,
  Tooltip
} from 'chart.js';
import { DifficultyLevel, Exercise, Statistic } from '../../../../core/models';
import { DifficultyApiService } from '../../../../core/services/difficulty-api.service';
import { ExerciseApiService } from '../../../../core/services/exercise-api.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { StatisticsApiService } from '../../../../core/services/statistics-api.service';
import { UserApiService } from '../../../../core/services/user-api.service';

Chart.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  BarController
);

@Component({
  selector: 'app-admin-statistics',
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
  private readonly difficultyApi = inject(DifficultyApiService);
  private readonly statisticsApi = inject(StatisticsApiService);
  private readonly userApi = inject(UserApiService);
  private readonly exerciseApi = inject(ExerciseApiService);
  private readonly notificationService = inject(NotificationService);

  readonly loading = signal(false);
  readonly levels = signal<DifficultyLevel[]>([]);
  readonly exercises = signal<Exercise[]>([]);
  readonly allStats = signal<Statistic[]>([]);
  readonly userLoginById = signal<Map<string, string>>(new Map());

  readonly levelsMenu = [1, 2, 3, 4, 5];
  selectedIndex = 0;
  readonly selectedLevelId = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  selectLevel(index: number): void {
    if (this.selectedIndex === index) return;
    this.selectedIndex = index;
    this.selectedLevelId.set(this.levels().at(index)?.id ?? null);
    this.loadForSelectedLevel();
  }

  private load(): void {
    this.loading.set(true);
    this.difficultyApi.getAll().subscribe({
      next: (levels) => {
        this.levels.set(levels ?? []);
        this.selectedIndex = 0;
        this.selectedLevelId.set(this.levels().at(this.selectedIndex)?.id ?? null);
        this.loadForSelectedLevel();
      },
      error: () => {
        this.notificationService.warning('Не удалось загрузить уровни сложности');
        this.levels.set([]);
        this.selectedIndex = 0;
        this.selectedLevelId.set(null);
        this.exercises.set([]);
        this.allStats.set([]);
      }
    }).add(() => this.loading.set(false));
  }

  private loadForSelectedLevel(): void {
    const levelId = this.selectedLevelId();
    this.exercises.set([]);
    this.allStats.set([]);
    this.userLoginById.set(new Map());
    if (!levelId) return;

    this.loading.set(true);

    this.exerciseApi.getByLevel(levelId).subscribe({
      next: (ex) => this.exercises.set((ex ?? []).filter((e) => e.level_id === levelId)),
      error: () => this.exercises.set([])
    });

    this.statisticsApi.getByLevel(levelId).subscribe({
      next: (stats) => {
        const list = (stats ?? [])
          .filter((s) => s.level_id === levelId)
          .slice()
          .sort((a, b) => {
            const ad = a.created_at ? Date.parse(a.created_at) : 0;
            const bd = b.created_at ? Date.parse(b.created_at) : 0;
            return bd - ad;
          });

        this.allStats.set(list);

        const userIds = Array.from(new Set(list.map((s) => s.user_id).filter((id) => id.length > 0)));

        if (userIds.length === 0) {
          this.userLoginById.set(new Map());
          return;
        }

        const loginMap = new Map<string, string>();
        let remaining = userIds.length;

        for (const userId of userIds) {
          this.userApi.getUserNameById(userId).subscribe({
            next: (user) => {
              loginMap.set(userId, user?.login ?? userId);
            },
            error: () => {
              loginMap.set(userId, userId);
            }
          }).add(() => {
            remaining -= 1;
            if (remaining === 0) {
              this.userLoginById.set(loginMap);
            }
          });
        }
      },
      error: () => {
        this.notificationService.warning('Не удалось загрузить статистику');
        this.allStats.set([]);
        this.userLoginById.set(new Map());
      }
    }).add(() => this.loading.set(false));
  }

  private readonly exerciseIdToOrder = computed(() => {
    const map = new Map<string, number>();
    this.exercises().forEach((e, i) => {
      if (e?.id) map.set(e.id, i + 1);
    });
    return map;
  });

  readonly chartDataByExercise = computed(() => {
    const orderMap = this.exerciseIdToOrder();
    const stats = this.allStats();
    const byExercise = new Map<string, { all: number; success: number }>();

    for (const s of stats) {
      const exId = s.exercise_id;
      if (!exId) continue;
      const entry = byExercise.get(exId) ?? { all: 0, success: 0 };
      entry.all += 1;
      if (s.status === undefined || s.status === 'success') entry.success += 1;
      byExercise.set(exId, entry);
    }

    return Array.from(byExercise.entries())
      .map(([exerciseId, v]) => ({
        exerciseId,
        order: orderMap.get(exerciseId) ?? Number.POSITIVE_INFINITY,
        all: v.all,
        success: v.success
      }))
      .sort((a, b) => a.order - b.order);
  });

  readonly chartLabels = computed(() =>
    this.chartDataByExercise().map((x) => (Number.isFinite(x.order) ? String(x.order) : '?'))
  );

  readonly barChartData = computed<ChartData<'bar'>>(() => ({
    labels: this.chartLabels(),
    datasets: [
      {
        label: 'Все попытки',
        data: this.chartDataByExercise().map((x) => x.all),
        backgroundColor: 'rgba(234,149,149,0.88)',
        borderColor: 'rgba(0, 0, 0, 0.35)',
        borderWidth: 1,
        categoryPercentage: 0.7,
        barPercentage: 1
      },
      {
        label: 'Успешные попытки',
        data: this.chartDataByExercise().map((x) => x.success),
        backgroundColor: 'rgb(178,154,220)',
        borderColor: 'rgb(133,85,213)',
        borderWidth: 1,
        categoryPercentage: 0.7,
        barPercentage: 0.65
      }
    ]
  }));

  readonly barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: { display: false }
    },
    scales: {
      x: { title: { display: true, text: 'Номер упражнения' } },
      y: { beginAtZero: true, title: { display: true, text: 'Количество попыток' } }
    }
  };

  readonly tableRows = computed(() => {
    const orderMap = this.exerciseIdToOrder();
    const loginById = this.userLoginById();
    return this.allStats().map((s) => {
      const order = s.exercise_id ? (orderMap.get(s.exercise_id) ?? null) : null;
      return {
        ...s,
        userLogin: s.user_id ? (loginById.get(s.user_id) ?? s.user_id) : '-',
        exerciseOrder: order
      };
    });
  });
}

