import { Injectable } from '@nestjs/common';
import { MergedIssue } from '../analysis/result-merger.service';

@Injectable()
export class CommentBuilderService {
    /**
     * Build the main summary comment posted as a PR comment
     */
    buildSummaryComment(
        summary: string,
        issues: MergedIssue[],
    ): string {
        const highCount = issues.filter((i) => i.severity === 'HIGH').length;
        const mediumCount = issues.filter((i) => i.severity === 'MEDIUM').length;
        const lowCount = issues.filter((i) => i.severity === 'LOW').length;
        const totalCount = issues.length;

        const parts: string[] = [];

        // Header
        parts.push('## 🤖 AI PR Review\n');

        // Summary
        parts.push(`**Summary**: ${summary}\n`);

        if (totalCount === 0) {
            parts.push('✅ **No issues found!** This PR looks good.\n');
            return parts.join('\n');
        }

        // Overview badge
        parts.push(
            `**Issues Found**: ${totalCount} (🔴 ${highCount} high, 🟡 ${mediumCount} medium, 🟢 ${lowCount} low)\n`,
        );

        // ── HIGH severity issues ──────────────────────────────────────
        if (highCount > 0) {
            parts.push('### 🔴 High Severity\n');
            parts.push('| File | Line | Issue | Source |');
            parts.push('|------|------|-------|--------|');
            issues
                .filter((i) => i.severity === 'HIGH')
                .forEach((i) => {
                    const line = i.startLine ? `L${i.startLine}` : '-';
                    parts.push(
                        `| \`${i.filePath}\` | ${line} | ${i.title} | ${i.source} |`,
                    );
                });
            parts.push('');
        }

        // ── MEDIUM severity issues ────────────────────────────────────
        if (mediumCount > 0) {
            parts.push('### 🟡 Medium Severity\n');
            parts.push('| File | Line | Issue | Source |');
            parts.push('|------|------|-------|--------|');
            issues
                .filter((i) => i.severity === 'MEDIUM')
                .forEach((i) => {
                    const line = i.startLine ? `L${i.startLine}` : '-';
                    parts.push(
                        `| \`${i.filePath}\` | ${line} | ${i.title} | ${i.source} |`,
                    );
                });
            parts.push('');
        }

        // ── LOW severity issues ───────────────────────────────────────
        if (lowCount > 0) {
            parts.push('<details><summary>🟢 Low Severity Issues</summary>\n');
            parts.push('| File | Line | Issue | Source |');
            parts.push('|------|------|-------|--------|');
            issues
                .filter((i) => i.severity === 'LOW')
                .forEach((i) => {
                    const line = i.startLine ? `L${i.startLine}` : '-';
                    parts.push(
                        `| \`${i.filePath}\` | ${line} | ${i.title} | ${i.source} |`,
                    );
                });
            parts.push('\n</details>\n');
        }

        // ── Detailed descriptions ─────────────────────────────────────
        parts.push('<details><summary>📋 Detailed Descriptions</summary>\n');
        issues.forEach((issue, idx) => {
            const severityEmoji =
                issue.severity === 'HIGH'
                    ? '🔴'
                    : issue.severity === 'MEDIUM'
                        ? '🟡'
                        : '🟢';
            parts.push(`#### ${severityEmoji} ${idx + 1}. ${issue.title}`);
            parts.push(`**File**: \`${issue.filePath}\`${issue.startLine ? ` (line ${issue.startLine})` : ''}`);
            parts.push(`**Source**: ${issue.source}\n`);
            parts.push(issue.description);
            if (issue.suggestion) {
                parts.push(`\n**Suggestion**:\n\`\`\`\n${issue.suggestion}\n\`\`\`\n`);
            }
            parts.push('---');
        });
        parts.push('\n</details>\n');

        // Footer
        parts.push(
            '---\n*🤖 Powered by AI PR Reviewer — [Learn more](https://github.com/ai-pr-reviewer)*',
        );

        return parts.join('\n');
    }

    /**
     * Build inline PR review comments for file-specific issues
     */
    buildInlineComments(
        issues: MergedIssue[],
    ): Array<{ path: string; line: number; body: string }> {
        return issues
            .filter((i) => i.startLine)
            .map((issue) => {
                const severityEmoji =
                    issue.severity === 'HIGH'
                        ? '🔴'
                        : issue.severity === 'MEDIUM'
                            ? '🟡'
                            : '🟢';

                let body = `${severityEmoji} **${issue.title}** _(${issue.source})_\n\n${issue.description}`;

                if (issue.suggestion) {
                    body += `\n\n**Suggestion**:\n\`\`\`suggestion\n${issue.suggestion}\n\`\`\``;
                }

                return {
                    path: issue.filePath,
                    line: issue.startLine!,
                    body,
                };
            });
    }
}
