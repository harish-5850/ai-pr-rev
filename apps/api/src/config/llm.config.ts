import { registerAs } from '@nestjs/config';

export default registerAs('llm', () => ({
    provider: process.env.LLM_PROVIDER || 'anthropic',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    model: process.env.LLM_MODEL || 'claude-sonnet-4-20250514',
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '4096', 10),
}));
