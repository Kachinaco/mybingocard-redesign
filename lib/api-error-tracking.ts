import { trackActivity } from './activity';

export async function trackApiError(
  error: unknown,
  context: {
    route: string;
    method: string;
    userId?: string | null;
    email?: string | null;
    statusCode: number;
    metadata?: Record<string, unknown>;
  }
) {
  try {
    await trackActivity({
      event: 'api_error',
      source: 'server',
      userId: context.userId || null,
      email: context.email || null,
      pathname: context.route,
      metadata: {
        method: context.method,
        status_code: context.statusCode,
        error_message: error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500),
        error_type: error instanceof Error ? error.constructor.name : 'Unknown',
        ...context.metadata,
      },
    });
  } catch {
    console.error('Failed to track API error');
  }
}
