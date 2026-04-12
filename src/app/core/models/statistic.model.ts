export interface Statistic {
  id: string;
  user_id: string;
  level_id: string;
  exercise_id: string;
  mistakes_percent?: number;
  execution_time?: number;
  speed?: number;
  created_at?: string; // ISO date string
}
