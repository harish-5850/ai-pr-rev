import { ConversationPromptService } from './conversation-prompt.service';
import { ConversationContext } from './conversation-prompt.service';

describe('ConversationPromptService', () => {
    let service: ConversationPromptService;

    beforeEach(() => {
        service = new ConversationPromptService();
    });

    describe('buildSystemPrompt', () => {
        it('should include base guidelines for all intents', () => {
            const prompt = service.buildSystemPrompt('EXPLAIN');
            expect(prompt).toContain('expert senior software engineer');
            expect(prompt).toContain('code review assistant');
            expect(prompt).toContain('GitHub-flavored markdown');
        });

        it('should include EXPLAIN-specific instructions', () => {
            const prompt = service.buildSystemPrompt('EXPLAIN');
            expect(prompt).toContain('EXPLAIN');
            expect(prompt).toContain('educational explanation');
        });

        it('should include FIX_SUGGESTION-specific instructions', () => {
            const prompt = service.buildSystemPrompt('FIX_SUGGESTION');
            expect(prompt).toContain('concrete FIX');
            expect(prompt).toContain('suggestion');
        });

        it('should include RE_REVIEW-specific instructions', () => {
            const prompt = service.buildSystemPrompt('RE_REVIEW');
            expect(prompt).toContain('re-review');
            expect(prompt).toContain('addressed');
        });

        it('should include DISMISS-specific instructions', () => {
            const prompt = service.buildSystemPrompt('DISMISS');
            expect(prompt).toContain('dismissing');
            expect(prompt).toContain('Respectfully');
        });

        it('should include GENERAL_QUESTION-specific instructions', () => {
            const prompt = service.buildSystemPrompt('GENERAL_QUESTION');
            expect(prompt).toContain('general question');
        });
    });

    describe('buildUserPrompt', () => {
        const baseContext: ConversationContext = {
            intent: 'EXPLAIN',
            userMessage: 'Why is this a security issue?',
            userLogin: 'testuser',
            originalBotComment: '🔴 **SQL injection vulnerability**\n**File**: `src/db.ts` (line 42)',
            threadHistory: [],
            diffSnippet: '- const query = "SELECT * FROM " + table;\n+ const query = `SELECT * FROM ${table}`;',
            filePath: 'src/db.ts',
            prTitle: 'Refactor database queries',
            prBody: 'Updating query patterns for security',
            techStack: { languages: ['TypeScript'], frameworks: ['NestJS'] },
            repoFullName: 'test-org/test-repo',
        };

        it('should include repository context', () => {
            const prompt = service.buildUserPrompt(baseContext);
            expect(prompt).toContain('test-org/test-repo');
            expect(prompt).toContain('Refactor database queries');
        });

        it('should include the original bot comment', () => {
            const prompt = service.buildUserPrompt(baseContext);
            expect(prompt).toContain('Your Original Review Comment');
            expect(prompt).toContain('SQL injection vulnerability');
        });

        it('should include diff snippet', () => {
            const prompt = service.buildUserPrompt(baseContext);
            expect(prompt).toContain('```diff');
            expect(prompt).toContain('SELECT * FROM');
        });

        it('should include the user message', () => {
            const prompt = service.buildUserPrompt(baseContext);
            expect(prompt).toContain('@testuser');
            expect(prompt).toContain('Why is this a security issue?');
        });

        it('should include tech stack', () => {
            const prompt = service.buildUserPrompt(baseContext);
            expect(prompt).toContain('TypeScript');
            expect(prompt).toContain('NestJS');
        });

        it('should include file path', () => {
            const prompt = service.buildUserPrompt(baseContext);
            expect(prompt).toContain('`src/db.ts`');
        });

        it('should include thread history when present', () => {
            const context = {
                ...baseContext,
                threadHistory: [
                    { author: 'bot', body: 'Found a security issue' },
                    { author: 'testuser', body: 'Which line?' },
                ],
            };
            const prompt = service.buildUserPrompt(context);
            expect(prompt).toContain('Conversation Thread');
            expect(prompt).toContain('Found a security issue');
            expect(prompt).toContain('Which line?');
        });

        it('should handle missing optional fields gracefully', () => {
            const minimalContext: ConversationContext = {
                intent: 'GENERAL_QUESTION',
                userMessage: 'Hello!',
                userLogin: 'user',
                originalBotComment: null,
                threadHistory: [],
                diffSnippet: null,
                filePath: null,
                prTitle: 'Test PR',
                prBody: null,
                techStack: null,
                repoFullName: 'org/repo',
            };
            const prompt = service.buildUserPrompt(minimalContext);
            expect(prompt).toContain('org/repo');
            expect(prompt).toContain('Hello!');
            expect(prompt).not.toContain('Your Original Review Comment');
            expect(prompt).not.toContain('```diff');
        });

        it('should truncate long PR body', () => {
            const longBody = 'A'.repeat(1000);
            const context = { ...baseContext, prBody: longBody };
            const prompt = service.buildUserPrompt(context);
            // Should be truncated to 500 chars
            expect(prompt).toContain('A'.repeat(500));
            expect(prompt).not.toContain('A'.repeat(501));
        });
    });
});
