import { Routes } from '@angular/router';
import { AuthLayoutComponent } from './layout/auth-layout/auth-layout.component';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: '/login' },

  // Auth layout
  {
    path: '',
    component: AuthLayoutComponent,
    children: [
      { path: 'login',    loadComponent: () => import('./features/auth/pages/login/login.component').then(m => m.LoginComponent) },
      { path: 'register', loadComponent: () => import('./features/auth/pages/register/register.component').then(m => m.RegisterComponent) }
    ]
  },

  // Trainer (user) layout
  {
    path: 'trainer',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'selection',  loadComponent: () => import('./features/trainer/pages/selection/selection.component').then(m => m.SelectionComponent) },
      { path: 'execution',  loadComponent: () => import('./features/trainer/pages/execution/execution.component').then(m => m.ExecutionComponent) },
      { path: 'statistics', loadComponent: () => import('./features/trainer/pages/statistics/statistics.component').then(m => m.StatisticsComponent) },
      { path: 'about-developers', loadComponent: () => import('./pages/welcome/about-developers/about-developers.component').then(m => m.AboutDevelopersComponent) },
      { path: 'about-system', loadComponent: () => import('./pages/welcome/about-system/about-system.component').then(m => m.AboutSystemComponent) },
      { path: '', redirectTo: 'selection', pathMatch: 'full' }
    ]
  },

  // Admin layout
  {
    path: 'admin',
    component: MainLayoutComponent,
    canActivate: [authGuard, adminGuard],
    children: [
      { path: 'difficulty', loadComponent: () => import('./features/admin/pages/difficulty/difficulty.component').then(m => m.DifficultyComponent) },
      { path: 'exercises/create', loadComponent: () => import('./features/admin/pages/exercises/create-exercise/create-exercise.component').then(m => m.CreateExerciseComponent) },
      { path: 'exercises/edit/:id', loadComponent: () => import('./features/admin/pages/exercises/create-exercise/create-exercise.component').then(m => m.CreateExerciseComponent) },
      { path: 'exercises', loadComponent: () => import('./features/admin/pages/exercises/exercises.component').then(m => m.ExercisesComponent) },
      { path: 'statistics', loadComponent: () => import('./features/admin/pages/statistics/statistics.component').then(m => m.StatisticsComponent) },
      { path: 'about-developers', loadComponent: () => import('./pages/welcome/about-developers/about-developers.component').then(m => m.AboutDevelopersComponent) },
      { path: 'about-system', loadComponent: () => import('./pages/welcome/about-system/about-system.component').then(m => m.AboutSystemComponent) },
      { path: '', redirectTo: 'difficulty', pathMatch: 'full' }
    ]
  }
];
