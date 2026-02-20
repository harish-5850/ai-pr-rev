import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) { }

    @Get('stats')
    getStats() {
        return this.dashboardService.getStats();
    }

    @Get('recent-reviews')
    getRecentReviews(@Query('limit') limit?: string) {
        return this.dashboardService.getRecentReviews(
            limit ? parseInt(limit, 10) : 10,
        );
    }

    @Get('issue-trends')
    getIssueTrends(@Query('weeks') weeks?: string) {
        return this.dashboardService.getIssueTrends(
            weeks ? parseInt(weeks, 10) : 12,
        );
    }

    @Get('severity-breakdown')
    getSeverityBreakdown() {
        return this.dashboardService.getSeverityBreakdown();
    }
}
