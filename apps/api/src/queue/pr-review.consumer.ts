import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrReviewJobData } from './pr-review.producer';
import { PR_REVIEW_QUEUE } from './queue.constants';
import { ReviewOrchestrator } from '../review/review-orchestrator.service';
import { PrismaService } from '../prisma/prisma.service';

@Processor(PR_REVIEW_QUEUE, {
    concurrency: 5,
})
export class PrReviewConsumer extends WorkerHost {
    private readonly logger = new Logger(PrReviewConsumer.name);

    constructor(
        private readonly reviewOrchestrator: ReviewOrchestrator,
        private readonly prisma: PrismaService,
    ) {
        super();
    }

    async process(job: Job<PrReviewJobData>): Promise<void> {
        const { reviewId, owner, repo, pullNumber } = job.data;
        const startTime = Date.now();

        this.logger.log(
            `Processing review job ${job.id}: ${owner}/${repo}#${pullNumber}`,
        );

        try {
            // Mark review as processing
            await this.prisma.review.update({
                where: { id: reviewId },
                data: { status: 'PROCESSING' },
            });

            // Run the full review pipeline
            await this.reviewOrchestrator.executeReview(job.data);

            // Mark review as completed
            const processingMs = Date.now() - startTime;
            await this.prisma.review.update({
                where: { id: reviewId },
                data: {
                    status: 'COMPLETED',
                    processingMs,
                },
            });

            this.logger.log(
                `Completed review for ${owner}/${repo}#${pullNumber} in ${processingMs}ms`,
            );
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : 'Unknown error';

            this.logger.error(
                `Failed review for ${owner}/${repo}#${pullNumber}: ${errorMessage}`,
                error instanceof Error ? error.stack : undefined,
            );

            // Mark review as failed
            await this.prisma.review.update({
                where: { id: reviewId },
                data: {
                    status: 'FAILED',
                    errorMessage,
                },
            });

            throw error; // Re-throw so BullMQ retries
        }
    }
}
