import { Module, Controller, Get } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './prisma/prisma.module';
import { GitHubModule } from './github/github.module';
import { QueueModule } from './queue/queue.module';
import { AIModule } from './ai/ai.module';
import { AnalysisModule } from './analysis/analysis.module';
import { ReviewModule } from './review/review.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { AuthModule } from './auth/auth.module';
import { LearningModule } from './learning/learning.module';
import { BillingModule } from './billing/billing.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ReposModule } from './repos/repos.module';
import { PullsModule } from './pulls/pulls.module';
import { ConversationModule } from './conversation/conversation.module';
import { HealthModule } from './health/health.module';
import appConfig from './config/app.config';
import githubConfig from './config/github.config';
import llmConfig from './config/llm.config';
import redisConfig from './config/redis.config';
import databaseConfig from './config/database.config';
import authConfig from './config/auth.config';
import billingConfig from './config/billing.config';

@Module({
    imports: [
        // ── Configuration ────────────────────────────────────────────────
        ConfigModule.forRoot({
            isGlobal: true,
            load: [appConfig, githubConfig, llmConfig, redisConfig, databaseConfig, authConfig, billingConfig],
        }),

        // ── BullMQ (backed by Redis) ─────────────────────────────────────
        BullModule.forRoot({
            connection: {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379', 10),
            },
        }),

        // ── Feature Modules ──────────────────────────────────────────────
        PrismaModule,
        GitHubModule,
        QueueModule,
        AIModule,
        AnalysisModule,
        ReviewModule,
        OnboardingModule,
        ConversationModule,
        AuthModule,
        LearningModule,
        BillingModule,
        DashboardModule,
        ReposModule,
        PullsModule,
        HealthModule,
    ],
})
export class AppModule { }
