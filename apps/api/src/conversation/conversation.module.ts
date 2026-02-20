import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConversationService } from './conversation.service';
import { ConversationPromptService } from './conversation-prompt.service';
import { IntentDetectorService } from './intent-detector.service';
import { ConversationConsumer } from '../queue/conversation.consumer';
import { AIModule } from '../ai/ai.module';
import { CONVERSATION_QUEUE } from '../queue/queue.constants';

@Module({
    imports: [
        AIModule,
        BullModule.registerQueue({ name: CONVERSATION_QUEUE }),
    ],
    providers: [
        ConversationService,
        ConversationPromptService,
        IntentDetectorService,
        ConversationConsumer,
    ],
    exports: [ConversationService, IntentDetectorService],
})
export class ConversationModule { }
