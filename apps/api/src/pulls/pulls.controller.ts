import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('pulls')
@UseGuards(JwtAuthGuard)
export class PullsController {
    constructor(private readonly prisma: PrismaService) { }

    @Get()
    async list(
        @Query('page') page = '1',
        @Query('limit') limit = '20',
        @Query('status') status?: string,
        @Query('repoId') repoId?: string,
    ) {
        const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        const take = parseInt(limit, 10);

        const where: any = {};
        if (status) where.state = status;
        if (repoId) where.repositoryId = repoId;

        const [items, total] = await Promise.all([
            this.prisma.pullRequest.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                include: {
                    repository: { select: { fullName: true } },
                    _count: { select: { reviews: true } },
                },
            }),
            this.prisma.pullRequest.count({ where }),
        ]);

        return {
            items,
            total,
            page: parseInt(page, 10),
            totalPages: Math.ceil(total / take),
        };
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.prisma.pullRequest.findUnique({
            where: { id },
            include: {
                repository: { select: { fullName: true, name: true } },
                reviews: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        issues: {
                            orderBy: { severity: 'asc' },
                        },
                    },
                },
            },
        });
    }
}
