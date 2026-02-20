import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StripeService {
    private readonly logger = new Logger(StripeService.name);
    private stripe: Stripe | null = null;

    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
    ) {
        const secretKey = this.configService.get<string>('billing.stripeSecretKey');
        if (secretKey) {
            this.stripe = new Stripe(secretKey, { apiVersion: '2024-12-18.acacia' as any });
        }
    }

    private ensureStripe(): Stripe {
        if (!this.stripe) {
            throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY environment variable.');
        }
        return this.stripe;
    }

    /**
     * Create a Stripe customer for an organization
     */
    async createCustomer(orgId: string, orgName: string, email?: string): Promise<string> {
        const stripe = this.ensureStripe();

        const customer = await stripe.customers.create({
            name: orgName,
            email: email || undefined,
            metadata: { orgId },
        });

        await this.prisma.subscription.upsert({
            where: { organizationId: orgId },
            update: { stripeCustomerId: customer.id },
            create: {
                organizationId: orgId,
                stripeCustomerId: customer.id,
                plan: 'FREE',
                status: 'ACTIVE',
            },
        });

        return customer.id;
    }

    /**
     * Create a Stripe Checkout session to upgrade
     */
    async createCheckoutSession(
        orgId: string,
        plan: 'PRO' | 'ENTERPRISE',
    ): Promise<string> {
        const stripe = this.ensureStripe();

        const subscription = await this.prisma.subscription.findUnique({
            where: { organizationId: orgId },
        });

        let customerId = subscription?.stripeCustomerId;
        if (!customerId) {
            const org = await this.prisma.organization.findUnique({
                where: { id: orgId },
            });
            customerId = await this.createCustomer(orgId, org?.name || 'Unknown');
        }

        const priceId = plan === 'PRO'
            ? this.configService.get<string>('billing.stripeProPriceId')
            : this.configService.get<string>('billing.stripeEnterprisePriceId');

        const frontendUrl = this.configService.get<string>('app.frontendUrl') || 'http://localhost:3001';

        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${frontendUrl}/billing?success=true`,
            cancel_url: `${frontendUrl}/billing?cancelled=true`,
            metadata: { orgId, plan },
        });

        return session.url || '';
    }

    /**
     * Create a Stripe Customer Portal session
     */
    async createPortalSession(orgId: string): Promise<string> {
        const stripe = this.ensureStripe();

        const subscription = await this.prisma.subscription.findUnique({
            where: { organizationId: orgId },
        });

        if (!subscription?.stripeCustomerId) {
            throw new Error('No Stripe customer found for this organization');
        }

        const frontendUrl = this.configService.get<string>('app.frontendUrl') || 'http://localhost:3001';

        const session = await stripe.billingPortal.sessions.create({
            customer: subscription.stripeCustomerId,
            return_url: `${frontendUrl}/billing`,
        });

        return session.url;
    }

    /**
     * Handle Stripe webhook events
     */
    async handleWebhookEvent(event: Stripe.Event): Promise<void> {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                const orgId = session.metadata?.orgId;
                const plan = session.metadata?.plan as 'PRO' | 'ENTERPRISE';

                if (orgId && plan) {
                    await this.prisma.subscription.update({
                        where: { organizationId: orgId },
                        data: {
                            stripeSubscriptionId: session.subscription as string,
                            plan,
                            status: 'ACTIVE',
                            prReviewsLimit: plan === 'PRO' ? 500 : 10000,
                        },
                    });
                    this.logger.log(`Subscription upgraded to ${plan} for org ${orgId}`);
                }
                break;
            }

            case 'invoice.paid': {
                const invoice = event.data.object as Stripe.Invoice;
                const customerId = invoice.customer as string;

                // Reset usage counter on invoice payment (new billing period)
                const sub = await this.prisma.subscription.findFirst({
                    where: { stripeCustomerId: customerId },
                });
                if (sub) {
                    await this.prisma.subscription.update({
                        where: { id: sub.id },
                        data: {
                            prReviewsUsed: 0,
                            currentPeriodStart: new Date(),
                            currentPeriodEnd: invoice.lines.data[0]?.period?.end
                                ? new Date(invoice.lines.data[0].period.end * 1000)
                                : null,
                        },
                    });
                }
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                const customerId = subscription.customer as string;

                await this.prisma.subscription.updateMany({
                    where: { stripeCustomerId: customerId },
                    data: {
                        plan: 'FREE',
                        status: 'CANCELLED',
                        prReviewsLimit: 50,
                    },
                });
                this.logger.log(`Subscription cancelled for customer ${customerId}`);
                break;
            }

            default:
                this.logger.debug(`Unhandled Stripe event: ${event.type}`);
        }
    }

    /**
     * Construct a Stripe webhook event from raw body + signature
     */
    constructEvent(rawBody: Buffer, signature: string): Stripe.Event {
        const stripe = this.ensureStripe();
        const secret = this.configService.get<string>('billing.stripeWebhookSecret') || '';
        return stripe.webhooks.constructEvent(rawBody, signature, secret);
    }

    /**
     * Check if organization has available review quota
     */
    async hasAvailableQuota(orgId: string): Promise<boolean> {
        const subscription = await this.prisma.subscription.findUnique({
            where: { organizationId: orgId },
        });

        if (!subscription) return true; // No subscription = free tier, allow
        return subscription.prReviewsUsed < subscription.prReviewsLimit;
    }

    /**
     * Increment usage counter
     */
    async incrementUsage(orgId: string): Promise<void> {
        await this.prisma.subscription.update({
            where: { organizationId: orgId },
            data: { prReviewsUsed: { increment: 1 } },
        });
    }
}
