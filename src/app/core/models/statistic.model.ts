export interface Statistic {
  id: string;
  userId: string;
  difficultyId: string;
  exerciseId: string;
  errorsPercent: number;
  timeSeconds: number;
  /** ISO date string */
  date: string;
  speed: number;
}
