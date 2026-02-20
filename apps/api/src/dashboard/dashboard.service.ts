import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
    constructor(private readonly prisma: PrismaService) { }

    async getStats() {
        const [totalRepos, totalPRs, totalReviews, totalIssues] =
            await Promise.all([
                this.prisma.repository.count(),
                this.prisma.pullRequest.count(),
                this.prisma.review.count(),
                this.prisma.issue.count(),
            ]);

        return { totalRepos, totalPRs, totalReviews, totalIssues };
    }

    async getRecentReviews(limit = 10) {
        return this.prisma.review.findMany({
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                pullRequest: {
                    include: {
                        repository: { select: { fullName: true } },
                    },
                },
                _count: { select: { issues: true } },
            },
        });
    }

    async getIssueTrends(weeks = 12) {
        const since = new Date();
        since.setDate(since.getDate() - weeks * 7);

        const issues = await this.prisma.issue.findMany({
            where: { createdAt: { gte: since } },
            select: { createdAt: true, severity: true },
            orderBy: { createdAt: 'asc' },
        });

        // Group by week
        const weeklyData: Record<string, { high: number; medium: number; low: number }> = {};
        issues.forEach((issue) => {
            const weekStart = getWeekStart(issue.createdAt);
            const key = weekStart.toISOString().split('T')[0];
            if (!weeklyData[key]) {
                weeklyData[key] = { high: 0, medium: 0, low: 0 };
            }
            const sev = issue.severity.toLowerCase() as 'high' | 'medium' | 'low';
            weeklyData[key][sev]++;
        });

        return Object.entries(weeklyData).map(([week, data]) => ({
            week,
            ...data,
        }));
    }

    async getSeverityBreakdown() {
        const issues = await this.prisma.issue.groupBy({
            by: ['severity'],
            _count: true,
        });

        return issues.reduce(
            (acc, item) => {
                acc[item.severity.toLowerCase()] = item._count;
                return acc;
            },
            { high: 0, medium: 0, low: 0 } as Record<string, number>,
        );
    }
}

function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
}
