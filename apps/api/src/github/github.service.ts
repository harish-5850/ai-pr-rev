import { Injectable, Logger } from '@nestjs/common';
import { GitHubAppProvider } from './github-app.provider';

export interface PullRequestData {
    owner: string;
    repo: string;
    pullNumber: number;
    title: string;
    body: string | null;
    authorLogin: string;
    baseBranch: string;
    headBranch: string;
    installationId: number;
}

export interface PRFile {
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
    patch?: string;
}

@Injectable()
export class GitHubService {
    private readonly logger = new Logger(GitHubService.name);

    constructor(private readonly githubApp: GitHubAppProvider) { }

    /**
     * Fetch the diff/patch for a pull request
     */
    async getPullRequestDiff(
        installationId: number,
        owner: string,
        repo: string,
        pullNumber: number,
    ): Promise<string> {
        const octokit = await this.githubApp.getInstallationOctokit(installationId);

        const { data } = await octokit.request(
            'GET /repos/{owner}/{repo}/pulls/{pull_number}',
            {
                owner,
                repo,
                pull_number: pullNumber,
                mediaType: { format: 'diff' },
            },
        );

        return data as unknown as string;
    }

    /**
     * Fetch the list of files changed in a PR
     */
    async getPullRequestFiles(
        installationId: number,
        owner: string,
        repo: string,
        pullNumber: number,
    ): Promise<PRFile[]> {
        const octokit = await this.githubApp.getInstallationOctokit(installationId);

        const { data } = await octokit.request(
            'GET /repos/{owner}/{repo}/pulls/{pull_number}/files',
            {
                owner,
                repo,
                pull_number: pullNumber,
                per_page: 100,
            },
        );

        return data.map((file: any) => ({
            filename: file.filename,
            status: file.status,
            additions: file.additions,
            deletions: file.deletions,
            changes: file.changes,
            patch: file.patch,
        }));
    }

    /**
     * Post a review comment on a PR (summary)
     */
    async createReviewComment(
        installationId: number,
        owner: string,
        repo: string,
        pullNumber: number,
        body: string,
    ): Promise<void> {
        const octokit = await this.githubApp.getInstallationOctokit(installationId);

        await octokit.request(
            'POST /repos/{owner}/{repo}/issues/{issue_number}/comments',
            {
                owner,
                repo,
                issue_number: pullNumber,
                body,
            },
        );

        this.logger.log(
            `Posted review comment on ${owner}/${repo}#${pullNumber}`,
        );
    }

    /**
     * Post an inline review with comments on specific files/lines
     */
    async createPullRequestReview(
        installationId: number,
        owner: string,
        repo: string,
        pullNumber: number,
        body: string,
        comments: Array<{
            path: string;
            line: number;
            body: string;
        }>,
    ): Promise<void> {
        const octokit = await this.githubApp.getInstallationOctokit(installationId);

        await octokit.request(
            'POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews',
            {
                owner,
                repo,
                pull_number: pullNumber,
                body,
                event: 'COMMENT',
                comments: comments.map((c) => ({
                    path: c.path,
                    line: c.line,
                    body: c.body,
                })),
            },
        );

        this.logger.log(
            `Posted PR review with ${comments.length} inline comments on ${owner}/${repo}#${pullNumber}`,
        );
    }

    /**
     * Fetch repository metadata
     */
    async getRepository(
        installationId: number,
        owner: string,
        repo: string,
    ) {
        const octokit = await this.githubApp.getInstallationOctokit(installationId);

        const { data } = await octokit.request(
            'GET /repos/{owner}/{repo}',
            { owner, repo },
        );

        return {
            id: data.id,
            name: data.name,
            fullName: data.full_name,
            defaultBranch: data.default_branch,
            language: data.language,
        };
    }

    /**
     * List all repositories accessible to an installation
     */
    async listInstallationRepos(installationId: number) {
        const octokit = await this.githubApp.getInstallationOctokit(installationId);

        const { data } = await octokit.request('GET /installation/repositories', {
            per_page: 100,
        });

        return data.repositories.map((repo: any) => ({
            id: repo.id,
            name: repo.name,
            fullName: repo.full_name,
            defaultBranch: repo.default_branch,
            language: repo.language,
            owner: {
                id: repo.owner.id,
                login: repo.owner.login,
                avatarUrl: repo.owner.avatar_url,
            },
        }));
    }

    /**
     * List all installations of the app
     */
    async listInstallations() {
        const app = this.githubApp.getApp();
        const { data } = await app.octokit.request('GET /app/installations');
        return data;
    }

    /**
     * Fetch a single comment by ID
     */
    async getComment(
        installationId: number,
        owner: string,
        repo: string,
        commentId: number,
    ): Promise<{ id: number; body: string; author: string }> {
        const octokit = await this.githubApp.getInstallationOctokit(installationId);

        const { data } = await octokit.request(
            'GET /repos/{owner}/{repo}/issues/comments/{comment_id}',
            {
                owner,
                repo,
                comment_id: commentId,
            },
        );

        return {
            id: data.id,
            body: data.body || '',
            author: data.user?.login || 'unknown',
        };
    }

    /**
     * Fetch all comments on a PR (issue comments) for conversation thread context
     */
    async getCommentThread(
        installationId: number,
        owner: string,
        repo: string,
        pullNumber: number,
    ): Promise<Array<{ id: number; body: string; author: string; createdAt: string }>> {
        const octokit = await this.githubApp.getInstallationOctokit(installationId);

        const { data } = await octokit.request(
            'GET /repos/{owner}/{repo}/issues/{issue_number}/comments',
            {
                owner,
                repo,
                issue_number: pullNumber,
                per_page: 100,
                sort: 'created',
                direction: 'asc',
            },
        );

        return data.map((comment: any) => ({
            id: comment.id,
            body: comment.body || '',
            author: comment.user?.login || 'unknown',
            createdAt: comment.created_at,
        }));
    }

    /**
     * Reply to a specific comment on a PR
     */
    async replyToComment(
        installationId: number,
        owner: string,
        repo: string,
        pullNumber: number,
        _commentId: number,
        body: string,
    ): Promise<void> {
        const octokit = await this.githubApp.getInstallationOctokit(installationId);

        // GitHub doesn't support direct replies to issue comments via API,
        // so we post a new comment that references the user
        await octokit.request(
            'POST /repos/{owner}/{repo}/issues/{issue_number}/comments',
            {
                owner,
                repo,
                issue_number: pullNumber,
                body,
            },
        );

        this.logger.log(
            `Posted reply on ${owner}/${repo}#${pullNumber}`,
        );
    }
}
