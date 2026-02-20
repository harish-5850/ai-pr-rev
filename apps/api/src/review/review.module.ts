import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ReviewOrchestrator } from './review-orchestrator.service';
import { CommentBuilderService } from './comment-builder.service';
import { PrioritizerService } from './prioritizer.service';
import { PrReviewConsumer } from '../queue/pr-review.consumer';
import { AIModule } from '../ai/ai.module';
import { AnalysisModule } from '../analysis/analysis.module';
import { OnboardingModule } from '../onboarding/onboarding.module';
import { LearningModule } from '../learning/learning.module';
import { PR_REVIEW_QUEUE } from '../queue/queue.constants';

@Module({
    imports: [
        AIModule,
        AnalysisModule,
        BullModule.registerQueue({ name: PR_REVIEW_QUEUE }),
        OnboardingModule,
        LearningModule,
    ],
    providers: [ReviewOrchestrator, CommentBuilderService, PrioritizerService, PrReviewConsumer],
    exports: [ReviewOrchestrator],
})
export class ReviewModule { }
