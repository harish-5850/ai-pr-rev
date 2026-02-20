import { Injectable, Logger } from '@nestjs/common';

export type ConversationIntent =
    | 'EXPLAIN'
    | 'FIX_SUGGESTION'
    | 'RE_REVIEW'
    | 'GENERAL_QUESTION'
    | 'DISMISS';

interface IntentPattern {
    intent: ConversationIntent;
    patterns: RegExp[];
}

@Injectable()
export class IntentDetectorService {
    private readonly logger = new Logger(IntentDetectorService.name);

    private readonly intentPatterns: IntentPattern[] = [
        {
            intent: 'EXPLAIN',
            patterns: [
                /why\s+(is|are|does|do|should|would)\b/i,
                /can\s+you\s+explain/i,
                /explain\s+(this|that|why|more|further)/i,
                /what\s+(does|is|are)\s+(this|that|the)\s+(mean|issue|problem)/i,
                /don['']?t\s+understand/i,
                /what['']?s\s+(wrong|the\s+issue|the\s+problem)/i,
                /could\s+you\s+(elaborate|clarify)/i,
                /more\s+(detail|info|context)/i,
            ],
        },
        {
            intent: 'FIX_SUGGESTION',
            patterns: [
                /how\s+(do|can|should|would)\s+(i|we)\s+fix/i,
                /suggest\s+(a\s+)?fix/i,
                /can\s+you\s+(fix|suggest|provide|show)\s+(a\s+)?(fix|solution|example|code)/i,
                /what\s+should\s+(i|we)\s+(do|change|write)\s+instead/i,
                /show\s+me\s+(the\s+)?(correct|right|proper|fixed)/i,
                /how\s+to\s+(fix|resolve|address|solve)/i,
                /what['']?s\s+the\s+(fix|solution)/i,
                /give\s+me\s+(a\s+)?(fix|example|suggestion)/i,
            ],
        },
        {
            intent: 'RE_REVIEW',
            patterns: [
                /re[\s-]?review/i,
                /review\s+(again|this\s+again)/i,
                /i['']?ve\s+(updated|fixed|changed|addressed)/i,
                /please\s+(check|look)\s+again/i,
                /updated?\s+(the\s+)?(code|pr|pull\s+request)/i,
                /take\s+another\s+look/i,
                /changes?\s+(have\s+been\s+)?made/i,
                /pushed\s+(a\s+)?(fix|update|change)/i,
            ],
        },
        {
            intent: 'DISMISS',
            patterns: [
                /false\s+positive/i,
                /not\s+(a|an)\s+(issue|bug|problem)/i,
                /ignore\s+(this|that)/i,
                /dismiss/i,
                /intentional(ly)?/i,
                /by\s+design/i,
                /working\s+as\s+(intended|expected)/i,
                /this\s+is\s+(fine|correct|expected|ok|okay)/i,
                /disagree/i,
            ],
        },
    ];

    /**
     * Detect the intent of a user's comment using pattern matching.
     * Falls back to GENERAL_QUESTION if no patterns match.
     */
    detect(message: string): ConversationIntent {
        const cleaned = message
            .replace(/@[\w-]+/g, '') // Remove @mentions
            .trim();

        if (!cleaned) {
            return 'GENERAL_QUESTION';
        }

        // Score each intent by number of matching patterns
        let bestIntent: ConversationIntent = 'GENERAL_QUESTION';
        let bestScore = 0;

        for (const { intent, patterns } of this.intentPatterns) {
            const matchCount = patterns.filter((p) => p.test(cleaned)).length;
            if (matchCount > bestScore) {
                bestScore = matchCount;
                bestIntent = intent;
            }
        }

        this.logger.debug(
            `Intent detected: ${bestIntent} (score: ${bestScore}) for message: "${cleaned.substring(0, 80)}"`,
        );

        return bestIntent;
    }
}
