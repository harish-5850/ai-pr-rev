import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExperienceLevel } from '@prisma/client';

@Injectable()
export class ExperienceLevelService {
    private readonly logger = new Logger(ExperienceLevelService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Detect experience level based on PR review history.
     * - JUNIOR: < 10 reviews received or < 30% resolution rate
     * - SENIOR: > 50 reviews received and > 70% resolution rate
     * - MID: everything else
     */
    async detectLevel(userLogin: string): Promise<ExperienceLevel> {
        const user = await this.prisma.user.findFirst({
            where: { login: userLogin },
        });

        if (!user) {
            return 'MID';
        }

        const { reviewsReceived, issuesResolved } = user;
        const resolutionRate =
            reviewsReceived > 0 ? issuesResolved / reviewsReceived : 0;

        let level: ExperienceLevel = 'MID';

        if (reviewsReceived < 10 || resolutionRate < 0.3) {
            level = 'JUNIOR';
        } else if (reviewsReceived > 50 && resolutionRate > 0.7) {
            level = 'SENIOR';
        }

        // Update stored level if changed
        if (user.experienceLevel !== level) {
            await this.prisma.user.update({
                where: { id: user.id },
                data: { experienceLevel: level },
            });
            this.logger.log(
                `Updated ${userLogin} experience level: ${user.experienceLevel} → ${level}`,
            );
        }

        return level;
    }

    /**
     * Increment review metrics after a review is processed
     */
    async updateMetrics(
        userLogin: string,
        issueCount: number,
    ): Promise<void> {
        const user = await this.prisma.user.findFirst({
            where: { login: userLogin },
        });

        if (!user) return;

        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                reviewsReceived: { increment: 1 },
                issuesResolved: { increment: Math.max(0, issueCount) },
            },
        });
    }
}
