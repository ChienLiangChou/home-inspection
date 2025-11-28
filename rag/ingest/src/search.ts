#!/usr/bin/env tsx

import dotenv from 'dotenv';
import { QdrantService } from './services/qdrant.js';
import { EmbeddingService } from './services/embedding.js';
import { DocumentService } from './services/document.js';
import { SensorContextService } from './services/sensor-context.js';
import { RAGService } from './services/rag.js';
import { SearchQuery, DocumentCategory } from './types/index.js';

// Load environment variables
dotenv.config();

async function main() {
  try {
    console.log('🔍 Starting RAG search...');

    // Get query from command line arguments
    const query = process.argv[2];
    if (!query) {
      console.log('Usage: npm run search "your search query"');
      console.log('Example: npm run search "roof leak inspection"');
      process.exit(1);
    }

    // Validate environment variables
    const requiredEnvVars = [
      'OPENAI_API_KEY',
      'QDRANT_URL',
      'QDRANT_API_KEY',
      'COLLECTION_NAME',
    ];

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }

    // Initialize services
    const qdrantService = new QdrantService(
      process.env.QDRANT_URL!,
      process.env.QDRANT_API_KEY,
      process.env.COLLECTION_NAME!
    );

    const embeddingService = new EmbeddingService(process.env.OPENAI_API_KEY!, {
      model: process.env.EMBEDDING_MODEL || 'text-embedding-ada-002',
      dimension: parseInt(process.env.EMBEDDING_DIMENSION || '1536'),
      batch_size: 10,
      max_retries: 3,
    });

    const documentService = new DocumentService(embeddingService);
    const sensorContextService = new SensorContextService(
      process.env.BACKEND_API_URL || 'http://localhost:8000'
    );

    const ragService = new RAGService(
      qdrantService,
      embeddingService,
      documentService,
      sensorContextService
    );

    // Initialize RAG service
    await ragService.initialize();

    // Perform different types of searches
    await performBasicSearch(ragService, query);
    await performCategorizedSearch(ragService, query);
    await performRAGContextSearch(ragService, query);

  } catch (error) {
    console.error('❌ Search failed:', error);
    process.exit(1);
  }
}

async function performBasicSearch(ragService: RAGService, query: string) {
  console.log(`\n🔍 Basic Search Results for: "${query}"`);
  console.log('=' .repeat(60));

  const searchQuery: SearchQuery = {
    query,
    limit: 5,
    threshold: 0.6,
    include_metadata: true,
  };

  try {
    const results = await ragService.search(searchQuery);

    if (results.length === 0) {
      console.log('❌ No results found');
      return;
    }

    results.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.title}`);
      console.log(`   Category: ${result.metadata.category}`);
      console.log(`   Relevance: ${result.relevance} (Score: ${result.score.toFixed(3)})`);
      if (result.metadata.location) {
        console.log(`   Location: ${result.metadata.location}`);
      }
      if (result.metadata.component) {
        console.log(`   Component: ${result.metadata.component}`);
      }
      console.log(`   Content Preview: ${result.content.substring(0, 200)}...`);
    });
  } catch (error) {
    console.error('❌ Basic search failed:', error);
  }
}

async function performCategorizedSearch(ragService: RAGService, query: string) {
  const categories: DocumentCategory[] = ['roofing', 'plumbing', 'electrical', 'safety'];

  console.log(`\n🏷️ Categorized Search Results for: "${query}"`);
  console.log('=' .repeat(60));

  for (const category of categories) {
    console.log(`\n📂 ${category.toUpperCase()} Category:`);

    const searchQuery: SearchQuery = {
      query,
      category,
      limit: 3,
      threshold: 0.5,
      include_metadata: true,
    };

    try {
      const results = await ragService.search(searchQuery);

      if (results.length === 0) {
        console.log(`   No results found for ${category}`);
        continue;
      }

      results.forEach((result, index) => {
        console.log(`   ${index + 1}. ${result.title} (${result.relevance})`);
      });
    } catch (error) {
      console.error(`   ❌ Search failed for ${category}:`, error);
    }
  }
}

async function performRAGContextSearch(ragService: RAGService, query: string) {
  console.log(`\n🧠 RAG Context Search for: "${query}"`);
  console.log('=' .repeat(60));

  // Simulate different inspection scenarios
  const scenarios = [
    { component: 'roofing', location: 'roof', description: 'Roofing Inspection' },
    { component: 'plumbing', location: 'basement', description: 'Basement Plumbing' },
    { component: 'electrical', location: 'living_room', description: 'Electrical Safety' },
  ];

  for (const scenario of scenarios) {
    console.log(`\n🔧 Scenario: ${scenario.description}`);
    console.log(`   Component: ${scenario.component}, Location: ${scenario.location}`);

    try {
      const ragContext = await ragService.generateRAGContext(
        query,
        scenario.component,
        scenario.location,
        300 // 5 minutes window
      );

      console.log(`   📚 Found ${ragContext.search_results.length} relevant documents`);
      
      if (ragContext.sensor_context) {
        console.log(`   📊 Sensor data: ${ragContext.sensor_context.readings.length} readings`);
        
        // Show sensor summary
        const summary = ragContext.sensor_context.summary;
        if (summary && Object.keys(summary.readings_by_type).length > 0) {
          console.log(`   📈 Sensor types: ${Object.keys(summary.readings_by_type).join(', ')}`);
        }
      } else {
        console.log(`   📊 No sensor data available`);
      }

      // Show combined context preview
      const contextPreview = ragContext.combined_context.substring(0, 300);
      console.log(`   📄 Context Preview: ${contextPreview}...`);

    } catch (error) {
      console.error(`   ❌ RAG context search failed:`, error);
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}












