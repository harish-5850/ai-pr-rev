import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrReviewProducer } from './pr-review.producer';
import { ConversationProducer } from './conversation.producer';
import { PR_REVIEW_QUEUE, CONVERSATION_QUEUE } from './queue.constants';

export { PR_REVIEW_QUEUE, CONVERSATION_QUEUE };

@Global()
@Module({
    imports: [
        BullModule.registerQueue({ name: PR_REVIEW_QUEUE }),
        BullModule.registerQueue({ name: CONVERSATION_QUEUE }),
    ],
    providers: [
        PrReviewProducer,
        ConversationProducer,
    ],
    exports: [PrReviewProducer, ConversationProducer],
})
export class QueueModule { }
