import { QdrantClient } from '@qdrant/js-client-rest';
import { CollectionConfig, Document, UpsertRequest, UpsertResponse } from '../types/index.js';

export class QdrantService {
  private client: QdrantClient;
  private collectionName: string;

  constructor(
    url: string,
    apiKey: string | undefined,
    collectionName: string
  ) {
    const clientConfig: any = { url };
    if (apiKey) {
      clientConfig.apiKey = apiKey;
    }
    this.client = new QdrantClient(clientConfig);
    this.collectionName = collectionName;
  }

  async initialize(): Promise<void> {
    try {
      // Check if collection exists
      const collections = await this.client.getCollections();
      const collectionExists = collections.collections.some(
        (col) => col.name === this.collectionName
      );

      if (!collectionExists) {
        await this.createCollection();
      }

      console.log(`✅ Qdrant collection '${this.collectionName}' is ready`);
    } catch (error) {
      console.error('❌ Failed to initialize Qdrant:', error);
      throw error;
    }
  }

  private async createCollection(): Promise<void> {
    const config = {
      vectors: {
        size: 1536, // OpenAI ada-002 embedding dimension
        distance: 'Cosine' as const,
      },
      on_disk_payload: true,
      hnsw_config: {
        m: 16,
        ef_construct: 100,
        full_scan_threshold: 10000,
      },
    };

    try {
      await this.client.createCollection(this.collectionName, config);
      console.log(`✅ Created collection '${this.collectionName}'`);
    } catch (error) {
      console.error(`❌ Failed to create collection '${this.collectionName}':`, error);
      throw error;
    }
  }

  async upsertDocuments(request: UpsertRequest): Promise<UpsertResponse> {
    const { documents, batch_size = 100, update_existing = true } = request;
    const errors: string[] = [];
    const documentIds: string[] = [];
    let processedCount = 0;

    try {
      // Process documents in batches
      for (let i = 0; i < documents.length; i += batch_size) {
        const batch = documents.slice(i, i + batch_size);
        
        try {
          const points = batch.map((doc) => ({
            id: doc.id,
            vector: doc.embedding || [],
            payload: {
              title: doc.title,
              content: doc.content,
              metadata: doc.metadata,
              created_at: doc.created_at,
              updated_at: doc.updated_at,
            },
          }));

          await this.client.upsert(this.collectionName, {
            wait: true,
            points,
          });

          documentIds.push(...batch.map(doc => doc.id));
          processedCount += batch.length;

          console.log(`✅ Upserted batch ${Math.floor(i / batch_size) + 1}: ${batch.length} documents`);
        } catch (batchError) {
          const errorMsg = `Batch ${Math.floor(i / batch_size) + 1} failed: ${batchError}`;
          errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
      }

      return {
        success: errors.length === 0,
        processed_count: processedCount,
        errors,
        document_ids: documentIds,
      };
    } catch (error) {
      console.error('❌ Failed to upsert documents:', error);
      throw error;
    }
  }

  async search(
    queryVector: number[],
    limit: number = 10,
    threshold: number = 0.7,
    filter?: any
  ) {
    try {
      const searchResult = await this.client.search(this.collectionName, {
        vector: queryVector,
        limit,
        score_threshold: threshold,
        filter,
        with_payload: true,
        with_vector: false,
      });

      return searchResult.map(result => ({
        id: result.id as string,
        title: result.payload?.title as string,
        content: result.payload?.content as string,
        metadata: result.payload?.metadata as any,
        score: result.score,
        relevance: this.calculateRelevance(result.score),
      }));
    } catch (error) {
      console.error('❌ Search failed:', error);
      throw error;
    }
  }

  private calculateRelevance(score: number): 'high' | 'medium' | 'low' {
    if (score >= 0.8) return 'high';
    if (score >= 0.6) return 'medium';
    return 'low';
  }

  async deleteDocument(documentId: string): Promise<boolean> {
    try {
      await this.client.delete(this.collectionName, {
        wait: true,
        points: [documentId],
      });
      console.log(`✅ Deleted document ${documentId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to delete document ${documentId}:`, error);
      return false;
    }
  }

  async deleteCollection(): Promise<boolean> {
    try {
      await this.client.deleteCollection(this.collectionName);
      console.log(`✅ Deleted collection '${this.collectionName}'`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to delete collection '${this.collectionName}':`, error);
      return false;
    }
  }

  async getCollectionInfo() {
    try {
      const info = await this.client.getCollection(this.collectionName);
      return {
        name: this.collectionName,
        status: info.status,
        vectors_count: info.vectors_count,
        points_count: info.points_count,
        segments_count: info.segments_count,
        config: info.config,
      };
    } catch (error) {
      console.error('❌ Failed to get collection info:', error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.getCollections();
      return true;
    } catch (error) {
      console.error('❌ Qdrant health check failed:', error);
      return false;
    }
  }
}
