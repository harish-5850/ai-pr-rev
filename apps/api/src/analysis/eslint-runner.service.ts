import { Injectable, Logger } from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execFileAsync = promisify(execFile);

export interface StaticAnalysisIssue {
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    category: string;
    filePath: string;
    startLine?: number;
    endLine?: number;
    title: string;
    description: string;
    source: 'ESLINT';
}

@Injectable()
export class EslintRunnerService {
    private readonly logger = new Logger(EslintRunnerService.name);

    async analyze(
        repoPath: string,
        changedFiles: string[],
    ): Promise<StaticAnalysisIssue[]> {
        const jsFiles = changedFiles.filter((f) =>
            /\.(js|jsx|ts|tsx|mjs|cjs)$/.test(f),
        );

        if (jsFiles.length === 0) {
            this.logger.log('No JS/TS files to lint');
            return [];
        }

        try {
            const filePaths = jsFiles.map((f) => path.join(repoPath, f));

            const { stdout } = await execFileAsync(
                'npx',
                ['eslint', '--format', 'json', '--no-error-on-unmatched-pattern', ...filePaths],
                {
                    cwd: repoPath,
                    timeout: 60000, // 60 seconds
                    env: { ...process.env, NODE_ENV: 'production' },
                },
            ).catch((err) => {
                // ESLint exits with code 1 when it finds issues
                if (err.stdout) return { stdout: err.stdout, stderr: err.stderr };
                throw err;
            });

            return this.parseResults(stdout, repoPath);
        } catch (error) {
            this.logger.warn('ESLint analysis failed (tool may not be installed)', error);
            return [];
        }
    }

    private parseResults(
        output: string,
        repoPath: string,
    ): StaticAnalysisIssue[] {
        try {
            const results = JSON.parse(output);
            const issues: StaticAnalysisIssue[] = [];

            for (const file of results) {
                const relativePath = path.relative(repoPath, file.filePath);

                for (const message of file.messages) {
                    issues.push({
                        severity: this.mapSeverity(message.severity),
                        category: 'quality',
                        filePath: relativePath,
                        startLine: message.line,
                        endLine: message.endLine || message.line,
                        title: `ESLint: ${message.ruleId || 'unknown-rule'}`,
                        description: message.message,
                        source: 'ESLINT',
                    });
                }
            }

            return issues;
        } catch {
            this.logger.warn('Failed to parse ESLint output');
            return [];
        }
    }

    private mapSeverity(eslintSeverity: number): 'HIGH' | 'MEDIUM' | 'LOW' {
        // ESLint: 1 = warning, 2 = error
        return eslintSeverity === 2 ? 'HIGH' : 'LOW';
    }
}
