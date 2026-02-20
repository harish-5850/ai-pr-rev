import { registerAs } from '@nestjs/config';

export default registerAs('github', () => ({
    appId: process.env.GITHUB_APP_ID || '',
    privateKey: process.env.GITHUB_PRIVATE_KEY || '',
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET || '',
    clientId: process.env.GITHUB_CLIENT_ID || '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    botName: process.env.GITHUB_BOT_NAME || 'ai-pr-reviewer',
}));
