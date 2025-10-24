import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from './../../src/app.module';
import { INestApplication } from '@nestjs/common';

describe('Auth (e2e)', () => {
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

  describe('/auth/signup (POST)', () => {
    it('should create a new user successfully', () => {
      const timestamp = Date.now();
      const signupData = {
        email: 'test-' + timestamp + '@example.com',
        password: 'password123',
        name: 'Test User',
      };

      return request(app.getHttpServer())
        .post('/auth/signup')
        .send(signupData)
        .expect(201)
        .expect(res => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(typeof res.body.accessToken).toBe('string');
          expect(typeof res.body.refreshToken).toBe('string');
        });
    });

    it('should return 400 for invalid signup data', () => {
      return request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: 'invalid-email', password: '' })
        .expect(400); // Should now return 400 with our validation fix
    });

    it('should return 409 for duplicate email', async () => {
      const timestamp = Date.now();
      const signupData = {
        email: 'duplicate-' + timestamp + '@example.com',
        password: 'password123',
        name: 'Test User',
      };

      // First signup should succeed
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send(signupData)
        .expect(201);

      // Second signup with same email should fail
      return request(app.getHttpServer())
        .post('/auth/signup')
        .send(signupData)
        .expect(409);
    });
  });

  describe('/auth/login (POST)', () => {
    it('should login successfully with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'admin' })
        .expect(200)
        .expect(res => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(typeof res.body.accessToken).toBe('string');
          expect(typeof res.body.refreshToken).toBe('string');
        });
    });

    it('should return 401 for invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'wrongpassword' })
        .expect(401);
    });

    it('should return 400 for missing credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({})
        .expect(400); // Should now return 400 with our validation fix
    });
  });
});
