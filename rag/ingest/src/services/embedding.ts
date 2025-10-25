import OpenAI from 'openai';
import { EmbeddingConfig } from '../types/index.js';

export class EmbeddingService {
  private client: OpenAI;
  private config: EmbeddingConfig;

  constructor(apiKey: string, config: EmbeddingConfig) {
    this.client = new OpenAI({ apiKey });
    this.config = config;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: this.config.model,
        input: this.prepareText(text),
      });

      const embedding = response.data[0]?.embedding;
      if (!embedding) {
        throw new Error('No embedding returned from OpenAI API');
      }
      return embedding;
    } catch (error) {
      console.error('❌ Failed to generate embedding:', error);
      throw error;
    }
  }

  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    const batchSize = this.config.batch_size;

    try {
      // Process in batches to avoid rate limits
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        
        let retries = 0;
        while (retries < this.config.max_retries) {
          try {
            const response = await this.client.embeddings.create({
              model: this.config.model,
              input: batch.map(text => this.prepareText(text)),
            });

            const batchEmbeddings = response.data.map(item => item.embedding);
            embeddings.push(...batchEmbeddings);
            break;
          } catch (error: any) {
            retries++;
            if (retries >= this.config.max_retries) {
              throw error;
            }
            
            // Wait before retry (exponential backoff)
            const delay = Math.pow(2, retries) * 1000;
            console.log(`⏳ Retrying batch ${Math.floor(i / batchSize) + 1} in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }

        // Small delay between batches to respect rate limits
        if (i + batchSize < texts.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log(`✅ Generated ${embeddings.length} embeddings`);
      return embeddings;
    } catch (error) {
      console.error('❌ Failed to generate batch embeddings:', error);
      throw error;
    }
  }

  private prepareText(text: string): string {
    // Clean and prepare text for embedding
    return text
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .substring(0, 8000); // OpenAI has token limits, this is approximate
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch (error) {
      console.error('❌ OpenAI API health check failed:', error);
      return false;
    }
  }

  getModelInfo(): { model: string; dimension: number } {
    return {
      model: this.config.model,
      dimension: this.config.dimension,
    };
  }
}




