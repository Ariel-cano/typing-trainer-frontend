export interface StatisticCreateRequest {
  user_id: string;
  level_id: string;
  exercise_id: string;
  mistakes_percent?: number;
  execution_time?: number;
  speed?: number;
  date?: string; // ISO date string
}

