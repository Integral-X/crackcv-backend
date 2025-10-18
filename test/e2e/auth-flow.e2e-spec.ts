import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from './../../src/app.module';
import { INestApplication } from '@nestjs/common';

describe('Auth Flow (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Complete Authentication Flow', () => {
    it('should complete full signup -> login -> refresh flow', async () => {
      const uniqueEmail = `flow-test-${Date.now()}@example.com`;
      const password = 'testpassword123';
      const name = 'Flow Test User';

      // Step 1: Signup
      const signupResponse = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: uniqueEmail, password, name })
        .expect(201);

      expect(signupResponse.body).toHaveProperty('accessToken');
      expect(signupResponse.body).toHaveProperty('refreshToken');

      // Step 2: Login with the same credentials
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: uniqueEmail, password })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('accessToken');
      expect(loginResponse.body).toHaveProperty('refreshToken');

      const loginAccessToken = loginResponse.body.accessToken;
      const loginRefreshToken = loginResponse.body.refreshToken;

      // Step 3: Refresh tokens
      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: loginRefreshToken })
        .expect(200);

      expect(refreshResponse.body).toHaveProperty('accessToken');
      expect(refreshResponse.body).toHaveProperty('refreshToken');

      // Verify that tokens are valid strings (they might be the same for the same user)
      expect(typeof loginAccessToken).toBe('string');
      expect(typeof refreshResponse.body.accessToken).toBe('string');
      expect(typeof refreshResponse.body.refreshToken).toBe('string');
      expect(loginAccessToken.length).toBeGreaterThan(0);
      expect(refreshResponse.body.accessToken.length).toBeGreaterThan(0);
      expect(refreshResponse.body.refreshToken.length).toBeGreaterThan(0);
    });

    it('should maintain consistent response structure across all endpoints', async () => {
      const uniqueEmail = `structure-test-${Date.now()}@example.com`;
      const password = 'testpassword123';

      // Test signup response structure
      const signupResponse = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: uniqueEmail, password, name: 'Test User' })
        .expect(201);

      const validateAuthResponse = (response: any) => {
        expect(response.body).toHaveProperty('accessToken');
        expect(response.body).toHaveProperty('refreshToken');
        expect(typeof response.body.accessToken).toBe('string');
        expect(typeof response.body.refreshToken).toBe('string');
        expect(response.body.accessToken.length).toBeGreaterThan(0);
        expect(response.body.refreshToken.length).toBeGreaterThan(0);
      };

      validateAuthResponse(signupResponse);

      // Test login response structure
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: uniqueEmail, password })
        .expect(200);

      validateAuthResponse(loginResponse);

      // Test refresh response structure
      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: loginResponse.body.refreshToken })
        .expect(200);

      validateAuthResponse(refreshResponse);
    });
  });

  describe('Error Handling Consistency', () => {
    it('should handle validation errors consistently across endpoints', async () => {
      // Test signup validation
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: 'invalid-email' })
        .expect(400);

      // Test login validation
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com' })
        .expect(400);

      // Test refresh validation
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({})
        .expect(400);
    });

    it('should handle authentication errors consistently', async () => {
      // Test login with wrong credentials
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'wrongpassword' })
        .expect(401);

      // Test refresh with invalid token
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);
    });
  });
});
