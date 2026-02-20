import {
    Controller,
    Get,
    Post,
    Req,
    Res,
    UseGuards,
    Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '@prisma/client';

@Controller('auth')
export class AuthController {
    private readonly logger = new Logger(AuthController.name);

    constructor(
        private readonly authService: AuthService,
        private readonly configService: ConfigService,
    ) { }

    /**
     * Redirect to GitHub OAuth
     */
    @Get('github')
    @UseGuards(AuthGuard('github'))
    githubLogin() {
        // Passport redirects to GitHub automatically
    }

    /**
     * GitHub OAuth callback — set JWT cookie and redirect to frontend
     */
    @Get('github/callback')
    @UseGuards(AuthGuard('github'))
    async githubCallback(@Req() req: Request, @Res() res: Response) {
        const user = req.user as User;
        const token = this.authService.generateToken(user);

        const cookieName = this.configService.get<string>('auth.cookieName') || 'ai_pr_token';
        const cookieMaxAge = this.configService.get<number>('auth.cookieMaxAge') || 7 * 24 * 60 * 60 * 1000;
        const frontendUrl = this.configService.get<string>('app.frontendUrl') || 'http://localhost:3001';

        res.cookie(cookieName, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: cookieMaxAge,
            path: '/',
        });

        this.logger.log(`OAuth complete for ${user.login}, redirecting to dashboard`);
        res.redirect(`${frontendUrl}/dashboard`);
    }

    /**
     * Get current authenticated user
     */
    @Get('me')
    @UseGuards(JwtAuthGuard)
    async getCurrentUser(@CurrentUser() user: User) {
        const fullUser = await this.authService.getUserById(user.id);
        return {
            id: fullUser?.id,
            login: fullUser?.login,
            email: fullUser?.email,
            avatarUrl: fullUser?.avatarUrl,
            role: fullUser?.role,
            createdAt: fullUser?.createdAt,
        };
    }

    /**
     * Logout — clear the JWT cookie
     */
    @Post('logout')
    logout(@Res() res: Response) {
        const cookieName = this.configService.get<string>('auth.cookieName') || 'ai_pr_token';

        res.clearCookie(cookieName, { path: '/' });
        res.json({ message: 'Logged out successfully' });
    }
}
