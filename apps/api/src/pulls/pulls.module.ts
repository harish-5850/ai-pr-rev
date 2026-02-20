import { Module } from '@nestjs/common';
import { PullsController } from './pulls.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [PullsController],
})
export class PullsModule { }
