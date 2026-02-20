import { Injectable, Logger } from '@nestjs/common';
import { PRFile } from '../github/github.service';

export interface PromptContext {
    diff: string;
    files: PRFile[];
    prTitle: string;
    prBody: string | null;
    techStack: Record<string, any> | null;
    repoFullName: string;
    experienceLevel?: string;
}

@Injectable()
export class PromptBuilderService {
    private readonly logger = new Logger(PromptBuilderService.name);

    buildSystemPrompt(experienceModifier?: string): string {
        const basePrompt = `You are an expert senior software engineer performing a thorough code review on a GitHub Pull Request.

Your responsibilities:
1. Identify bugs, security vulnerabilities, and logic errors
2. Evaluate code quality, readability, and maintainability
3. Check for performance issues and potential memory leaks
4. Suggest improvements and best practices
5. Verify error handling and edge cases

Guidelines:
- Be specific and actionable in your feedback
- Reference exact file paths and line numbers when possible
- Prioritize issues by severity (HIGH, MEDIUM, LOW)
- Provide code suggestions when applicable
- Be constructive and educational in tone
- Only flag genuine issues, avoid nitpicking style preferences

You MUST respond in valid JSON format matching the specified schema.`;

        if (experienceModifier) {
            return `${basePrompt}\n\n## Author Experience Context\n${experienceModifier}`;
        }
        return basePrompt;
    }

    buildUserPrompt(context: PromptContext): string {
        const { diff, files, prTitle, prBody, techStack, repoFullName } = context;

        const fileList = files
            .map(
                (f) =>
                    `- ${f.filename} (${f.status}: +${f.additions} -${f.deletions})`,
            )
            .join('\n');

        const techInfo = techStack
            ? `\nTech Stack: ${JSON.stringify(techStack)}`
            : '';

        return `## Pull Request Review Request

**Repository**: ${repoFullName}
**Title**: ${prTitle}
${prBody ? `**Description**: ${prBody}` : ''}
${techInfo}

### Changed Files
${fileList}

### Diff
\`\`\`diff
${diff}
\`\`\`

### Response Schema
Respond with a JSON object matching this exact schema:
{
  "summary": "Brief overall assessment of the PR",
  "issues": [
    {
      "severity": "HIGH" | "MEDIUM" | "LOW",
      "category": "bug" | "security" | "performance" | "quality" | "maintainability" | "error-handling",
      "filePath": "path/to/file.ts",
      "startLine": 42,
      "endLine": 45,
      "title": "Short issue title",
      "description": "Detailed explanation of the issue",
      "suggestion": "Optional code suggestion or fix"
    }
  ]
}

If the PR looks good with no issues, return an empty issues array with a positive summary.`;
    }
}
