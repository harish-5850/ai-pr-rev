import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { createHash } from 'crypto';
import { AIReviewResult } from './llm.service';

@Injectable()
export class AICacheService {
    private readonly logger = new Logger(AICacheService.name);
    private redis: Redis | null = null;
    private readonly TTL_SECONDS = 86400; // 24 hours

    constructor(private readonly configService: ConfigService) {
        try {
            this.redis = new Redis({
                host: this.configService.get<string>('redis.host') || 'localhost',
                port: this.configService.get<number>('redis.port') || 6379,
                maxRetriesPerRequest: 3,
                lazyConnect: true,
            });
            this.redis.connect().catch((err) => {
                this.logger.warn('Redis not available for AI caching', err.message);
                this.redis = null;
            });
        } catch {
            this.logger.warn('Redis not available for AI caching');
        }
    }

    private hashKey(diff: string): string {
        return `ai-review:${createHash('sha256').update(diff).digest('hex')}`;
    }

    async get(diff: string): Promise<AIReviewResult | null> {
        if (!this.redis) return null;
        try {
            const value = await this.redis.get(this.hashKey(diff));
            return value ? JSON.parse(value) : null;
        } catch {
            return null;
        }
    }

    async set(diff: string, result: AIReviewResult): Promise<void> {
        if (!this.redis) return;
        try {
            await this.redis.setex(
                this.hashKey(diff),
                this.TTL_SECONDS,
                JSON.stringify(result),
            );
        } catch {
            this.logger.warn('Failed to cache AI review result');
        }
    }
}
