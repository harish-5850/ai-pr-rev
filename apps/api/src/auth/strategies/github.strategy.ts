import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';
import { AuthService } from '../auth.service';
// Note: auth.service is at ../auth.service relative to auth/strategies/

@Injectable()
export class GitHubStrategy extends PassportStrategy(Strategy, 'github') {
    private readonly logger = new Logger(GitHubStrategy.name);

    constructor(
        private readonly configService: ConfigService,
        private readonly authService: AuthService,
    ) {
        super({
            clientID: configService.get<string>('github.clientId') || 'MISSING',
            clientSecret: configService.get<string>('github.clientSecret') || 'MISSING',
            callbackURL: `${process.env.RENDER_EXTERNAL_URL || 'http://localhost:3100'}/api/auth/github/callback`,
            scope: ['user:email', 'read:org']
        });

        if (!configService.get<string>('github.clientId') || !configService.get<string>('github.clientSecret')) {
            this.logger.error('CRITICAL: GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET is missing!');
        }
    }

    async validate(
        accessToken: string,
        _refreshToken: string,
        profile: Profile,
    ): Promise<any> {
        this.logger.log(`GitHub OAuth callback for user: ${profile.username}`);

        const user = await this.authService.validateGitHubUser(profile, accessToken);
        return user;
    }
}
