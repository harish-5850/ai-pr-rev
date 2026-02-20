import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ConversationJobData } from '../conversation/conversation.service';
import { ConversationService } from '../conversation/conversation.service';
import { CONVERSATION_QUEUE } from './queue.constants';
import { PrismaService } from '../prisma/prisma.service';

@Processor(CONVERSATION_QUEUE, {
    concurrency: 10,
})
export class ConversationConsumer extends WorkerHost {
    private readonly logger = new Logger(ConversationConsumer.name);

    constructor(
        private readonly conversationService: ConversationService,
        private readonly prisma: PrismaService,
    ) {
        super();
    }

    async process(job: Job<ConversationJobData>): Promise<void> {
        const { conversationId, owner, repo, pullNumber, commentId } = job.data;

        this.logger.log(
            `Processing conversation job ${job.id}: ${owner}/${repo}#${pullNumber} (comment ${commentId})`,
        );

        try {
            await this.conversationService.handleConversation(job.data);

            this.logger.log(
                `Completed conversation for ${owner}/${repo}#${pullNumber} (comment ${commentId})`,
            );
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : 'Unknown error';

            this.logger.error(
                `Failed conversation for ${owner}/${repo}#${pullNumber}: ${errorMessage}`,
                error instanceof Error ? error.stack : undefined,
            );

            // Mark conversation as failed
            await this.prisma.conversation.update({
                where: { id: conversationId },
                data: { status: 'FAILED' },
            });

            throw error; // Re-throw so BullMQ retries
        }
    }
}
