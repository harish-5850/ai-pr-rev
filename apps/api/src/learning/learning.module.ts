import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ExperienceLevelService } from './experience-level.service';
import { AdaptiveExplanationService } from './adaptive-explanation.service';

@Module({
    imports: [PrismaModule],
    providers: [ExperienceLevelService, AdaptiveExplanationService],
    exports: [ExperienceLevelService, AdaptiveExplanationService],
})
export class LearningModule { }
