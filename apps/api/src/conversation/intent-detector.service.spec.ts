import { IntentDetectorService } from './intent-detector.service';

describe('IntentDetectorService', () => {
    let service: IntentDetectorService;

    beforeEach(() => {
        service = new IntentDetectorService();
    });

    describe('EXPLAIN intent', () => {
        it.each([
            'Why is this an issue?',
            'Can you explain this more?',
            'What does this mean?',
            'I don\'t understand the problem',
            'Could you elaborate on this?',
            'Explain why this matters',
            'What\'s wrong with this code?',
            'Why should I change this?',
            'More detail please',
        ])('should detect EXPLAIN for: "%s"', (message) => {
            expect(service.detect(message)).toBe('EXPLAIN');
        });
    });

    describe('FIX_SUGGESTION intent', () => {
        it.each([
            'How do I fix this?',
            'Can you suggest a fix?',
            'Show me the correct way',
            'What should I write instead?',
            'Give me a fix for this',
            'How to resolve this issue?',
            'What\'s the fix for this?',
            'Can you provide a code suggestion?',
        ])('should detect FIX_SUGGESTION for: "%s"', (message) => {
            expect(service.detect(message)).toBe('FIX_SUGGESTION');
        });
    });

    describe('RE_REVIEW intent', () => {
        it.each([
            'Please re-review',
            'I\'ve updated the code',
            'Please check again',
            'I\'ve fixed this, take another look',
            'Updated the PR',
            'Changes have been made',
            'Pushed a fix',
            'I\'ve addressed this issue',
        ])('should detect RE_REVIEW for: "%s"', (message) => {
            expect(service.detect(message)).toBe('RE_REVIEW');
        });
    });

    describe('DISMISS intent', () => {
        it.each([
            'This is a false positive',
            'Not an issue',
            'Ignore this',
            'This is intentional',
            'Working as intended',
            'This is fine',
            'I disagree with this finding',
            'By design',
        ])('should detect DISMISS for: "%s"', (message) => {
            expect(service.detect(message)).toBe('DISMISS');
        });
    });

    describe('GENERAL_QUESTION fallback', () => {
        it.each([
            'What version of Node.js should I use?',
            'Is there a better library for this?',
            'Thanks for the review!',
            'Hello',
        ])('should detect GENERAL_QUESTION for: "%s"', (message) => {
            expect(service.detect(message)).toBe('GENERAL_QUESTION');
        });

        it('should return GENERAL_QUESTION for empty string', () => {
            expect(service.detect('')).toBe('GENERAL_QUESTION');
        });

        it('should return GENERAL_QUESTION for only @mention', () => {
            expect(service.detect('@ai-pr-reviewer')).toBe('GENERAL_QUESTION');
        });
    });

    describe('@mention stripping', () => {
        it('should strip @mentions and still detect intent', () => {
            expect(
                service.detect('@ai-pr-reviewer why is this an issue?'),
            ).toBe('EXPLAIN');
        });

        it('should strip multiple @mentions', () => {
            expect(
                service.detect('@ai-pr-reviewer @user123 can you suggest a fix?'),
            ).toBe('FIX_SUGGESTION');
        });
    });
});
