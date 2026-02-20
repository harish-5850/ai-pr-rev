import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StripeService } from './stripe.service';
import { BillingController } from './billing.controller';
import { PrismaModule } from '../prisma/prisma.module';
import billingConfig from '../config/billing.config';

@Module({
    imports: [
        ConfigModule.forFeature(billingConfig),
        PrismaModule,
    ],
    controllers: [BillingController],
    providers: [StripeService],
    exports: [StripeService],
})
export class BillingModule { }
