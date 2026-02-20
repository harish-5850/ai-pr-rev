import {
    Controller,
    Get,
    Post,
    Body,
    Req,
    Res,
    UseGuards,
    Headers,
    Logger,
    RawBodyRequest,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { StripeService } from './stripe.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('billing')
export class BillingController {
    private readonly logger = new Logger(BillingController.name);

    constructor(
        private readonly stripeService: StripeService,
        private readonly prisma: PrismaService,
    ) { }

    /**
     * Get available plans
     */
    @Get('plans')
    getPlans() {
        return {
            plans: [
                {
                    id: 'FREE',
                    name: 'Free',
                    price: 0,
                    reviewsPerMonth: 50,
                    features: [
                        'Up to 50 PR reviews/month',
                        'Basic AI analysis',
                        'GitHub integration',
                    ],
                },
                {
                    id: 'PRO',
                    name: 'Pro',
                    price: 29,
                    reviewsPerMonth: 500,
                    features: [
                        'Up to 500 PR reviews/month',
                        'Advanced AI analysis',
                        'Static analysis (ESLint + Semgrep)',
                        'Learning mode',
                        'Priority support',
                    ],
                },
                {
                    id: 'ENTERPRISE',
                    name: 'Enterprise',
                    price: 99,
                    reviewsPerMonth: 10000,
                    features: [
                        'Up to 10,000 PR reviews/month',
                        'Everything in Pro',
                        'Custom rules engine',
                        'Dedicated support',
                        'SSO integration',
                    ],
                },
            ],
        };
    }

    /**
     * Create Stripe Checkout session for a plan upgrade
     */
    @Post('subscribe')
    @UseGuards(JwtAuthGuard)
    async subscribe(
        @CurrentUser() user: any,
        @Body() body: { plan: 'PRO' | 'ENTERPRISE'; orgId: string },
    ) {
        const url = await this.stripeService.createCheckoutSession(body.orgId, body.plan);
        return { url };
    }

    /**
     * Create Stripe Customer Portal session
     */
    @Post('portal')
    @UseGuards(JwtAuthGuard)
    async portal(@Body() body: { orgId: string }) {
        const url = await this.stripeService.createPortalSession(body.orgId);
        return { url };
    }

    /**
     * Get current subscription status
     */
    @Get('status')
    @UseGuards(JwtAuthGuard)
    async getStatus(@CurrentUser() user: any) {
        // Find the user's first org
        const membership = await this.prisma.organizationMember.findFirst({
            where: { userId: user.id },
            include: {
                organization: {
                    include: { subscription: true },
                },
            },
        });

        if (!membership) {
            return {
                plan: 'FREE',
                status: 'ACTIVE',
                reviewsUsed: 0,
                reviewsLimit: 50,
            };
        }

        const sub = membership.organization.subscription;
        return {
            plan: sub?.plan || 'FREE',
            status: sub?.status || 'ACTIVE',
            reviewsUsed: sub?.prReviewsUsed || 0,
            reviewsLimit: sub?.prReviewsLimit || 50,
            currentPeriodEnd: sub?.currentPeriodEnd,
        };
    }

    /**
     * Stripe webhook handler
     */
    @Post('webhook')
    async handleWebhook(
        @Req() req: RawBodyRequest<Request>,
        @Res() res: Response,
        @Headers('stripe-signature') signature: string,
    ) {
        res.status(200).json({ received: true });

        try {
            const event = this.stripeService.constructEvent(
                req.rawBody!,
                signature,
            );
            await this.stripeService.handleWebhookEvent(event);
        } catch (err) {
            this.logger.error('Stripe webhook error', err);
        }
    }
}
