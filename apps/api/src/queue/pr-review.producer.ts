import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PR_REVIEW_QUEUE } from './queue.constants';

export interface PrReviewJobData {
    reviewId: string;
    pullRequestId: string;
    repositoryId: string;
    installationId: number;
    owner: string;
    repo: string;
    pullNumber: number;
}

@Injectable()
export class PrReviewProducer {
    private readonly logger = new Logger(PrReviewProducer.name);

    constructor(@InjectQueue(PR_REVIEW_QUEUE) private readonly queue: Queue) { }

    async addReviewJob(data: PrReviewJobData) {
        const job = await this.queue.add('review', data, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 5000,
            },
            removeOnComplete: { count: 100 },
            removeOnFail: { count: 50 },
        });

        this.logger.log(`Added review job ${job.id} for PR #${data.pullNumber}`);
        return job;
    }
}
