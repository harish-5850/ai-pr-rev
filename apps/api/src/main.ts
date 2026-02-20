import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

// Polyfill for BigInt serialization to JSON
(BigInt.prototype as any).toJSON = function () {
    return this.toString();
};

async function bootstrap() {
    const logger = new Logger('Bootstrap');
    const app = await NestFactory.create(AppModule, {
        rawBody: true, // Required for webhook signature verification
    });

    app.use(cookieParser());
    app.setGlobalPrefix('api');

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );

    app.enableCors({
        origin: process.env.FRONTEND_URL || 'http://localhost:3001',
        credentials: true,
    });

    const port = process.env.PORT || 3000;
    await app.listen(port);
    logger.log(`🚀 API server running on http://localhost:${port}`);
}

bootstrap();
