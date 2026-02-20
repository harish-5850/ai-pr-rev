import { registerAs } from '@nestjs/config';

export default registerAs('billing', () => ({
    stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    stripeProPriceId: process.env.STRIPE_PRO_PRICE_ID || '',
    stripeEnterprisePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || '',
}));
