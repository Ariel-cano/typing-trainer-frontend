export interface DifficultyLevel {
  id: string; // UUID
  min_exercise_length?: number; // min text length (10-180)
  max_exercise_length?: number; // max text length (10-180)
  keyboard_zone_ids: string[]; // array of 5 keyboard zone ids
  allowed_mistakes?: number; // max allowed mistakes (<=10)
  key_press_time?: number; // key press time in seconds (Swagger)
}

