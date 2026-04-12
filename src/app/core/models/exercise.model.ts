export interface Exercise {
  id: string;
  text: string; // length 10..180
  level_id: string; // corresponds to difficulty level id in Swagger
}
