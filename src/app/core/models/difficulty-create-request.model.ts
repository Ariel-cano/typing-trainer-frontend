export interface DifficultyLevelCreateRequest {
  min_exercise_length?: number;
  max_exercise_length?: number;
  keyboard_zone_ids: string[];
  allowed_mistakes?: number;
  key_press_time?: number;
}

