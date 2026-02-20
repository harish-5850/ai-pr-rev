import { Controller, Get, Param, Patch, Post, UseGuards, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GitHubService } from '../github/github.service';

@Controller('repos')
@UseGuards(JwtAuthGuard)
export class ReposController {
    private readonly logger = new Logger(ReposController.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly github: GitHubService,
    ) { }

    @Post('sync')
    async sync() {
        this.logger.log('Starting manual repository sync...');
        try {
            // 1. Get all installations of the app
            const installations = await this.github.listInstallations();
            this.logger.log(`Found ${installations.length} installations`);

            let syncedCount = 0;

            for (const installation of installations) {
                const installationId = installation.id;
                const account = installation.account;

                if (!account) {
                    this.logger.warn(`Installation ${installationId} has no account data`);
                    continue;
                }

                this.logger.log(`Syncing organization: ${account.login} (ID: ${account.id})`);

                // Upsert organization for this installation
                const org = await this.prisma.organization.upsert({
                    where: { githubId: account.id },
                    update: {
                        name: account.login,
                        avatarUrl: account.avatar_url,
                        installationId,
                    },
                    create: {
                        githubId: account.id,
                        name: account.login,
                        avatarUrl: account.avatar_url,
                        installationId,
                    },
                });

                // 2. Fetch repos for this installation
                const repos = await this.github.listInstallationRepos(installationId);
                this.logger.log(`Found ${repos.length} repos for ${account.login}`);

                for (const r of repos) {
                    await this.prisma.repository.upsert({
                        where: { githubId: r.id },
                        update: {
                            name: r.name,
                            fullName: r.fullName,
                            defaultBranch: r.defaultBranch,
                            language: r.language,
                        },
                        create: {
                            githubId: r.id,
                            name: r.name,
                            fullName: r.fullName,
                            defaultBranch: r.defaultBranch,
                            language: r.language,
                            organizationId: org.id,
                        },
                    });
                    syncedCount++;
                }
            }

            this.logger.log(`Sync complete. Total repos synced: ${syncedCount}`);
            return { success: true, syncedCount };
        } catch (error) {
            this.logger.error(`Sync failed: ${error.message}`, error.stack);
            throw error;
        }
    }

    @Get()
    async list() {
        return this.prisma.repository.findMany({
            orderBy: { updatedAt: 'desc' },
            include: {
                organization: { select: { name: true } },
                _count: { select: { pullRequests: true } },
            },
        });
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.prisma.repository.findUnique({
            where: { id },
            include: {
                organization: { select: { name: true } },
                pullRequests: {
                    take: 20,
                    orderBy: { createdAt: 'desc' },
                    include: { _count: { select: { reviews: true } } },
                },
            },
        });
    }

    @Patch(':id/toggle')
    async toggle(@Param('id') id: string) {
        const repo = await this.prisma.repository.findUnique({ where: { id } });
        if (!repo) return { error: 'Not found' };

        return this.prisma.repository.update({
            where: { id },
            data: { isActive: !repo.isActive },
        });
    }
}
