import { Test, TestingModule } from '@nestjs/testing';
import { ReviewOrchestrator } from './review-orchestrator.service';
import { PrismaService } from '../prisma/prisma.service';
import { LLMService } from '../ai/llm.service';
import { TechDetectionService } from '../onboarding/tech-detection.service';
import { CloneService } from '../onboarding/clone.service';
import { ExperienceLevelService } from '../learning/experience-level.service';
import { AdaptiveExplanationService } from '../learning/adaptive-explanation.service';
import { PromptBuilderService } from '../ai/prompt-builder.service';
import { GitHubService } from '../github/github.service';
import { EslintRunnerService } from '../analysis/eslint-runner.service';
import { SemgrepRunnerService } from '../analysis/semgrep-runner.service';
import { ResultMergerService } from '../analysis/result-merger.service';
import { CommentBuilderService } from './comment-builder.service';
import { PrioritizerService } from './prioritizer.service';

describe('ReviewOrchestrator', () => {
    let service: ReviewOrchestrator;
    let prisma: PrismaService;
    let llmService: LLMService;

    const mockPrisma = {
        review: {
            findUnique: jest.fn().mockResolvedValue({ id: 'rev-1', pullRequest: { id: 'pr-1', authorLogin: 'test-user', title: 'Test PR', body: 'Test body' } }),
            update: jest.fn().mockResolvedValue({}),
        },
        repository: {
            findUnique: jest.fn().mockResolvedValue({ id: 'repo-1', fullName: 'test/repo', isActive: true }),
        },
        pullRequest: {
            findUnique: jest.fn().mockResolvedValue({ id: 'pr-1' }),
            findFirst: jest.fn().mockResolvedValue({ id: 'pr-1', authorLogin: 'test-user', title: 'Test PR', body: 'Test body' }),
            update: jest.fn().mockResolvedValue({}),
        },
        issue: {
            createMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        user: {
            findFirst: jest.fn().mockResolvedValue({ id: 'u-1', reviewsReceived: 0 }),
            update: jest.fn().mockResolvedValue({}),
        },
    };

    const mockLLM = {
        analyzePullRequest: jest.fn().mockResolvedValue({
            issues: [{ category: 'BUG', severity: 'HIGH', message: 'Test bug', filePath: 'test.ts' }],
            summary: 'Review summary',
        }),
    };

    const mockGithub = {
        getPullRequestDiff: jest.fn().mockResolvedValue('Mock diff content'),
        getPullRequestFiles: jest.fn().mockResolvedValue([{ filename: 'test.ts', status: 'modified' }]),
        postComment: jest.fn().mockResolvedValue({ id: 123 }),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ReviewOrchestrator,
                { provide: GitHubService, useValue: mockGithub },
                { provide: LLMService, useValue: mockLLM },
                { provide: EslintRunnerService, useValue: { run: jest.fn().mockResolvedValue([]) } },
                { provide: SemgrepRunnerService, useValue: { run: jest.fn().mockResolvedValue([]) } },
                { provide: ResultMergerService, useValue: { merge: jest.fn().mockReturnValue([]) } },
                { provide: CommentBuilderService, useValue: { buildComment: jest.fn().mockReturnValue('Mock comment'), buildSummaryComment: jest.fn().mockReturnValue('Mock summary') } },
                { provide: PrioritizerService, useValue: { prioritize: jest.fn().mockReturnValue([]) } },
                { provide: PrismaService, useValue: mockPrisma },
                { provide: TechDetectionService, useValue: { detectTechStack: jest.fn().mockResolvedValue(['typescript']) } },
                { provide: CloneService, useValue: { cloneAndCleanup: jest.fn().mockResolvedValue('/tmp/repo') } },
                { provide: ExperienceLevelService, useValue: { detectLevel: jest.fn().mockResolvedValue('INTERMEDIATE'), updateMetrics: jest.fn().mockResolvedValue(null) } },
                { provide: AdaptiveExplanationService, useValue: { getPromptModifier: jest.fn().mockReturnValue('Modifier') } },
                { provide: PromptBuilderService, useValue: { buildSystemPrompt: jest.fn().mockReturnValue('System'), buildUserPrompt: jest.fn().mockReturnValue('User') } },
            ],
        }).compile();

        service = module.get<ReviewOrchestrator>(ReviewOrchestrator);
        prisma = module.get<PrismaService>(PrismaService);
        llmService = module.get<LLMService>(LLMService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should successfully execute a review pipeline', async () => {
        const jobData = {
            owner: 'test-owner',
            repo: 'test-repo',
            pullNumber: 1,
            installationId: 12345,
            reviewId: 'rev-1',
            pullRequestId: 'pr-1',
            repositoryId: 'repo-1',
        };

        mockPrisma.review.findUnique.mockResolvedValue({
            id: 'rev-1',
            pullRequest: {
                id: 'pr-1',
                authorLogin: 'test-user',
                title: 'Test PR',
                body: 'Test body',
            },
        });

        mockLLM.analyzePullRequest.mockResolvedValue({
            issues: [
                { category: 'BUG', severity: 'HIGH', message: 'Test bug', filePath: 'test.ts' },
            ],
            summary: 'Review summary',
        });

        try {
            await service.executeReview(jobData);
        } catch (e) {
            console.error('EXECUTE_REVIEW_ERROR', e);
            throw e;
        }

        expect(mockPrisma.review.findUnique).toHaveBeenCalled();
        expect(mockLLM.analyzePullRequest).toHaveBeenCalled();
    });
});
