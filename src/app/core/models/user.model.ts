export interface User {
  /** UUID */
  id: string;
  /** login: 4..8 characters */
  login: string;
  /** password: 4..10 characters */
  password: string;
  /** role: 'Admin' | 'Trainee' */
  role: 'Admin' | 'Trainee';
}

// Validation constraints (enforced in forms/services):
// - login: min 4, max 8
// - password: min 4, max 10
