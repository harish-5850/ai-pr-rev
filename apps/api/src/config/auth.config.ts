import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
    jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    cookieName: 'ai_pr_token',
    cookieMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
}));
