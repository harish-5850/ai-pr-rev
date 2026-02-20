import { Injectable } from '@nestjs/common';
import { MergedIssue } from '../analysis/result-merger.service';

@Injectable()
export class PrioritizerService {
    /**
     * Prioritize and sort issues by severity, then by source (AI first),
     * then by file path for consistent ordering.
     */
    prioritize(issues: MergedIssue[]): MergedIssue[] {
        const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        const sourceOrder = { AI: 0, SEMGREP: 1, ESLINT: 2 };

        return [...issues].sort((a, b) => {
            // Primary: severity
            const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
            if (sevDiff !== 0) return sevDiff;

            // Secondary: source (AI issues first)
            const srcDiff = sourceOrder[a.source] - sourceOrder[b.source];
            if (srcDiff !== 0) return srcDiff;

            // Tertiary: file path
            return a.filePath.localeCompare(b.filePath);
        });
    }
}
