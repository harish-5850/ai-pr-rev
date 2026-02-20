import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { App } from '@octokit/app';

@Injectable()
export class GitHubAppProvider {
    private app: App | null = null;
    private readonly logger = new Logger(GitHubAppProvider.name);

    constructor(private readonly configService: ConfigService) { }

    getApp(): App {
        if (!this.app) {
            const appId = this.configService.get<string>('github.appId');
            const privateKey = this.configService.get<string>('github.privateKey');

            if (!appId || !privateKey) {
                this.logger.warn(
                    'GitHub App credentials not configured. GitHub integration will not work.',
                );
                throw new Error('GitHub App credentials not configured');
            }

            this.app = new App({
                appId,
                privateKey,
            });
        }
        return this.app;
    }

    async getInstallationOctokit(installationId: number) {
        const app = this.getApp();
        return app.getInstallationOctokit(installationId);
    }
}
