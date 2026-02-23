/**
 * GET /api/v1/licenses/dashboard/metrics - Integration tests
 * Requires PostgreSQL test DB. Run with: npm run test -- tests/integration/license-dashboard-metrics.test.js
 * See docs/guides/dashboard-metrics-verification-plan.md
 */
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import connectDB from '../../src/infrastructure/config/database.js';
import { createRoutes } from '../../src/infrastructure/routes/index.js';
import { errorHandler } from '../../src/infrastructure/api/v1/middleware/error-handler.middleware.js';
import express from 'express';
import { correlationIdMiddleware } from '../../src/infrastructure/api/v1/middleware/correlation-id.middleware.js';
import { responseHelpersMiddleware } from '../../src/shared/http/response-transformer.js';

const METRIC_KEYS = [
  'totalActiveLicenses',
  'newLicensesThisMonth',
  'licenseIncomeThisMonth',
  'smsIncomeThisMonth',
  'inHouseLicenses',
  'agentHeavyLicenses',
  'highRiskLicenses',
  'estimatedNextMonthIncome',
];

describe('GET /api/v1/licenses/dashboard/metrics (integration)', () => {
  let app;
  let server;
  let dbOk = false;

  beforeAll(async () => {
    try {
      await connectDB();
      dbOk = true;
    } catch (e) {
      console.warn('Skipping dashboard metrics integration tests: DB not available', e.message);
      return;
    }

    app = express();
    app.use(correlationIdMiddleware);
    app.use(express.json());
    app.use(responseHelpersMiddleware);

    const v1Routes = await createRoutes();
    app.use('/api/v1', v1Routes);
    app.use(errorHandler);

    server = app.listen(0);
  }, 60000);

  afterAll(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    const { closeDB } = await import('../../src/infrastructure/config/database.js');
    await closeDB?.();
  }, 10000);

  describe('authentication', () => {
    it('returns 401 when no Authorization header', async () => {
      if (!dbOk) {
        return;
      }
      const res = await request(server).get('/api/v1/licenses/dashboard/metrics').expect(401);
      expect(res.body?.success).toBe(false);
    });

    it('returns 401 when Authorization is invalid', async () => {
      if (!dbOk) {
        return;
      }
      const res = await request(server)
        .get('/api/v1/licenses/dashboard/metrics')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
      expect(res.body?.success).toBe(false);
    });
  });

  describe('with valid auth (requires seeded user with license access)', () => {
    /** Obtain a valid access token (e.g. from login). Set via env or skip. */
    const getAccessToken = () => process.env.TEST_ACCESS_TOKEN || null;
    const hasToken = () => !!getAccessToken();

    it('returns 200 and metric structure when authorized', async () => {
      if (!dbOk || !hasToken()) {
        return;
      }
      const res = await request(server)
        .get('/api/v1/licenses/dashboard/metrics')
        .set('Authorization', `Bearer ${getAccessToken()}`)
        .expect(200);

      expect(res.body?.success).toBe(true);
      expect(res.body?.data).toBeDefined();
      const data = res.body.data;
      for (const key of METRIC_KEYS) {
        expect(data).toHaveProperty(key);
        expect(data[key]).toHaveProperty('value');
        expect(data[key]).toHaveProperty('trend');
        expect(data[key].trend).toHaveProperty('value');
        expect(data[key].trend).toHaveProperty('direction');
        expect(data[key].trend).toHaveProperty('label');
      }
      expect(data.metadata).toHaveProperty('currentPeriod');
      expect(data.metadata).toHaveProperty('previousPeriod');
      expect(data.metadata.currentPeriod).toHaveProperty('start');
      expect(data.metadata.currentPeriod).toHaveProperty('end');
    }, 15000);

    it('returns 200 and period in metadata when query has startsAtFrom and startsAtTo', async () => {
      if (!dbOk || !hasToken()) {
        return;
      }
      const res = await request(server)
        .get('/api/v1/licenses/dashboard/metrics')
        .query({ startsAtFrom: '2025-02-01', startsAtTo: '2025-02-28' })
        .set('Authorization', `Bearer ${getAccessToken()}`)
        .expect(200);

      expect(res.body?.data?.metadata?.currentPeriod?.start).toBeDefined();
      expect(res.body?.data?.metadata?.previousPeriod?.start).toBeDefined();
    }, 15000);
  });
});
