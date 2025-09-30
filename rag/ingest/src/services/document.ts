import fs from 'fs/promises';
import path from 'path';
import { Document, DocumentMetadata, DocumentCategory } from '../types/index.js';
import { EmbeddingService } from './embedding.js';

export class DocumentService {
  private embeddingService: EmbeddingService;

  constructor(embeddingService: EmbeddingService) {
    this.embeddingService = embeddingService;
  }

  async processFile(
    filePath: string,
    category: DocumentCategory,
    metadata: Partial<DocumentMetadata> = {}
  ): Promise<Document> {
    try {
      const content = await this.extractText(filePath);
      const stats = await fs.stat(filePath);
      const fileName = path.basename(filePath);
      
      const documentMetadata: DocumentMetadata = {
        source: filePath,
        category,
        tags: this.extractTags(content, category),
        location: metadata.location,
        component: metadata.component,
        severity: metadata.severity || 'medium',
        confidence: 1.0,
        language: 'en',
        file_type: path.extname(filePath),
        file_size: stats.size,
        ...metadata,
      };

      const document: Document = {
        id: this.generateDocumentId(filePath, category),
        title: this.extractTitle(content, fileName),
        content,
        metadata: documentMetadata,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Generate embedding
      document.embedding = await this.embeddingService.generateEmbedding(
        this.prepareContentForEmbedding(document)
      );

      return document;
    } catch (error) {
      console.error(`❌ Failed to process file ${filePath}:`, error);
      throw error;
    }
  }

  async processDirectory(
    directoryPath: string,
    category: DocumentCategory,
    metadata: Partial<DocumentMetadata> = {}
  ): Promise<Document[]> {
    try {
      const files = await fs.readdir(directoryPath);
      const documents: Document[] = [];

      for (const file of files) {
        const filePath = path.join(directoryPath, file);
        const stats = await fs.stat(filePath);

        if (stats.isFile() && this.isSupportedFileType(file)) {
          try {
            const document = await this.processFile(filePath, category, metadata);
            documents.push(document);
          } catch (error) {
            console.error(`⚠️ Skipped file ${filePath}:`, error);
          }
        }
      }

      return documents;
    } catch (error) {
      console.error(`❌ Failed to process directory ${directoryPath}:`, error);
      throw error;
    }
  }

  private async extractText(filePath: string): Promise<string> {
    const ext = path.extname(filePath).toLowerCase();

    switch (ext) {
      case '.txt':
        return await fs.readFile(filePath, 'utf-8');
      
      case '.md':
        return await fs.readFile(filePath, 'utf-8');
      
      case '.json':
        const jsonContent = await fs.readFile(filePath, 'utf-8');
        const parsed = JSON.parse(jsonContent);
        return typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2);
      
      case '.pdf':
        // Note: You would need to implement PDF parsing
        // For now, return placeholder
        return `[PDF Content from ${path.basename(filePath)}]`;
      
      case '.docx':
        // Note: You would need to implement DOCX parsing
        return `[DOCX Content from ${path.basename(filePath)}]`;
      
      default:
        throw new Error(`Unsupported file type: ${ext}`);
    }
  }

  private isSupportedFileType(fileName: string): boolean {
    const supportedExtensions = ['.txt', '.md', '.json', '.pdf', '.docx'];
    const ext = path.extname(fileName).toLowerCase();
    return supportedExtensions.includes(ext);
  }

  private extractTitle(content: string, fileName: string): string {
    // Try to extract title from content
    const lines = content.split('\n');
    
    // Look for markdown headers
    for (const line of lines.slice(0, 10)) {
      if (line.startsWith('# ')) {
        return line.substring(2).trim();
      }
    }

    // Look for title-like patterns
    for (const line of lines.slice(0, 5)) {
      if (line.length > 10 && line.length < 100 && !line.includes(' ')) {
        return line.trim();
      }
    }

    // Fallback to filename without extension
    return path.parse(fileName).name;
  }

  private extractTags(content: string, category: DocumentCategory): string[] {
    const tags = [category];
    const lowerContent = content.toLowerCase();

    // Extract location-based tags
    const locations = ['roof', 'basement', 'kitchen', 'bathroom', 'living_room', 'attic', 'garage'];
    for (const location of locations) {
      if (lowerContent.includes(location)) {
        tags.push(location);
      }
    }

    // Extract component-based tags
    const components = ['plumbing', 'electrical', 'hvac', 'foundation', 'insulation', 'safety'];
    for (const component of components) {
      if (lowerContent.includes(component)) {
        tags.push(component);
      }
    }

    // Extract severity indicators
    if (lowerContent.includes('critical') || lowerContent.includes('urgent')) {
      tags.push('critical');
    } else if (lowerContent.includes('warning') || lowerContent.includes('caution')) {
      tags.push('warning');
    }

    return [...new Set(tags)]; // Remove duplicates
  }

  private generateDocumentId(filePath: string, category: DocumentCategory): string {
    const fileName = path.basename(filePath);
    const timestamp = Date.now();
    return `${category}_${path.parse(fileName).name}_${timestamp}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  private prepareContentForEmbedding(document: Document): string {
    // Combine title and content for better embedding quality
    const parts = [
      `Title: ${document.title}`,
      `Category: ${document.metadata.category}`,
      `Content: ${document.content}`,
    ];

    if (document.metadata.location) {
      parts.push(`Location: ${document.metadata.location}`);
    }

    if (document.metadata.component) {
      parts.push(`Component: ${document.metadata.component}`);
    }

    return parts.join('\n\n');
  }

  createDocument(
    title: string,
    content: string,
    category: DocumentCategory,
    metadata: Partial<DocumentMetadata> = {}
  ): Document {
    return {
      id: this.generateDocumentId(title, category),
      title,
      content,
      metadata: {
        source: 'manual',
        category,
        tags: [category],
        language: 'en',
        confidence: 1.0,
        ...metadata,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
}
