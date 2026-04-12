export interface DifficultyLevel {
  id: string; // UUID
  // Swagger fields (snake_case):
  min_exercise_length?: number;
  max_exercise_length?: number;
  keyboard_zone_ids: string[];
  allowed_mistakes?: number;
  key_press_time?: number; // single number in Swagger (seconds)
}

// Notes about constraints (to be used in validation/UI):
// - keyboard_zone_ids.length should be 5
// - min_exercise_length/max_exercise_length must be within 10..180
// - allowed_mistakes <= 10
// - key_press_time between 0.5 and 2
