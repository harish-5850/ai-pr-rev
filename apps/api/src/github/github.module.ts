import { Module, Global } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { GitHubService } from './github.service';
import { GitHubAppProvider } from './github-app.provider';

@Global()
@Module({
    controllers: [WebhookController],
    providers: [GitHubService, GitHubAppProvider],
    exports: [GitHubService, GitHubAppProvider],
})
export class GitHubModule { }
