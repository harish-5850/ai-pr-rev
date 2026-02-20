import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { Profile } from 'passport-github2';
import { User } from '@prisma/client';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly jwtService: JwtService,
        private readonly prisma: PrismaService,
    ) { }

    /**
     * Generate a JWT token for the given user
     */
    generateToken(user: User): string {
        const payload = {
            sub: user.id,
            login: user.login,
            role: user.role,
        };
        return this.jwtService.sign(payload);
    }

    /**
     * Validate GitHub OAuth user — upsert into our database
     */
    async validateGitHubUser(profile: Profile, accessToken: string): Promise<User> {
        this.logger.debug(`Validating GitHub user: ${profile.username} (ID: ${profile.id})`);

        const githubId = BigInt(profile.id);
        const email = profile.emails?.[0]?.value || null;
        const avatarUrl = profile.photos?.[0]?.value || null;
        const username = profile.username || profile.displayName || `user_${githubId}`;

        try {
            const user = await this.prisma.user.upsert({
                where: { githubId },
                update: {
                    login: username,
                    email,
                    avatarUrl,
                    accessToken,
                },
                create: {
                    githubId,
                    login: username,
                    email,
                    avatarUrl,
                    accessToken,
                    role: 'DEVELOPER',
                },
            });

            this.logger.log(`Authenticated user: ${user.login} (${user.id})`);
            return user;
        } catch (error) {
            this.logger.error(`Failed to upsert user: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Get user by ID
     */
    async getUserById(id: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: { id },
            include: {
                organizations: {
                    include: {
                        organization: true,
                    },
                },
            },
        });
    }
}
