export interface DifficultyLevel {
  id: string; // UUID
  /** number: 1..5 */
  number: number;
  minLength: number; // exercise min length (10..180 globally)
  maxLength: number; // exercise max length (10..180 globally)
  /** Exactly 5 zones (strings): pink, orange, green, blue, purple (order not strict) */
  zones: string[];
  maxErrors: number; // maximum allowed mistakes (<=10)
  keyPressTimeMin: number; // seconds, 0.5..2
  keyPressTimeMax: number; // seconds, 0.5..2
}

// Notes about constraints (to be used in validation/UI):
// - number must be between 1 and 5
// - zones.length should be 5
// - minLength/maxLength must be within 10..180
// - maxErrors <= 10
// - keyPressTimeMin/keyPressTimeMax between 0.5 and 2
