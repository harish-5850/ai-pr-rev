import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
    url: process.env.DATABASE_URL || 'postgresql://prreviewer:prreviewer_secret@localhost:5432/ai_pr_reviewer',
}));
