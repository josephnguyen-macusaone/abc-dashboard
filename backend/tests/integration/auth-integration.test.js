/**
 * Authentication Integration Tests
 * Uses PostgreSQL (Knex) and the real app. Requires test DB with migrations run:
 *   createdb abc_dashboard_test   # or your POSTGRES_* test DB name
 *   NODE_ENV=test npm run migrate
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../../server.js';

describe('Authentication Integration Tests', () => {
  let server;
  let dbOk = false;
  const testUserEmail = 'test@example.com';
  const testPassword = 'password123';

  beforeAll(async () => {
    try {
      await global.testDb.connect();
      dbOk = true;
    } catch (e) {
      console.warn('Skipping auth integration tests: test DB not available', e.message);
    }
    server = app.listen(0);
  }, 30000);

  afterAll(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (dbOk) {
      await global.testDb.clearDatabase();
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }, 10000);

  beforeEach(async () => {
    if (!dbOk) return;
    const db = global.testDb.getDb();
    if (!db) return;
    await db('user_profiles').del();
    await db('users').del();

    const hashedPassword = await bcrypt.hash(testPassword, 4);
    const [userRow] = await db('users')
      .insert({
        username: 'testuser',
        hashed_password: hashedPassword,
        email: testUserEmail,
        display_name: 'Test User',
        role: 'staff',
        is_active: true,
        is_first_login: false,
      })
      .returning('*');

    await db('user_profiles').insert({
      user_id: userRow.id,
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      if (!dbOk) return;
      const response = await request(server).post('/api/v1/auth/login').send({
        email: testUserEmail,
        password: testPassword,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('tokens');
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
      expect(response.body.data.user.email).toBe(testUserEmail);
    });

    it('should return 401 for invalid credentials', async () => {
      if (!dbOk) return;
      const response = await request(server).post('/api/v1/auth/login').send({
        email: testUserEmail,
        password: 'wrongpassword',
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 for non-existent user', async () => {
      if (!dbOk) return;
      const response = await request(server).post('/api/v1/auth/login').send({
        email: 'nonexistent@example.com',
        password: testPassword,
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for missing fields', async () => {
      if (!dbOk) return;
      const response = await request(server).post('/api/v1/auth/login').send({
        email: testUserEmail,
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let refreshToken;

    beforeEach(async () => {
      if (!dbOk) return;
      const loginResponse = await request(server).post('/api/v1/auth/login').send({
        email: testUserEmail,
        password: testPassword,
      });
      refreshToken = loginResponse.body.data.tokens.refreshToken;
    });

    it('should refresh tokens successfully', async () => {
      if (!dbOk) return;
      const response = await request(server).post('/api/v1/auth/refresh').send({
        refreshToken,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Token refreshed successfully');
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
    });

    it('should return 401 for invalid refresh token', async () => {
      if (!dbOk) return;
      const response = await request(server).post('/api/v1/auth/refresh').send({
        refreshToken: 'invalid-token',
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/auth/profile', () => {
    let accessToken;

    beforeEach(async () => {
      if (!dbOk) return;
      const loginResponse = await request(server).post('/api/v1/auth/login').send({
        email: testUserEmail,
        password: testPassword,
      });
      accessToken = loginResponse.body.data.tokens.accessToken;
    });

    it('should return authenticated user profile', async () => {
      if (!dbOk) return;
      const response = await request(server)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isAuthenticated).toBe(true);
      expect(response.body.data.user.email).toBe(testUserEmail);
      expect(response.body.data.user.username).toBe('testuser');
    });

    it('should return unauthenticated status without token', async () => {
      if (!dbOk) return;
      const response = await request(server).get('/api/v1/auth/profile');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isAuthenticated).toBe(false);
      expect(response.body.data.user).toBeNull();
    });

    it('should return unauthenticated status with invalid token', async () => {
      if (!dbOk) return;
      const response = await request(server)
        .get('/api/v1/auth/profile')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isAuthenticated).toBe(false);
      expect(response.body.data.user).toBeNull();
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    let accessToken;

    beforeEach(async () => {
      if (!dbOk) return;
      const loginResponse = await request(server).post('/api/v1/auth/login').send({
        email: testUserEmail,
        password: testPassword,
      });
      accessToken = loginResponse.body.data.tokens.accessToken;
    });

    it('should logout successfully', async () => {
      if (!dbOk) return;
      const response = await request(server)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logout successful');
    });
  });
});
