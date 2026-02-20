import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { GitHubService } from '../github/github.service';
import { PrismaService } from '../prisma/prisma.service';
import { IntentDetectorService } from './intent-detector.service';
import {
    ConversationPromptService,
    ConversationContext,
} from './conversation-prompt.service';
import { PrReviewProducer } from '../queue/pr-review.producer';

export interface ConversationJobData {
    conversationId: string;
    pullRequestId: string;
    repositoryId: string;
    installationId: number;
    owner: string;
    repo: string;
    pullNumber: number;
    commentId: number;
    parentCommentId: number | null;
    userMessage: string;
    userLogin: string;
}

@Injectable()
export class ConversationService {
    private readonly logger = new Logger(ConversationService.name);
    private client: Anthropic | null = null;

    constructor(
        private readonly configService: ConfigService,
        @Inject(forwardRef(() => GitHubService))
        private readonly githubService: GitHubService,
        private readonly prisma: PrismaService,
        private readonly intentDetector: IntentDetectorService,
        private readonly promptService: ConversationPromptService,
        @Inject(forwardRef(() => PrReviewProducer))
        private readonly prReviewProducer: PrReviewProducer,
    ) { }

    private getClient(): Anthropic {
        if (!this.client) {
            const apiKey = this.configService.get<string>('llm.anthropicApiKey');
            if (!apiKey) {
                throw new Error('Anthropic API key not configured');
            }
            this.client = new Anthropic({ apiKey });
        }
        return this.client;
    }

    async handleConversation(jobData: ConversationJobData): Promise<void> {
        const {
            conversationId,
            installationId,
            owner,
            repo,
            pullNumber,
            commentId,
            parentCommentId,
            userMessage,
            userLogin,
            repositoryId,
        } = jobData;

        this.logger.log(
            `Handling conversation for ${owner}/${repo}#${pullNumber} (comment ${commentId})`,
        );

        // ── Step 1: Detect intent ──────────────────────────────────────
        const intent = this.intentDetector.detect(userMessage);
        this.logger.log(`Detected intent: ${intent}`);

        // Update conversation with detected intent
        await this.prisma.conversation.update({
            where: { id: conversationId },
            data: { intent, status: 'PROCESSING' },
        });

        // ── Step 2: Handle RE_REVIEW by re-running the review pipeline ─
        if (intent === 'RE_REVIEW') {
            await this.handleReReview(jobData);
            return;
        }

        // ── Step 3: Handle DISMISS by acknowledging ────────────────────
        if (intent === 'DISMISS') {
            const response =
                '✅ Got it — dismissing this finding. Thanks for the feedback, it helps me improve future reviews!';
            await this.postResponseAndUpdate(
                conversationId,
                installationId,
                owner,
                repo,
                pullNumber,
                commentId,
                response,
            );
            return;
        }

        // ── Step 4: Build context for AI response ──────────────────────
        const context = await this.buildContext(jobData, intent);

        // ── Step 5: Generate AI response ───────────────────────────────
        const response = await this.generateResponse(context);

        // ── Step 6: Post the response on GitHub ────────────────────────
        await this.postResponseAndUpdate(
            conversationId,
            installationId,
            owner,
            repo,
            pullNumber,
            commentId,
            response,
        );
    }

    private async buildContext(
        jobData: ConversationJobData,
        intent: string,
    ): Promise<ConversationContext> {
        const {
            installationId,
            owner,
            repo,
            pullNumber,
            parentCommentId,
            userMessage,
            userLogin,
            repositoryId,
        } = jobData;

        // Fetch original bot comment (the parent in the thread)
        let originalBotComment: string | null = null;
        if (parentCommentId) {
            try {
                const comment = await this.githubService.getComment(
                    installationId,
                    owner,
                    repo,
                    parentCommentId,
                );
                originalBotComment = comment.body;
            } catch (err) {
                this.logger.warn('Could not fetch parent comment', err);
            }
        }

        // Fetch thread history from the PR comments
        let threadHistory: Array<{ author: string; body: string }> = [];
        try {
            const allComments = await this.githubService.getCommentThread(
                installationId,
                owner,
                repo,
                pullNumber,
            );

            // Filter to the conversation thread (same parent or same review thread)
            threadHistory = allComments
                .filter((c) => c.id !== jobData.commentId) // Exclude the current message
                .slice(-5) // Last 5 messages for context
                .map((c) => ({
                    author: c.author,
                    body: c.body,
                }));
        } catch (err) {
            this.logger.warn('Could not fetch comment thread', err);
        }

        // Get diff snippet for the relevant file
        let diffSnippet: string | null = null;
        let filePath: string | null = null;

        // Try to extract file path from the original bot comment
        if (originalBotComment) {
            const fileMatch = originalBotComment.match(
                /\*\*File\*\*:\s*`([^`]+)`/,
            );
            if (fileMatch) {
                filePath = fileMatch[1];

                // Fetch the PR files to get the relevant patch
                try {
                    const files = await this.githubService.getPullRequestFiles(
                        installationId,
                        owner,
                        repo,
                        pullNumber,
                    );
                    const matchedFile = files.find(
                        (f) => f.filename === filePath,
                    );
                    if (matchedFile?.patch) {
                        diffSnippet = matchedFile.patch;
                    }
                } catch (err) {
                    this.logger.warn('Could not fetch PR files for diff', err);
                }
            }
        }

        // Load repo and PR metadata
        const repository = await this.prisma.repository.findUnique({
            where: { id: repositoryId },
        });

        const pullRequest = await this.prisma.pullRequest.findFirst({
            where: { repositoryId, number: pullNumber },
        });

        // Find the latest review for this PR
        const latestReview = await this.prisma.review.findFirst({
            where: {
                pullRequestId: pullRequest?.id,
                status: 'COMPLETED',
            },
            orderBy: { createdAt: 'desc' },
        });

        // Link conversation to review if found
        if (latestReview) {
            await this.prisma.conversation.update({
                where: { id: jobData.conversationId },
                data: { reviewId: latestReview.id },
            });
        }

        return {
            intent: intent as any,
            userMessage,
            userLogin,
            originalBotComment,
            threadHistory,
            diffSnippet,
            filePath,
            prTitle: pullRequest?.title || '',
            prBody: pullRequest?.body || null,
            techStack: (repository?.techStack as Record<string, any>) || null,
            repoFullName: `${jobData.owner}/${jobData.repo}`,
        };
    }

    private async generateResponse(
        context: ConversationContext,
    ): Promise<string> {
        const client = this.getClient();
        const model =
            this.configService.get<string>('llm.model') || 'claude-sonnet-4-20250514';
        const maxTokens =
            this.configService.get<number>('llm.maxTokens') || 4096;

        const systemPrompt = this.promptService.buildSystemPrompt(
            context.intent,
        );
        const userPrompt = this.promptService.buildUserPrompt(context);

        this.logger.log(
            `Generating conversation response (intent: ${context.intent})`,
        );

        try {
            const response = await client.messages.create({
                model,
                max_tokens: maxTokens,
                system: systemPrompt,
                messages: [{ role: 'user', content: userPrompt }],
            });

            const content = response.content[0];
            if (content.type !== 'text') {
                throw new Error('Unexpected response type from Claude');
            }

            return content.text;
        } catch (error) {
            this.logger.error('Failed to generate conversation response', error);
            return '⚠️ I encountered an error generating a response. Please try again or rephrase your question.';
        }
    }

    private async handleReReview(jobData: ConversationJobData): Promise<void> {
        const {
            conversationId,
            installationId,
            owner,
            repo,
            pullNumber,
            commentId,
            repositoryId,
        } = jobData;

        // Acknowledge the re-review request
        await this.githubService.replyToComment(
            installationId,
            owner,
            repo,
            pullNumber,
            commentId,
            '🔄 On it — re-reviewing the latest changes now. I\'ll post updated findings shortly.',
        );

        // Find or create a new review record
        const pullRequest = await this.prisma.pullRequest.findFirst({
            where: { repositoryId, number: pullNumber },
        });

        if (!pullRequest) {
            this.logger.error(
                `Cannot re-review: PR not found (${owner}/${repo}#${pullNumber})`,
            );
            return;
        }

        const review = await this.prisma.review.create({
            data: {
                status: 'PENDING',
                pullRequestId: pullRequest.id,
            },
        });

        // Enqueue a full review job
        await this.prReviewProducer.addReviewJob({
            reviewId: review.id,
            pullRequestId: pullRequest.id,
            repositoryId,
            installationId,
            owner,
            repo,
            pullNumber,
        });

        // Mark conversation as completed
        await this.prisma.conversation.update({
            where: { id: conversationId },
            data: {
                status: 'COMPLETED',
                botResponse: 'Re-review triggered',
            },
        });
    }

    private async postResponseAndUpdate(
        conversationId: string,
        installationId: number,
        owner: string,
        repo: string,
        pullNumber: number,
        commentId: number,
        response: string,
    ): Promise<void> {
        // Post reply on GitHub
        await this.githubService.replyToComment(
            installationId,
            owner,
            repo,
            pullNumber,
            commentId,
            response,
        );

        // Update conversation record
        await this.prisma.conversation.update({
            where: { id: conversationId },
            data: {
                status: 'COMPLETED',
                botResponse: response,
            },
        });

        this.logger.log(
            `Posted conversation response on ${owner}/${repo}#${pullNumber}`,
        );
    }
}
