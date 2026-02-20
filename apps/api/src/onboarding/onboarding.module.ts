import { Module } from '@nestjs/common';
import { CloneService } from './clone.service';
import { TechDetectionService } from './tech-detection.service';
import { EmbeddingsService } from './embeddings.service';

@Module({
    providers: [CloneService, TechDetectionService, EmbeddingsService],
    exports: [CloneService, TechDetectionService, EmbeddingsService],
})
export class OnboardingModule { }
