import { Module } from '@nestjs/common';
import { ReposController } from './repos.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { GitHubModule } from '../github/github.module';

@Module({
    imports: [PrismaModule, GitHubModule],
    controllers: [ReposController],
})
export class ReposModule { }
