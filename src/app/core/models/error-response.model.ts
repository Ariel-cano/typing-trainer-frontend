export interface ErrorDetails {
  code: string;
  message: string;
}

export interface ErrorResponse {
  error: ErrorDetails;
}
