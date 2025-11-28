/**
 * Authentication Integration Tests
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../../server.js';
import User from '../../src/infrastructure/models/user-model.js';
import UserProfile from '../../src/infrastructure/models/user-profile-model.js';

describe('Authentication Integration Tests', () => {
  let testUser;
  let server;

  beforeAll(async () => {
    // Connect to test database
    await global.testDb.connect();

    // Create a server instance for supertest
    // This allows us to properly close it after tests
    server = app.listen(0); // Port 0 = random available port
  });

  afterAll(async () => {
    // Close the server first to prevent open handles
    await new Promise((resolve) => {
      if (server) {
        server.close(resolve);
      } else {
        resolve();
      }
    });

    // Clean up database
    await global.testDb.clearDatabase();

    // Small delay to let pending operations finish
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  beforeEach(async () => {
    // Clean up before each test
    await User.deleteMany({});
    await UserProfile.deleteMany({});

    // Create test user with properly hashed password
    const hashedPassword = await bcrypt.hash('password123', 4);

    testUser = await User.create({
      username: 'testuser',
      hashedPassword,
      email: 'test@example.com',
      displayName: 'Test User',
      role: 'staff',
      isActive: true,
      isFirstLogin: false,
    });

    await UserProfile.create({
      userId: testUser._id,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      const response = await request(server).post('/api/v1/auth/login').send({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('tokens');
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
      expect(response.body.data.user.email).toBe('test@example.com');
    });

    it('should return 401 for invalid credentials', async () => {
      const response = await request(server).post('/api/v1/auth/login').send({
        email: 'test@example.com',
        password: 'wrongpassword',
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 for non-existent user', async () => {
      const response = await request(server).post('/api/v1/auth/login').send({
        email: 'nonexistent@example.com',
        password: 'password123',
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for missing fields', async () => {
      const response = await request(server).post('/api/v1/auth/login').send({
        email: 'test@example.com',
        // missing password
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let refreshToken;

    beforeEach(async () => {
      // Login to get tokens
      const loginResponse = await request(server).post('/api/v1/auth/login').send({
        email: 'test@example.com',
        password: 'password123',
      });

      refreshToken = loginResponse.body.data.tokens.refreshToken;
    });

    it('should refresh tokens successfully', async () => {
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
      // Login to get access token
      const loginResponse = await request(server).post('/api/v1/auth/login').send({
        email: 'test@example.com',
        password: 'password123',
      });

      accessToken = loginResponse.body.data.tokens.accessToken;
    });

    it('should return authenticated user profile', async () => {
      const response = await request(server)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isAuthenticated).toBe(true);
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.user.username).toBe('testuser');
    });

    it('should return unauthenticated status without token', async () => {
      const response = await request(server).get('/api/v1/auth/profile');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isAuthenticated).toBe(false);
      expect(response.body.data.user).toBeNull();
    });

    it('should return unauthenticated status with invalid token', async () => {
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
      const loginResponse = await request(server).post('/api/v1/auth/login').send({
        email: 'test@example.com',
        password: 'password123',
      });

      accessToken = loginResponse.body.data.tokens.accessToken;
    });

    it('should logout successfully', async () => {
      const response = await request(server)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logout successful');
    });
  });
});
