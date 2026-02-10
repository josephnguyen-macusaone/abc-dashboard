import { securityHeaders } from '../../src/infrastructure/api/v1/middleware/security.middleware.js';
import { config } from '../../src/infrastructure/config/config.js';

describe('securityHeaders middleware', () => {
  it('sets a CSP without unsafe directives and with connect-src including client URL', () => {
    const headers = {};
    const req = {};
    const res = {
      setHeader: (key, value) => {
        headers[key] = value;
      },
    };

    securityHeaders(req, res, () => {});

    expect(headers['Content-Security-Policy']).toBeDefined();
    expect(headers['Content-Security-Policy']).not.toMatch(/unsafe-inline|unsafe-eval/);
    expect(headers['Content-Security-Policy']).toContain('connect-src');
    if (config.CLIENT_URL) {
      expect(headers['Content-Security-Policy']).toContain(config.CLIENT_URL);
    }
  });
});
