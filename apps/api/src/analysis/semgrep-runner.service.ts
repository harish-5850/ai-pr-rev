import { Injectable, Logger } from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execFileAsync = promisify(execFile);

export interface SemgrepIssue {
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    category: string;
    filePath: string;
    startLine?: number;
    endLine?: number;
    title: string;
    description: string;
    source: 'SEMGREP';
}

@Injectable()
export class SemgrepRunnerService {
    private readonly logger = new Logger(SemgrepRunnerService.name);

    async analyze(
        repoPath: string,
        changedFiles: string[],
    ): Promise<SemgrepIssue[]> {
        if (changedFiles.length === 0) {
            return [];
        }

        try {
            const filePaths = changedFiles.map((f) => path.join(repoPath, f));

            const { stdout } = await execFileAsync(
                'semgrep',
                ['--json', '--config', 'auto', ...filePaths],
                {
                    cwd: repoPath,
                    timeout: 120000, // 2 minutes
                },
            ).catch((err) => {
                if (err.stdout) return { stdout: err.stdout, stderr: err.stderr };
                throw err;
            });

            return this.parseResults(stdout, repoPath);
        } catch (error) {
            this.logger.warn('Semgrep analysis failed (tool may not be installed)', error);
            return [];
        }
    }

    private parseResults(
        output: string,
        repoPath: string,
    ): SemgrepIssue[] {
        try {
            const parsed = JSON.parse(output);
            const results = parsed.results || [];
            const issues: SemgrepIssue[] = [];

            for (const result of results) {
                const relativePath = path.relative(repoPath, result.path);

                issues.push({
                    severity: this.mapSeverity(result.extra?.severity || 'WARNING'),
                    category: 'security',
                    filePath: relativePath,
                    startLine: result.start?.line,
                    endLine: result.end?.line,
                    title: `Semgrep: ${result.check_id || 'unknown-rule'}`,
                    description:
                        result.extra?.message || result.extra?.metadata?.message || 'Issue detected',
                    source: 'SEMGREP',
                });
            }

            return issues;
        } catch {
            this.logger.warn('Failed to parse Semgrep output');
            return [];
        }
    }

    private mapSeverity(severity: string): 'HIGH' | 'MEDIUM' | 'LOW' {
        const upper = severity.toUpperCase();
        if (upper === 'ERROR') return 'HIGH';
        if (upper === 'WARNING') return 'MEDIUM';
        return 'LOW';
    }
}
