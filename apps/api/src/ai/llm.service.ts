import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { PromptBuilderService, PromptContext } from './prompt-builder.service';
import { AICacheService } from './ai-cache.service';
import { AdaptiveExplanationService } from '../learning/adaptive-explanation.service';
import { ExperienceLevel } from '@prisma/client';

export interface AIReviewResult {
    summary: string;
    issues: AIIssue[];
}

export interface AIIssue {
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    category: string;
    filePath: string;
    startLine?: number;
    endLine?: number;
    title: string;
    description: string;
    suggestion?: string;
}

@Injectable()
export class LLMService {
    private readonly logger = new Logger(LLMService.name);
    private client: Anthropic | null = null;

    constructor(
        private readonly configService: ConfigService,
        private readonly promptBuilder: PromptBuilderService,
        private readonly cache: AICacheService,
        private readonly adaptiveExplanation: AdaptiveExplanationService,
    ) { }

    private getClient(): Anthropic {
        if (!this.client) {
            const apiKey = this.configService.get<string>('llm.anthropicApiKey');
            if (!apiKey) {
                throw new Error('Anthropic API key not configured');
            }
            this.client = new Anthropic({ apiKey });
        }
        return this.client;
    }

    async analyzePullRequest(context: PromptContext): Promise<AIReviewResult> {
        // Check cache first
        const cached = await this.cache.get(context.diff);
        if (cached) {
            this.logger.log('Returning cached AI review result');
            return cached;
        }

        const client = this.getClient();
        const model = this.configService.get<string>('llm.model') || 'claude-sonnet-4-20250514';
        const maxTokens = this.configService.get<number>('llm.maxTokens') || 4096;

        let experienceModifier: string | undefined;
        if (context.experienceLevel) {
            experienceModifier = this.adaptiveExplanation.getPromptModifier(context.experienceLevel as ExperienceLevel);
        }

        const systemPrompt = this.promptBuilder.buildSystemPrompt(experienceModifier);
        const userPrompt = this.promptBuilder.buildUserPrompt(context);

        this.logger.log(`Sending PR diff to ${model} for analysis...`);

        try {
            const response = await client.messages.create({
                model,
                max_tokens: maxTokens,
                system: systemPrompt,
                messages: [
                    {
                        role: 'user',
                        content: userPrompt,
                    },
                ],
            });

            const content = response.content[0];
            if (content.type !== 'text') {
                throw new Error('Unexpected response type from Claude');
            }

            // Parse the JSON response
            const result = this.parseResponse(content.text);

            // Cache the result
            await this.cache.set(context.diff, result);

            this.logger.log(
                `AI analysis complete: ${result.issues.length} issues found`,
            );

            return result;
        } catch (error) {
            this.logger.error('LLM analysis failed', error);
            throw error;
        }
    }

    private parseResponse(text: string): AIReviewResult {
        // Extract JSON from the response (handle markdown code blocks)
        let jsonStr = text.trim();
        const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            jsonStr = jsonMatch[1].trim();
        }

        try {
            const parsed = JSON.parse(jsonStr);
            return {
                summary: parsed.summary || 'No summary provided',
                issues: (parsed.issues || []).map((issue: any) => ({
                    severity: this.validateSeverity(issue.severity),
                    category: issue.category || 'quality',
                    filePath: issue.filePath || '',
                    startLine: issue.startLine,
                    endLine: issue.endLine,
                    title: issue.title || 'Untitled issue',
                    description: issue.description || '',
                    suggestion: issue.suggestion,
                })),
            };
        } catch (error) {
            this.logger.error('Failed to parse LLM response as JSON', error);
            // Return a fallback result
            return {
                summary: text.substring(0, 500),
                issues: [],
            };
        }
    }

    private validateSeverity(severity: string): 'HIGH' | 'MEDIUM' | 'LOW' {
        const upper = (severity || '').toUpperCase();
        if (['HIGH', 'MEDIUM', 'LOW'].includes(upper)) {
            return upper as 'HIGH' | 'MEDIUM' | 'LOW';
        }
        return 'MEDIUM';
    }
}
