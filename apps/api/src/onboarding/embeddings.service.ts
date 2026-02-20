import { Injectable, Logger } from '@nestjs/common';

/**
 * Embeddings service — STUB for MVP
 *
 * This service will be implemented in a later phase to:
 * 1. Generate code embeddings using an embedding model
 * 2. Store embeddings in Pinecone vector database
 * 3. Provide semantic search over codebase
 *
 * For the MVP, the AI review engine works directly with
 * the PR diff without vector-based context retrieval.
 */
@Injectable()
export class EmbeddingsService {
    private readonly logger = new Logger(EmbeddingsService.name);

    async generateEmbeddings(
        _repoPath: string,
        _repoId: string,
    ): Promise<void> {
        this.logger.log(
            'Embeddings generation is stubbed for MVP. Will be implemented with Pinecone integration.',
        );
    }

    async searchSimilarCode(
        _repoId: string,
        _query: string,
        _limit: number = 5,
    ): Promise<string[]> {
        this.logger.log('Semantic search is stubbed for MVP.');
        return [];
    }
}
