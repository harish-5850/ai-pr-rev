import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConversationJobData } from '../conversation/conversation.service';
import { CONVERSATION_QUEUE } from './queue.constants';

@Injectable()
export class ConversationProducer {
    private readonly logger = new Logger(ConversationProducer.name);

    constructor(
        @InjectQueue(CONVERSATION_QUEUE) private readonly queue: Queue,
    ) { }

    async addConversationJob(data: ConversationJobData) {
        const job = await this.queue.add('conversation', data, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 3000,
            },
            removeOnComplete: { count: 200 },
            removeOnFail: { count: 100 },
        });

        this.logger.log(
            `Added conversation job ${job.id} for comment ${data.commentId} on PR #${data.pullNumber}`,
        );
        return job;
    }
}
