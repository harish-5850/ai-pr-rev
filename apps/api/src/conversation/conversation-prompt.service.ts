import { Injectable } from '@nestjs/common';
import { ConversationIntent } from './intent-detector.service';

export interface ConversationContext {
    intent: ConversationIntent;
    userMessage: string;
    userLogin: string;
    /** The original bot review comment that the user is replying to */
    originalBotComment: string | null;
    /** Thread history (earlier messages in the conversation) */
    threadHistory: Array<{ author: string; body: string }>;
    /** The relevant portion of the PR diff */
    diffSnippet: string | null;
    /** File path from the original issue, if any */
    filePath: string | null;
    /** PR title and body for additional context */
    prTitle: string;
    prBody: string | null;
    /** Tech stack of the repo */
    techStack: Record<string, any> | null;
    repoFullName: string;
}

@Injectable()
export class ConversationPromptService {
    buildSystemPrompt(intent: ConversationIntent): string {
        const basePrompt = `You are an expert senior software engineer acting as an AI code review assistant on GitHub Pull Requests.

You are responding to a developer's follow-up message on a PR review comment you previously made. Be helpful, specific, and conversational.

Guidelines:
- Be concise but thorough
- Reference specific code when relevant
- Use GitHub-flavored markdown in your response
- Be respectful and educational in tone
- If referencing file paths or code, use backticks`;

        const intentInstructions = this.getIntentInstructions(intent);

        return `${basePrompt}\n\n${intentInstructions}`;
    }

    buildUserPrompt(context: ConversationContext): string {
        const parts: string[] = [];

        // PR context
        parts.push(`## Context`);
        parts.push(`**Repository**: ${context.repoFullName}`);
        parts.push(`**PR**: ${context.prTitle}`);
        if (context.prBody) {
            parts.push(`**PR Description**: ${context.prBody.substring(0, 500)}`);
        }
        if (context.techStack) {
            parts.push(`**Tech Stack**: ${JSON.stringify(context.techStack)}`);
        }
        if (context.filePath) {
            parts.push(`**File**: \`${context.filePath}\``);
        }

        // Original bot comment
        if (context.originalBotComment) {
            parts.push(`\n## Your Original Review Comment`);
            parts.push(context.originalBotComment);
        }

        // Thread history
        if (context.threadHistory.length > 0) {
            parts.push(`\n## Conversation Thread`);
            for (const msg of context.threadHistory) {
                parts.push(`**${msg.author}**: ${msg.body}`);
            }
        }

        // Relevant diff
        if (context.diffSnippet) {
            parts.push(`\n## Relevant Code Diff`);
            parts.push('```diff');
            parts.push(context.diffSnippet);
            parts.push('```');
        }

        // The user's question
        parts.push(`\n## Developer's Message`);
        parts.push(`**@${context.userLogin}** says:\n${context.userMessage}`);

        // Response instruction
        parts.push(`\n## Your Task`);
        parts.push(this.getResponseInstruction(context.intent));

        return parts.join('\n');
    }

    private getIntentInstructions(intent: ConversationIntent): string {
        switch (intent) {
            case 'EXPLAIN':
                return `The developer is asking you to EXPLAIN your review feedback. Provide a clear, educational explanation of why the issue matters, what could go wrong, and any relevant best practices. Use examples if helpful.`;

            case 'FIX_SUGGESTION':
                return `The developer is asking for a concrete FIX or code suggestion. Provide working code that resolves the issue you raised. Use a \`\`\`suggestion code block format so GitHub can render it as an applicable suggestion. Be precise and production-ready.`;

            case 'RE_REVIEW':
                return `The developer has updated their code and is asking you to re-review. Analyze the current state of the code (in the diff provided) and determine if the original issue has been addressed. Be specific about what's improved and if anything still needs attention.`;

            case 'DISMISS':
                return `The developer is dismissing or disagreeing with your review finding. Respectfully acknowledge their perspective. If you believe the issue is genuine, briefly explain why. If their reasoning is valid, acknowledge that your finding may not apply in this context. Don't be confrontational.`;

            case 'GENERAL_QUESTION':
                return `The developer has a general question related to the code review. Answer it helpfully and concisely, staying relevant to the PR context.`;
        }
    }

    private getResponseInstruction(intent: ConversationIntent): string {
        switch (intent) {
            case 'EXPLAIN':
                return 'Explain the issue clearly. Include why it matters and what the risks are.';

            case 'FIX_SUGGESTION':
                return 'Provide a concrete code fix. Use markdown code blocks. Make it production-ready.';

            case 'RE_REVIEW':
                return 'Evaluate whether the original issue has been addressed. Be specific.';

            case 'DISMISS':
                return 'Acknowledge their perspective respectfully. Briefly validate or explain your reasoning.';

            case 'GENERAL_QUESTION':
                return 'Answer the question helpfully, staying relevant to the PR and code context.';
        }
    }
}
