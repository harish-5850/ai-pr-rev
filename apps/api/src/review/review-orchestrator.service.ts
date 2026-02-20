import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrReviewJobData } from '../queue/pr-review.producer';
import { GitHubService } from '../github/github.service';
import { LLMService } from '../ai/llm.service';
import { EslintRunnerService } from '../analysis/eslint-runner.service';
import { SemgrepRunnerService } from '../analysis/semgrep-runner.service';
import { ResultMergerService, MergedIssue } from '../analysis/result-merger.service';
import { CommentBuilderService } from './comment-builder.service';
import { PrioritizerService } from './prioritizer.service';
import { PrismaService } from '../prisma/prisma.service';
import { TechDetectionService } from '../onboarding/tech-detection.service';
import { CloneService } from '../onboarding/clone.service';
import { ExperienceLevelService } from '../learning/experience-level.service';
import { AdaptiveExplanationService } from '../learning/adaptive-explanation.service';

@Injectable()
export class ReviewOrchestrator {
    private readonly logger = new Logger(ReviewOrchestrator.name);

    constructor(
        @Inject(forwardRef(() => GitHubService))
        private readonly githubService: GitHubService,
        private readonly llmService: LLMService,
        private readonly eslintRunner: EslintRunnerService,
        private readonly semgrepRunner: SemgrepRunnerService,
        private readonly resultMerger: ResultMergerService,
        private readonly commentBuilder: CommentBuilderService,
        private readonly prioritizer: PrioritizerService,
        private readonly prisma: PrismaService,
        private readonly techDetection: TechDetectionService,
        private readonly cloneService: CloneService,
        private readonly experienceLevelService: ExperienceLevelService,
        private readonly adaptiveExplanation: AdaptiveExplanationService,
    ) { }

    async executeReview(jobData: PrReviewJobData): Promise<void> {
        const {
            reviewId,
            repositoryId,
            installationId,
            owner,
            repo,
            pullNumber,
        } = jobData;

        this.logger.log(
            `Starting review pipeline for ${owner}/${repo}#${pullNumber}`,
        );

        // ── Step 1: Fetch PR diff and files ────────────────────────────
        const [diff, files] = await Promise.all([
            this.githubService.getPullRequestDiff(
                installationId,
                owner,
                repo,
                pullNumber,
            ),
            this.githubService.getPullRequestFiles(
                installationId,
                owner,
                repo,
                pullNumber,
            ),
        ]);

        this.logger.log(`Fetched diff (${diff.length} chars) and ${files.length} files`);

        // ── Step 2: Load repository context ────────────────────────────
        const repository = await this.prisma.repository.findUnique({
            where: { id: repositoryId },
        });

        const pullRequest = await this.prisma.pullRequest.findFirst({
            where: { repositoryId, number: pullNumber },
        });

        // ── Step 3: Clone and detect tech stack (if not onboarded) ─────
        let techStack = repository?.techStack as Record<string, any> | null;
        let repoPath: string | null = null;

        if (!repository?.isOnboarded) {
            try {
                repoPath = await this.cloneService.cloneRepo(
                    installationId,
                    owner,
                    repo,
                );
                techStack = await this.techDetection.detect(repoPath);

                await this.prisma.repository.update({
                    where: { id: repositoryId },
                    data: { techStack, isOnboarded: true },
                });
            } catch (error) {
                this.logger.warn('Repo onboarding failed, continuing without context', error);
            }
        }

        // ── Step 3b: Detect author experience level ────────────────────
        const authorLogin = pullRequest?.authorLogin || '';
        const experienceLevel = await this.experienceLevelService.detectLevel(authorLogin);
        const experienceModifier = this.adaptiveExplanation.getPromptModifier(experienceLevel);

        // ── Step 4: Run AI analysis ────────────────────────────────────
        const aiResult = await this.llmService.analyzePullRequest({
            diff,
            files,
            prTitle: pullRequest?.title || '',
            prBody: pullRequest?.body || null,
            techStack,
            repoFullName: `${owner}/${repo}`,
            experienceLevel,
        });

        // ── Step 5: Run static analysis (in parallel) ──────────────────
        const changedFilenames = files.map((f) => f.filename);
        let eslintIssues: any[] = [];
        let semgrepIssues: any[] = [];

        if (repoPath) {
            [eslintIssues, semgrepIssues] = await Promise.all([
                this.eslintRunner.analyze(repoPath, changedFilenames),
                this.semgrepRunner.analyze(repoPath, changedFilenames),
            ]);
        }

        // ── Step 6: Merge and prioritize results ───────────────────────
        const mergedIssues = this.resultMerger.merge(
            aiResult.issues,
            eslintIssues,
            semgrepIssues,
        );

        const prioritizedIssues = this.prioritizer.prioritize(mergedIssues);

        // ── Step 7: Save issues to database ────────────────────────────
        await this.saveIssues(reviewId, prioritizedIssues);

        // ── Step 8: Build and post comments ────────────────────────────
        const summaryComment = this.commentBuilder.buildSummaryComment(
            aiResult.summary,
            prioritizedIssues,
        );

        const inlineComments = this.commentBuilder.buildInlineComments(
            prioritizedIssues,
        );

        // Post summary comment
        await this.githubService.createReviewComment(
            installationId,
            owner,
            repo,
            pullNumber,
            summaryComment,
        );

        // Post inline review if there are line-specific comments
        if (inlineComments.length > 0) {
            await this.githubService.createPullRequestReview(
                installationId,
                owner,
                repo,
                pullNumber,
                '',
                inlineComments,
            );
        }

        // ── Step 9: Cleanup cloned repo ────────────────────────────────
        if (repoPath) {
            await this.cloneService.cleanup(repoPath);
        }

        // Update review summary
        await this.prisma.review.update({
            where: { id: reviewId },
            data: { summary: aiResult.summary },
        });

        this.logger.log(
            `Review complete for ${owner}/${repo}#${pullNumber}: ${prioritizedIssues.length} issues posted`,
        );

        // ── Step 10: Update author learning metrics ─────────────────────
        if (authorLogin) {
            await this.experienceLevelService.updateMetrics(
                authorLogin,
                prioritizedIssues.length,
            );
        }
    }

    private async saveIssues(
        reviewId: string,
        issues: MergedIssue[],
    ): Promise<void> {
        if (issues.length === 0) return;

        await this.prisma.issue.createMany({
            data: issues.map((issue) => ({
                severity: issue.severity,
                category: issue.category,
                filePath: issue.filePath,
                startLine: issue.startLine,
                endLine: issue.endLine,
                title: issue.title,
                description: issue.description,
                suggestion: issue.suggestion,
                source: issue.source,
                reviewId,
            })),
        });
    }
}
