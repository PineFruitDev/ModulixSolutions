import { logEvent } from '../../lib/logger';

test('logs only a timestamp, level, event and valid HTTP status', () => {
  const sink = jest.spyOn(console, 'error').mockImplementation(() => {});
  logEvent('contact_http_error', 503);
  expect(JSON.parse(sink.mock.calls[0][0])).toEqual({
    timestamp: expect.any(String), level: 'error', event: 'contact_http_error', status: 503,
  });
  logEvent('render_error', NaN);
  expect(JSON.parse(sink.mock.calls[1][0])).not.toHaveProperty('status');
  sink.mockRestore();
});

test('a broken console cannot break error recovery', () => {
  const sink = jest.spyOn(console, 'error').mockImplementation(() => { throw new Error('sink'); });
  expect(() => logEvent('render_error')).not.toThrow();
  sink.mockRestore();
});
