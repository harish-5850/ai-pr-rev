import { Module } from '@nestjs/common';
import { LLMService } from './llm.service';
import { PromptBuilderService } from './prompt-builder.service';
import { AICacheService } from './ai-cache.service';
import { LearningModule } from '../learning/learning.module';

@Module({
    imports: [LearningModule],
    providers: [LLMService, PromptBuilderService, AICacheService],
    exports: [LLMService, PromptBuilderService],
})
export class AIModule { }
