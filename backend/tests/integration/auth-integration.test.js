/**
 * Authentication Integration Tests
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import request from 'supertest';
import { app } from '../../src/infrastructure/bootstrap/app.js';
import User from '../../src/infrastructure/models/user-model.js';
import UserProfile from '../../src/infrastructure/models/user-profile-model.js';

describe('Authentication Integration Tests', () => {
  let testUser;
  let testProfile;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }
  });

  afterAll(async () => {
    // Clean up and close connection
    await User.deleteMany({});
    await UserProfile.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clean up before each test
    await User.deleteMany({});
    await UserProfile.deleteMany({});

    // Create test user
    testUser = await User.create({
      username: 'testuser',
      hashedPassword: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj8iSyGnU8', // 'password123'
      email: 'test@example.com',
      displayName: 'Test User',
      role: 'staff',
      isActive: true,
      isFirstLogin: false
    });

    testProfile = await UserProfile.create({
      userId: testUser._id,
      emailVerified: true,
      emailVerifiedAt: new Date()
    });
  });

  describe('POST /auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
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
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 for non-existent user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for missing fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com'
          // missing password
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /auth/refresh-token', () => {
    let refreshToken;

    beforeEach(async () => {
      // Login to get tokens
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      refreshToken = loginResponse.body.data.tokens.refreshToken;
    });

    it('should refresh tokens successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({
          refreshToken
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Token refreshed successfully');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
    });

    it('should return 401 for invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({
          refreshToken: 'invalid-token'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /auth/status', () => {
    let accessToken;

    beforeEach(async () => {
      // Login to get access token
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      accessToken = loginResponse.body.data.tokens.accessToken;
    });

    it('should return authenticated user status', async () => {
      const response = await request(app)
        .get('/api/v1/auth/status')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isAuthenticated).toBe(true);
      expect(response.body.data.user.email).toBe('test@example.com');
    });

    it('should return unauthenticated status without token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/status');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isAuthenticated).toBe(false);
      expect(response.body.data.user).toBeNull();
    });

    it('should return unauthenticated status with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/status')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isAuthenticated).toBe(false);
      expect(response.body.data.user).toBeNull();
    });
  });
});
