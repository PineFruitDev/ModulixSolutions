type LogEvent = 'render_error' | 'contact_http_error' | 'contact_rejected'
  | 'contact_invalid_response' | 'contact_network_error';

/** Console-only telemetry. Never accept payloads, URLs, messages or raw errors. */
export function logEvent(event: LogEvent, status?: number): void {
  const record = {
    timestamp: new Date().toISOString(),
    level: 'error',
    event,
    ...(Number.isInteger(status) && status! >= 100 && status! <= 599 ? { status } : {}),
  };
  try {
    console.error(JSON.stringify(record));
  } catch {
    // Diagnostics must never prevent recovery.
  }
}
