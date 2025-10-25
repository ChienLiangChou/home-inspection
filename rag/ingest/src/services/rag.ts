import { 
  SearchQuery, 
  SearchResult, 
  RAGContext, 
  Document, 
  UpsertRequest,
  UpsertResponse,
  DocumentCategory 
} from '../types/index.js';
import { QdrantService } from './qdrant.js';
import { EmbeddingService } from './embedding.js';
import { DocumentService } from './document.js';
import { SensorContextService } from './sensor-context.js';

export class RAGService {
  private qdrantService: QdrantService;
  private embeddingService: EmbeddingService;
  private documentService: DocumentService;
  private sensorContextService: SensorContextService;

  constructor(
    qdrantService: QdrantService,
    embeddingService: EmbeddingService,
    documentService: DocumentService,
    sensorContextService: SensorContextService
  ) {
    this.qdrantService = qdrantService;
    this.embeddingService = embeddingService;
    this.documentService = documentService;
    this.sensorContextService = sensorContextService;
  }

  async initialize(): Promise<void> {
    await this.qdrantService.initialize();
    console.log('✅ RAG Service initialized');
  }

  async upsertDocuments(request: UpsertRequest): Promise<UpsertResponse> {
    try {
      console.log(`📚 Processing ${request.documents.length} documents for upsert...`);

      // Generate embeddings for documents that don't have them
      const documentsNeedingEmbeddings = request.documents.filter(doc => !doc.embedding);
      
      if (documentsNeedingEmbeddings.length > 0) {
        console.log(`🔮 Generating embeddings for ${documentsNeedingEmbeddings.length} documents...`);
        
        const contents = documentsNeedingEmbeddings.map(doc => 
          this.documentService['prepareContentForEmbedding'](doc)
        );
        
        const embeddings = await this.embeddingService.generateBatchEmbeddings(contents);
        
        // Assign embeddings back to documents
        documentsNeedingEmbeddings.forEach((doc, index) => {
          if (embeddings[index]) {
            doc.embedding = embeddings[index];
          }
        });
      }

      // Upsert to Qdrant
      const result = await this.qdrantService.upsertDocuments(request);
      
      console.log(`✅ Successfully processed ${result.processed_count} documents`);
      if (result.errors.length > 0) {
        console.log(`⚠️ ${result.errors.length} errors occurred during processing`);
      }

      return result;
    } catch (error) {
      console.error('❌ Failed to upsert documents:', error);
      throw error;
    }
  }

  async search(query: SearchQuery): Promise<SearchResult[]> {
    try {
      console.log(`🔍 Searching for: "${query.query}"`);

      // Generate embedding for the query
      const queryEmbedding = await this.embeddingService.generateEmbedding(query.query);

      // Build filter if needed
      const filter = this.buildSearchFilter(query);

      // Search in Qdrant
      const results = await this.qdrantService.search(
        queryEmbedding,
        query.limit || 10,
        query.threshold || 0.7,
        filter
      );

      console.log(`✅ Found ${results.length} relevant documents`);
      return results;
    } catch (error) {
      console.error('❌ Search failed:', error);
      throw error;
    }
  }

  async generateRAGContext(
    query: string,
    component?: string,
    locationPrefix?: string,
    windowSec: number = 60
  ): Promise<RAGContext> {
    try {
      console.log(`🧠 Generating RAG context for: "${query}"`);

      // Search for relevant documents
      const searchQuery: SearchQuery = {
        query,
        component: component || undefined,
        location: locationPrefix || undefined,
        limit: 10,
        threshold: 0.6,
        include_metadata: true,
      };

      const searchResults = await this.search(searchQuery);

      // Get sensor context if component and location are provided
      let sensorContext = null;
      if (component && locationPrefix) {
        sensorContext = await this.sensorContextService.getSensorContext(
          component,
          locationPrefix,
          windowSec
        );
      }

      // Combine contexts
      const combinedContext = this.combineContexts(query, searchResults, sensorContext);

      const ragContext: RAGContext = {
        query,
        search_results: searchResults,
        sensor_context: sensorContext || {
          component: component || '',
          location_prefix: locationPrefix || '',
          window_seconds: windowSec,
          readings: [],
          summary: {
            component: component || '',
            location_prefix: locationPrefix || '',
            total_readings: 0,
            readings_by_type: {},
            overall_stats: {},
            timestamp: new Date().toISOString(),
          },
        },
        combined_context: combinedContext,
        timestamp: new Date().toISOString(),
      };

      console.log('✅ RAG context generated successfully');
      return ragContext;
    } catch (error) {
      console.error('❌ Failed to generate RAG context:', error);
      throw error;
    }
  }

  private buildSearchFilter(query: SearchQuery): any {
    const conditions: any[] = [];

    if (query.category) {
      conditions.push({
        key: 'metadata.category',
        match: { value: query.category }
      });
    }

    if (query.location) {
      conditions.push({
        key: 'metadata.location',
        match: { value: query.location }
      });
    }

    if (query.component) {
      conditions.push({
        key: 'metadata.component',
        match: { value: query.component }
      });
    }

    if (conditions.length === 0) {
      return undefined;
    }

    return {
      must: conditions
    };
  }

  private combineContexts(
    query: string,
    searchResults: SearchResult[],
    sensorContext: any
  ): string {
    const parts = [
      `# Home Inspection Context`,
      `Query: ${query}`,
      `Generated: ${new Date().toISOString()}`,
    ];

    // Add search results
    if (searchResults.length > 0) {
      parts.push('\n## Relevant Documentation:');
      
      for (let i = 0; i < searchResults.length; i++) {
        const result = searchResults[i];
        if (result) {
          parts.push(`\n### ${i + 1}. ${result.title} (Relevance: ${result.relevance})`);
          parts.push(`Category: ${result.metadata.category}`);
          
          if (result.metadata.location) {
            parts.push(`Location: ${result.metadata.location}`);
          }
          
          if (result.metadata.component) {
            parts.push(`Component: ${result.metadata.component}`);
          }
          
          parts.push(`\nContent:\n${result.content}`);
        }
      }
    } else {
      parts.push('\n## Documentation: No relevant documents found.');
    }

    // Add sensor context
    if (sensorContext) {
      parts.push('\n' + this.sensorContextService.formatSensorContextForAI(sensorContext));
      
      // Add sensor-based recommendations
      const recommendations = this.sensorContextService.generateSensorRecommendations(
        sensorContext,
        searchResults
      );
      
      if (recommendations.length > 0) {
        parts.push('\n### Sensor-Based Recommendations:');
        recommendations.forEach(rec => parts.push(`- ${rec}`));
      }
    } else {
      parts.push('\n## Sensor Data: No sensor context available.');
    }

    // Add usage instructions
    parts.push('\n## Usage Instructions:');
    parts.push('Use the documentation and sensor data above to provide informed recommendations.');
    parts.push('Consider both the technical procedures and current sensor readings.');
    parts.push('Prioritize safety and code compliance in your recommendations.');

    return parts.join('\n');
  }

  async createDocumentFromText(
    title: string,
    content: string,
    category: DocumentCategory,
    metadata: any = {}
  ): Promise<Document> {
    const document = this.documentService.createDocument(title, content, category, metadata);
    document.embedding = await this.embeddingService.generateEmbedding(
      this.documentService['prepareContentForEmbedding'](document)
    );
    return document;
  }

  async healthCheck(): Promise<{
    qdrant: boolean;
    openai: boolean;
    backend: boolean;
  }> {
    const [qdrant, openai, backend] = await Promise.all([
      this.qdrantService.healthCheck(),
      this.embeddingService.healthCheck(),
      this.sensorContextService.healthCheck(),
    ]);

    return { qdrant, openai, backend };
  }

  async getCollectionInfo() {
    return await this.qdrantService.getCollectionInfo();
  }
}




