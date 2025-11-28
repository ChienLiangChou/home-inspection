#!/usr/bin/env tsx

import dotenv from 'dotenv';
import { QdrantService } from './services/qdrant.js';
import { EmbeddingService } from './services/embedding.js';
import { DocumentService } from './services/document.js';
import { SensorContextService } from './services/sensor-context.js';
import { RAGService } from './services/rag.js';
import { DocumentCategory } from './types/index.js';
import fs from 'fs/promises';
import path from 'path';

// Load environment variables
dotenv.config();

async function main() {
  try {
    console.log('🚀 Starting document ingestion process...');

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

    // Check if we have sample documents to ingest
    const sampleDocsPath = path.join(process.cwd(), 'sample-docs');
    
    try {
      await fs.access(sampleDocsPath);
      console.log(`📁 Found sample documents directory: ${sampleDocsPath}`);
      await ingestSampleDocuments(ragService, sampleDocsPath);
    } catch {
      console.log('📁 No sample documents found, creating sample knowledge base...');
      await createSampleKnowledgeBase(ragService);
    }

    // Health check
    const health = await ragService.healthCheck();
    console.log('\n🏥 Health Check Results:');
    console.log(`- Qdrant: ${health.qdrant ? '✅' : '❌'}`);
    console.log(`- OpenAI: ${health.openai ? '✅' : '❌'}`);
    console.log(`- Backend: ${health.backend ? '✅' : '❌'}`);

    // Collection info
    const collectionInfo = await ragService.getCollectionInfo();
    console.log('\n📊 Collection Information:');
    console.log(`- Name: ${collectionInfo.name}`);
    console.log(`- Status: ${collectionInfo.status}`);
    console.log(`- Points: ${collectionInfo.points_count}`);
    console.log(`- Vectors: ${collectionInfo.vectors_count}`);

    console.log('\n✅ Document ingestion completed successfully!');

  } catch (error) {
    console.error('❌ Ingestion failed:', error);
    process.exit(1);
  }
}

async function ingestSampleDocuments(ragService: RAGService, docsPath: string) {
  const categories: Record<string, DocumentCategory> = {
    'roofing': 'roofing',
    'plumbing': 'plumbing',
    'electrical': 'electrical',
    'hvac': 'hvac',
    'foundation': 'foundation',
    'safety': 'safety',
    'maintenance': 'maintenance',
  };

  for (const [folder, category] of Object.entries(categories)) {
    const folderPath = path.join(docsPath, folder);
    
    try {
      await fs.access(folderPath);
      console.log(`\n📂 Processing ${folder} documents...`);
      
      const documents = await ragService['documentService'].processDirectory(
        folderPath,
        category,
        { component: folder }
      );

      if (documents.length > 0) {
        await ragService.upsertDocuments({
          documents,
          batch_size: 5,
          update_existing: true,
        });
        console.log(`✅ Ingested ${documents.length} ${folder} documents`);
      }
    } catch {
      console.log(`⚠️ No ${folder} documents found, skipping...`);
    }
  }
}

async function createSampleKnowledgeBase(ragService: RAGService) {
  console.log('📚 Creating sample home inspection knowledge base...');

  const sampleDocuments = [
    {
      title: 'Roof Inspection Checklist',
      content: `# Roof Inspection Checklist

## Exterior Inspection
- Check for missing, cracked, or curled shingles
- Inspect flashing around chimneys, vents, and skylights
- Look for signs of moss, algae, or debris buildup
- Examine gutters and downspouts for damage or blockages
- Check for proper ventilation in attic space

## Interior Inspection
- Look for water stains on ceilings and walls
- Check for signs of moisture in attic
- Inspect insulation condition
- Verify proper ventilation

## Common Issues
- Leaks around flashing
- Damaged shingles from weather
- Poor ventilation causing moisture buildup
- Clogged gutters leading to water damage`,
      category: 'roofing' as DocumentCategory,
      metadata: { location: 'roof', severity: 'high' }
    },
    {
      title: 'Plumbing System Inspection Guide',
      content: `# Plumbing System Inspection Guide

## Water Supply System
- Check water pressure at all fixtures
- Inspect visible pipes for leaks or corrosion
- Test shut-off valves
- Examine water heater condition and age
- Check for proper temperature settings (120°F recommended)

## Drainage System
- Test all drains for proper flow
- Check for slow drains or blockages
- Inspect trap seals
- Look for signs of sewer gas

## Common Problems
- Low water pressure indicating pipe issues
- Leaky faucets or running toilets
- Water heater not functioning properly
- Drain clogs or slow drainage
- Signs of water damage from leaks`,
      category: 'plumbing' as DocumentCategory,
      metadata: { location: 'basement', severity: 'high' }
    },
    {
      title: 'Electrical Safety Inspection',
      content: `# Electrical Safety Inspection

## Panel and Wiring
- Check electrical panel for proper labeling
- Inspect for signs of overheating or corrosion
- Test GFCI outlets in bathrooms and kitchens
- Verify proper grounding
- Check for outdated knob and tube wiring

## Outlets and Switches
- Test all outlets for proper function
- Check for loose or damaged outlets
- Verify proper polarity
- Look for signs of arcing or burning

## Safety Concerns
- Exposed wiring or junction boxes
- Overloaded circuits
- Missing GFCI protection in wet areas
- Aluminum wiring (fire hazard)
- Improperly sized breakers`,
      category: 'electrical' as DocumentCategory,
      metadata: { location: 'living_room', severity: 'critical' }
    },
    {
      title: 'Moisture Detection Guidelines',
      content: `# Moisture Detection Guidelines

## Moisture Meter Usage
- Test multiple locations in each room
- Check areas prone to moisture (bathrooms, basements, kitchens)
- Look for readings above 20% in drywall
- Check wood for moisture content above 15%

## Signs of Moisture Problems
- Visible water stains or discoloration
- Musty odors indicating mold growth
- Peeling paint or wallpaper
- Warped or buckled flooring
- Condensation on windows or pipes

## Critical Moisture Levels
- 0-15%: Normal for most materials
- 16-20%: Elevated, monitor closely
- 21-25%: High risk, investigate source
- 26%+: Critical, immediate action required`,
      category: 'safety' as DocumentCategory,
      metadata: { component: 'moisture_meter', severity: 'high' }
    },
    {
      title: 'CO2 and Air Quality Assessment',
      content: `# CO2 and Air Quality Assessment

## Acceptable CO2 Levels
- Outdoor ambient: 400-450 ppm
- Indoor acceptable: 400-1000 ppm
- Indoor concerning: 1000-5000 ppm
- Dangerous: Above 5000 ppm

## Health Effects
- 1000-2000 ppm: Drowsiness, poor air quality
- 2000-5000 ppm: Headaches, sleepiness, poor concentration
- Above 5000 ppm: Oxygen deprivation, serious health risks

## Ventilation Solutions
- Ensure proper HVAC operation
- Check for blocked vents or returns
- Consider air exchange systems
- Monitor humidity levels (30-50% ideal)`,
      category: 'safety' as DocumentCategory,
      metadata: { component: 'co2', severity: 'critical' }
    }
  ];

  for (const docData of sampleDocuments) {
    const document = await ragService.createDocumentFromText(
      docData.title,
      docData.content,
      docData.category,
      docData.metadata
    );

    await ragService.upsertDocuments({
      documents: [document],
      update_existing: true,
    });

    console.log(`✅ Created: ${docData.title}`);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}












