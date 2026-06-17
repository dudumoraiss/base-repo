/** Shape returned by the API's GET /health endpoint. */
export interface HealthResponse {
  status: string;
  service: string;
}
