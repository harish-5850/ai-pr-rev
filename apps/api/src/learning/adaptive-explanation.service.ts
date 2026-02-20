import { Injectable } from '@nestjs/common';
import { ExperienceLevel } from '@prisma/client';

export interface AdaptedIssue {
    title: string;
    description: string;
    suggestion?: string;
    learnMoreUrl?: string;
}

@Injectable()
export class AdaptiveExplanationService {
    /**
     * Get system prompt modifier based on experience level
     */
    getPromptModifier(level: ExperienceLevel): string {
        switch (level) {
            case 'JUNIOR':
                return `The PR author is a junior developer. Provide detailed, educational explanations for each issue.
Include:
- Why the issue matters (with real-world consequences)
- Step-by-step fix instructions with code examples
- Links to relevant documentation or best practices when applicable
- Encouraging tone — be supportive and constructive`;

            case 'SENIOR':
                return `The PR author is a senior developer. Be concise and to-the-point.
- Skip obvious explanations
- Focus on the "what" and "why", not the "how"
- Use technical shorthand where appropriate
- Flag only genuine issues, trust their judgment on style choices`;

            case 'MID':
            default:
                return `The PR author is a mid-level developer. Provide clear, balanced explanations.
- Explain the reasoning behind each issue
- Include code suggestions when helpful
- Be constructive but don't over-explain obvious concepts`;
        }
    }

    /**
     * Adjust review summary tone based on experience level
     */
    adjustSummaryTone(summary: string, level: ExperienceLevel): string {
        if (level === 'JUNIOR' && !summary.includes('💡')) {
            return `${summary}\n\n💡 **Tip**: Each issue above is a learning opportunity. Don't hesitate to ask for more details by replying to any comment!`;
        }
        return summary;
    }
}
