import { Injectable, Logger } from '@nestjs/common';
import { AIIssue } from '../ai/llm.service';
import { StaticAnalysisIssue } from './eslint-runner.service';
import { SemgrepIssue } from './semgrep-runner.service';

export interface MergedIssue {
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    category: string;
    filePath: string;
    startLine?: number;
    endLine?: number;
    title: string;
    description: string;
    suggestion?: string;
    source: 'AI' | 'ESLINT' | 'SEMGREP';
}

@Injectable()
export class ResultMergerService {
    private readonly logger = new Logger(ResultMergerService.name);

    merge(
        aiIssues: AIIssue[],
        eslintIssues: StaticAnalysisIssue[],
        semgrepIssues: SemgrepIssue[],
    ): MergedIssue[] {
        // Convert all to unified format
        const allIssues: MergedIssue[] = [
            ...aiIssues.map((i) => ({ ...i, source: 'AI' as const })),
            ...eslintIssues.map((i) => ({
                ...i,
                suggestion: undefined,
            })),
            ...semgrepIssues.map((i) => ({
                ...i,
                suggestion: undefined,
            })),
        ];

        // Deduplicate — if AI and static analysis flag the same file+line, prefer AI (richer description)
        const deduped = this.deduplicate(allIssues);

        // Sort by severity (HIGH → MEDIUM → LOW)
        const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        deduped.sort(
            (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
        );

        this.logger.log(
            `Merged ${allIssues.length} issues → ${deduped.length} after dedup (AI: ${aiIssues.length}, ESLint: ${eslintIssues.length}, Semgrep: ${semgrepIssues.length})`,
        );

        return deduped;
    }

    private deduplicate(issues: MergedIssue[]): MergedIssue[] {
        const seen = new Map<string, MergedIssue>();

        for (const issue of issues) {
            const key = `${issue.filePath}:${issue.startLine || 'unknown'}`;

            if (seen.has(key)) {
                const existing = seen.get(key)!;
                // Prefer higher severity
                const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
                if (severityOrder[issue.severity] < severityOrder[existing.severity]) {
                    seen.set(key, issue);
                }
                // Prefer AI source for richer descriptions
                if (issue.source === 'AI' && existing.source !== 'AI') {
                    seen.set(key, issue);
                }
            } else {
                seen.set(key, issue);
            }
        }

        return Array.from(seen.values());
    }
}
