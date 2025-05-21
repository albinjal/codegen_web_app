/**
 * Health module controller
 */
export interface HealthStatus {
  status: string;
}

/**
 * Health check controller function
 * @returns {Promise<HealthStatus>} Health status object
 */
export async function healthCheck(): Promise<HealthStatus> {
  return { status: 'ok' };
}
