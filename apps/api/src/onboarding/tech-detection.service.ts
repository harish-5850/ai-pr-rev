import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface TechStackInfo {
    languages: string[];
    frameworks: string[];
    packageManager: string | null;
    hasTests: boolean;
    hasLinter: boolean;
    hasCi: boolean;
}

@Injectable()
export class TechDetectionService {
    private readonly logger = new Logger(TechDetectionService.name);

    async detect(repoPath: string): Promise<TechStackInfo> {
        const result: TechStackInfo = {
            languages: [],
            frameworks: [],
            packageManager: null,
            hasTests: false,
            hasLinter: false,
            hasCi: false,
        };

        const fileChecks = await this.getDirectoryFiles(repoPath);

        // ── Detect languages & package managers ───────────────────────
        if (fileChecks.has('package.json')) {
            result.languages.push('JavaScript/TypeScript');
            result.packageManager = fileChecks.has('yarn.lock')
                ? 'yarn'
                : fileChecks.has('pnpm-lock.yaml')
                    ? 'pnpm'
                    : 'npm';

            // Detect frameworks from package.json
            await this.detectFromPackageJson(repoPath, result);
        }

        if (fileChecks.has('requirements.txt') || fileChecks.has('pyproject.toml')) {
            result.languages.push('Python');
        }

        if (fileChecks.has('go.mod')) {
            result.languages.push('Go');
        }

        if (fileChecks.has('Cargo.toml')) {
            result.languages.push('Rust');
        }

        if (fileChecks.has('pom.xml') || fileChecks.has('build.gradle')) {
            result.languages.push('Java');
        }

        if (fileChecks.has('Gemfile')) {
            result.languages.push('Ruby');
        }

        // ── Detect CI ─────────────────────────────────────────────────
        if (
            fileChecks.has('.github') ||
            fileChecks.has('.gitlab-ci.yml') ||
            fileChecks.has('Jenkinsfile') ||
            fileChecks.has('.circleci')
        ) {
            result.hasCi = true;
        }

        // ── Detect testing ────────────────────────────────────────────
        if (
            fileChecks.has('jest.config.js') ||
            fileChecks.has('jest.config.ts') ||
            fileChecks.has('vitest.config.ts') ||
            fileChecks.has('pytest.ini') ||
            fileChecks.has('.mocharc.yml')
        ) {
            result.hasTests = true;
        }

        // ── Detect linters ────────────────────────────────────────────
        if (
            fileChecks.has('.eslintrc.js') ||
            fileChecks.has('.eslintrc.json') ||
            fileChecks.has('eslint.config.js') ||
            fileChecks.has('.prettierrc')
        ) {
            result.hasLinter = true;
        }

        this.logger.log(`Detected tech stack: ${JSON.stringify(result)}`);
        return result;
    }

    private async detectFromPackageJson(
        repoPath: string,
        result: TechStackInfo,
    ): Promise<void> {
        try {
            const pkgContent = await fs.readFile(
                path.join(repoPath, 'package.json'),
                'utf-8',
            );
            const pkg = JSON.parse(pkgContent);
            const allDeps = {
                ...pkg.dependencies,
                ...pkg.devDependencies,
            };

            const frameworkMap: Record<string, string> = {
                react: 'React',
                next: 'Next.js',
                vue: 'Vue.js',
                nuxt: 'Nuxt.js',
                '@angular/core': 'Angular',
                svelte: 'Svelte',
                express: 'Express',
                '@nestjs/core': 'NestJS',
                fastify: 'Fastify',
                'hono': 'Hono',
            };

            for (const [dep, name] of Object.entries(frameworkMap)) {
                if (allDeps[dep]) {
                    result.frameworks.push(name);
                }
            }

            // Check for TypeScript
            if (allDeps['typescript']) {
                if (!result.languages.includes('JavaScript/TypeScript')) {
                    result.languages.push('TypeScript');
                }
            }

            // Check for test frameworks
            if (allDeps['jest'] || allDeps['vitest'] || allDeps['mocha']) {
                result.hasTests = true;
            }
        } catch {
            // package.json parsing issues are non-fatal
        }
    }

    private async getDirectoryFiles(dirPath: string): Promise<Set<string>> {
        try {
            const entries = await fs.readdir(dirPath);
            return new Set(entries);
        } catch {
            return new Set();
        }
    }
}
