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
        const clientID = configService.get<string>('github.clientId') || '';
        const clientSecret = configService.get<string>('github.clientSecret') || '';
        const callbackURL = 'http://localhost:3100/api/auth/github/callback';

        super({ clientID, clientSecret, callbackURL, scope: ['user:email', 'read:org'] });
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
