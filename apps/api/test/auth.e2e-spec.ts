import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AuthController (e2e)', () => {
    let app: INestApplication;

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterEach(async () => {
        await app.close();
    });

    it('/api/auth/github (GET) should redirect to GitHub', () => {
        return request(app.getHttpServer())
            .get('/api/auth/github')
            .expect(302)
            .expect('Location', /github\.com\/login\/oauth\/authorize/);
    });

    it('/api/auth/me (GET) should return 401 when not logged in', () => {
        return request(app.getHttpServer())
            .get('/api/auth/me')
            .expect(401);
    });
});
