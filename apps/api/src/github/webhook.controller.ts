import {
    Controller,
    Post,
    Req,
    Res,
    Headers,
    Logger,
    RawBodyRequest,
    Inject,
    forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { Webhooks } from '@octokit/webhooks';
import { PrReviewProducer } from '../queue/pr-review.producer';
import { ConversationProducer } from '../queue/conversation.producer';
import { PrismaService } from '../prisma/prisma.service';

@Controller('webhooks')
export class WebhookController {
    private readonly logger = new Logger(WebhookController.name);
    private webhooks: Webhooks | null = null;
    private readonly botName: string;

    constructor(
        private readonly configService: ConfigService,
        @Inject(forwardRef(() => PrReviewProducer))
        private readonly prReviewProducer: PrReviewProducer,
        @Inject(forwardRef(() => ConversationProducer))
        private readonly conversationProducer: ConversationProducer,
        private readonly prisma: PrismaService,
    ) {
        const secret = this.configService.get<string>('github.webhookSecret');
        if (secret) {
            this.webhooks = new Webhooks({ secret });
        }
        this.botName = this.configService.get<string>('github.botName') || 'ai-pr-reviewer';
    }

    @Post('github')
    async handleGitHubWebhook(
        @Req() req: RawBodyRequest<Request>,
        @Res() res: Response,
        @Headers('x-github-event') event: string,
        @Headers('x-hub-signature-256') signature: string,
        @Headers('x-github-delivery') deliveryId: string,
    ) {
        // Always respond quickly
        res.status(200).json({ received: true });

        this.logger.log(
            `Received GitHub webhook: event=${event}, delivery=${deliveryId}`,
        );

        // ── Verify signature ──────────────────────────────────────────
        if (this.webhooks && req.rawBody) {
            try {
                await this.webhooks.verify(
                    req.rawBody.toString('utf8'),
                    signature,
                );
            } catch (err) {
                this.logger.error('Webhook signature verification failed', err);
                return;
            }
        }

        // ── Handle pull_request events ────────────────────────────────
        if (event === 'pull_request') {
            const payload = req.body;
            const action = payload.action;

            if (action === 'opened' || action === 'synchronize') {
                await this.handlePullRequestEvent(payload);
            }
        }

        // ── Handle issue_comment events (@mention / conversation) ─────
        if (event === 'issue_comment') {
            const payload = req.body;
            if (payload.action === 'created') {
                await this.handleIssueCommentEvent(payload);
            }
        }

        // ── Handle installation events ────────────────────────────────
        if (event === 'installation') {
            const payload = req.body;
            await this.handleInstallationEvent(payload);
        }
    }

    private async handlePullRequestEvent(payload: any) {
        const pr = payload.pull_request;
        const repo = payload.repository;
        const installationId = payload.installation?.id;

        if (!installationId) {
            this.logger.warn('No installation ID in webhook payload');
            return;
        }

        this.logger.log(
            `Processing PR #${pr.number} "${pr.title}" on ${repo.full_name}`,
        );

        // Upsert repository
        const repository = await this.prisma.repository.upsert({
            where: { githubId: repo.id },
            update: { name: repo.name, fullName: repo.full_name },
            create: {
                githubId: repo.id,
                name: repo.name,
                fullName: repo.full_name,
                defaultBranch: repo.default_branch || 'main',
                language: repo.language,
                organization: {
                    connectOrCreate: {
                        where: { githubId: repo.owner.id },
                        create: {
                            githubId: repo.owner.id,
                            name: repo.owner.login,
                            installationId,
                            avatarUrl: repo.owner.avatar_url,
                        },
                    },
                },
            },
        });

        // Upsert pull request
        const pullRequest = await this.prisma.pullRequest.upsert({
            where: {
                repositoryId_number: {
                    repositoryId: repository.id,
                    number: pr.number,
                },
            },
            update: {
                title: pr.title,
                body: pr.body,
                state: pr.state,
            },
            create: {
                githubId: pr.id,
                number: pr.number,
                title: pr.title,
                body: pr.body,
                state: pr.state,
                authorLogin: pr.user.login,
                baseBranch: pr.base.ref,
                headBranch: pr.head.ref,
                repositoryId: repository.id,
            },
        });

        // Create a review record
        const review = await this.prisma.review.create({
            data: {
                status: 'PENDING',
                pullRequestId: pullRequest.id,
            },
        });

        // Enqueue the review job
        await this.prReviewProducer.addReviewJob({
            reviewId: review.id,
            pullRequestId: pullRequest.id,
            repositoryId: repository.id,
            installationId,
            owner: repo.owner.login,
            repo: repo.name,
            pullNumber: pr.number,
        });

        this.logger.log(
            `Enqueued review job for ${repo.full_name}#${pr.number} (reviewId=${review.id})`,
        );
    }

    private async handleIssueCommentEvent(payload: any) {
        const comment = payload.comment;
        const issue = payload.issue;
        const repo = payload.repository;
        const installationId = payload.installation?.id;

        if (!installationId) {
            this.logger.warn('No installation ID in issue_comment webhook');
            return;
        }

        // Only handle comments on pull requests (GitHub sends issue_comment for PRs too)
        if (!issue.pull_request) {
            return;
        }

        // Check if the comment is directed at our bot
        const commentBody = comment.body || '';
        const isMentioned = commentBody
            .toLowerCase()
            .includes(`@${this.botName.toLowerCase()}`);
        const isBotAuthor =
            comment.user?.login?.toLowerCase() === this.botName.toLowerCase() ||
            comment.user?.type === 'Bot';

        // Skip if it's the bot's own comment
        if (isBotAuthor) {
            return;
        }

        // Only respond if the bot is @mentioned
        if (!isMentioned) {
            return;
        }

        this.logger.log(
            `@mention detected from ${comment.user.login} on ${repo.full_name}#${issue.number}`,
        );

        const pullNumber = issue.number;

        // Upsert repository (same as PR handler)
        const repository = await this.prisma.repository.upsert({
            where: { githubId: repo.id },
            update: { name: repo.name, fullName: repo.full_name },
            create: {
                githubId: repo.id,
                name: repo.name,
                fullName: repo.full_name,
                defaultBranch: repo.default_branch || 'main',
                language: repo.language,
                organization: {
                    connectOrCreate: {
                        where: { githubId: repo.owner.id },
                        create: {
                            githubId: repo.owner.id,
                            name: repo.owner.login,
                            installationId,
                            avatarUrl: repo.owner.avatar_url,
                        },
                    },
                },
            },
        });

        // Find or create the pull request record
        const pullRequest = await this.prisma.pullRequest.upsert({
            where: {
                repositoryId_number: {
                    repositoryId: repository.id,
                    number: pullNumber,
                },
            },
            update: {},
            create: {
                githubId: issue.id,
                number: pullNumber,
                title: issue.title,
                body: issue.body,
                state: issue.state,
                authorLogin: issue.user?.login || 'unknown',
                baseBranch: 'main',
                headBranch: 'unknown',
                repositoryId: repository.id,
            },
        });

        // Create conversation record
        const conversation = await this.prisma.conversation.create({
            data: {
                githubCommentId: comment.id,
                parentCommentId: null, // Will be resolved by ConversationService
                intent: 'GENERAL_QUESTION', // Will be updated by intent detection
                userMessage: commentBody,
                userLogin: comment.user.login,
                status: 'PENDING',
                pullRequestId: pullRequest.id,
            },
        });

        // Enqueue conversation job
        await this.conversationProducer.addConversationJob({
            conversationId: conversation.id,
            pullRequestId: pullRequest.id,
            repositoryId: repository.id,
            installationId,
            owner: repo.owner.login,
            repo: repo.name,
            pullNumber,
            commentId: comment.id,
            parentCommentId: null,
            userMessage: commentBody,
            userLogin: comment.user.login,
        });

        this.logger.log(
            `Enqueued conversation job for ${repo.full_name}#${pullNumber} (comment ${comment.id})`,
        );
    }

    private async handleInstallationEvent(payload: any) {
        const action = payload.action;
        const installation = payload.installation;
        const account = installation.account;

        this.logger.log(
            `Installation event: action=${action}, account=${account.login}`,
        );

        if (action === 'created') {
            await this.prisma.organization.upsert({
                where: { githubId: account.id },
                update: {
                    installationId: installation.id,
                    name: account.login,
                    avatarUrl: account.avatar_url,
                },
                create: {
                    githubId: account.id,
                    name: account.login,
                    installationId: installation.id,
                    avatarUrl: account.avatar_url,
                },
            });
        } else if (action === 'deleted') {
            await this.prisma.organization.updateMany({
                where: { githubId: account.id },
                data: { installationId: null },
            });
        }
    }
}
