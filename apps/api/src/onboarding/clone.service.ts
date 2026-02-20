import { Injectable, Logger } from '@nestjs/common';
import { simpleGit, SimpleGit } from 'simple-git';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';
import { GitHubAppProvider } from '../github/github-app.provider';

@Injectable()
export class CloneService {
    private readonly logger = new Logger(CloneService.name);

    constructor(private readonly githubApp: GitHubAppProvider) { }

    /**
     * Clone a repository to a temporary directory
     * Returns the path to the cloned repo
     */
    async cloneRepo(
        installationId: number,
        owner: string,
        repo: string,
    ): Promise<string> {
        const tmpDir = path.join(os.tmpdir(), 'ai-pr-reviewer', `${owner}-${repo}-${Date.now()}`);
        await fs.mkdir(tmpDir, { recursive: true });

        // Get installation token for authenticated clone
        const octokit = await this.githubApp.getInstallationOctokit(installationId);
        const { token } = await (octokit as any).auth({ type: 'installation' }) as { token: string };

        const cloneUrl = `https://x-access-token:${token}@github.com/${owner}/${repo}.git`;

        this.logger.log(`Cloning ${owner}/${repo} to ${tmpDir}...`);

        const git: SimpleGit = simpleGit();
        await git.clone(cloneUrl, tmpDir, ['--depth', '1']);

        this.logger.log(`Clone complete: ${tmpDir}`);
        return tmpDir;
    }

    /**
     * Cleanup a cloned repository
     */
    async cleanup(repoPath: string): Promise<void> {
        try {
            await fs.rm(repoPath, { recursive: true, force: true });
            this.logger.log(`Cleaned up: ${repoPath}`);
        } catch (error) {
            this.logger.warn(`Failed to cleanup ${repoPath}`, error);
        }
    }
}
