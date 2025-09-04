import { GroqService } from "./groqService";

export interface Chapter {
  id: string;
  title: string;
  startPage?: number;
  endPage?: number;
  summary: string;
  keyTopics: string[];
  brailleStartLine?: number;
  brailleEndLine?: number;
}

export interface DocumentAnalysis {
  chapters: Chapter[];
  documentSummary: string;
  keyTopics: string[];
}

export class ChapterService {
  private groqService: GroqService;

  constructor() {
    this.groqService = new GroqService();
  }

  async analyzeDocumentStructure(
    text: string,
    options: {
      onProgress?: (progress: number) => void;
      conversionId?: string;
    } = {}
  ): Promise<DocumentAnalysis> {
    const { onProgress, conversionId } = options;
    
    if (conversionId && global.broadcastLiveUpdate) {
      global.broadcastLiveUpdate(conversionId, {
        stage: 'chapter_analysis',
        message: 'Starting document structure analysis...',
        details: 'AI is analyzing document for chapters and creating navigation',
        timestamp: new Date().toISOString()
      });
    }

    onProgress?.(0.1);

    try {
      // Step 1: Detect chapter structure
      const chapters = await this.detectChapters(text, { conversionId });
      onProgress?.(0.5);

      // Step 2: Generate chapter summaries
      await this.generateChapterSummaries(chapters, text, { conversionId });
      onProgress?.(0.8);

      // Step 3: Generate document summary and key topics
      const { documentSummary, keyTopics } = await this.generateDocumentSummary(text, chapters, { conversionId });
      onProgress?.(1.0);

      if (conversionId && global.broadcastLiveUpdate) {
        global.broadcastLiveUpdate(conversionId, {
          stage: 'chapter_analysis',
          message: `Document analysis completed!`,
          details: `Found ${chapters.length} chapters, generated summaries and navigation`,
          timestamp: new Date().toISOString()
        });
      }
      
      return {
        chapters,
        documentSummary,
        keyTopics
      };
    } catch (error) {
      console.error('Error in document analysis:', error);
      // Return a fallback structure
      const fallbackChapters: Chapter[] = [{
        id: 'chapter-1',
        title: 'Document Content',
        summary: 'Full document content (chapter analysis failed)',
        keyTopics: ['Document content']
      }];
      
      if (conversionId && global.broadcastLiveUpdate) {
        global.broadcastLiveUpdate(conversionId, {
          stage: 'chapter_analysis',
          message: 'Chapter analysis failed, using fallback structure',
          details: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
      
      return {
        chapters: fallbackChapters,
        documentSummary: 'Document analysis failed - manual review recommended',
        keyTopics: ['Document content']
      };
    }
  }

  private async detectChapters(text: string, options: { conversionId?: string }): Promise<Chapter[]> {
    const { conversionId } = options;

    if (conversionId && global.broadcastLiveUpdate) {
      global.broadcastLiveUpdate(conversionId, {
        stage: 'chapter_analysis',
        message: 'Detecting chapter structure...',
        details: 'AI is identifying chapters, sections, and document organization',
        timestamp: new Date().toISOString()
      });
    }

    // Use first 20,000 characters for chapter detection to avoid token limits
    const sampleText = text.substring(0, 20000);
    
    const prompt = `You are an AI assistant specialized in analyzing document structure. Analyze the following text and identify the chapter or section structure.

Your task:
1. Identify main chapters, sections, or parts in the document
2. Extract the title of each chapter/section
3. Estimate page ranges if possible from content flow
4. Identify 3-5 key topics for each chapter
5. Return ONLY valid JSON in the exact format shown below

Return format (JSON only, no other text):
{
  "chapters": [
    {
      "id": "chapter-1",
      "title": "Introduction",
      "startPage": 1,
      "endPage": 5,
      "keyTopics": ["topic1", "topic2", "topic3"]
    }
  ]
}

Text to analyze:
${sampleText}`;

    try {
      const result = await this.groqService.makeRequest(prompt, {
        maxTokens: 2048,
        temperature: 0.2
      });

      const parsed = JSON.parse(result);
      
      return parsed.chapters.map((chapter: any, index: number) => ({
        id: chapter.id || `chapter-${index + 1}`,
        title: chapter.title || `Chapter ${index + 1}`,
        startPage: chapter.startPage,
        endPage: chapter.endPage,
        summary: '', // Will be filled later
        keyTopics: chapter.keyTopics || []
      }));

    } catch (error) {
      console.error('Error detecting chapters:', error);
      
      // Fallback: Create basic chapters based on common patterns
      return this.createFallbackChapters(text);
    }
  }

  private createFallbackChapters(text: string): Chapter[] {
    const chapters: Chapter[] = [];
    const lines = text.split('\n');
    let chapterCount = 1;

    // Look for common chapter patterns
    const chapterPatterns = [
      /^Chapter\s+\d+/i,
      /^\d+\.\s+/,
      /^[IVX]+\.\s+/,
      /^Part\s+\d+/i,
      /^Section\s+\d+/i
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (chapterPatterns.some(pattern => pattern.test(line)) && line.length < 100) {
        chapters.push({
          id: `chapter-${chapterCount}`,
          title: line,
          summary: '',
          keyTopics: []
        });
        chapterCount++;
      }
    }

    // If no chapters found, create a single chapter
    if (chapters.length === 0) {
      chapters.push({
        id: 'chapter-1',
        title: 'Complete Document',
        summary: '',
        keyTopics: []
      });
    }

    return chapters;
  }

  private async generateChapterSummaries(
    chapters: Chapter[], 
    fullText: string, 
    options: { conversionId?: string }
  ): Promise<void> {
    const { conversionId } = options;
    
    // If only one chapter (full document), generate a summary for the entire text
    if (chapters.length === 1) {
      const summary = await this.generateSingleSummary(fullText, chapters[0].title, { conversionId });
      chapters[0].summary = summary;
      return;
    }

    // For multiple chapters, try to extract relevant sections
    const textChunks = this.splitTextIntoChapters(fullText, chapters);
    
    for (let i = 0; i < chapters.length; i++) {
      if (conversionId && global.broadcastLiveUpdate) {
        global.broadcastLiveUpdate(conversionId, {
          stage: 'chapter_analysis',
          message: `Generating summary for ${chapters[i].title}...`,
          details: `Processing chapter ${i + 1} of ${chapters.length}`,
          timestamp: new Date().toISOString()
        });
      }

      const chapterText = textChunks[i] || fullText.substring(
        Math.floor((i / chapters.length) * fullText.length),
        Math.floor(((i + 1) / chapters.length) * fullText.length)
      );

      chapters[i].summary = await this.generateSingleSummary(
        chapterText, 
        chapters[i].title,
        { conversionId }
      );
    }
  }

  private async generateSingleSummary(
    text: string, 
    chapterTitle: string, 
    options: { conversionId?: string }
  ): Promise<string> {
    const prompt = `You are an AI assistant specialized in creating concise, informative summaries.

Create a clear, helpful summary of the following text section titled "${chapterTitle}".

Guidelines:
1. Write 2-4 sentences maximum
2. Focus on the main concepts and key information
3. Make it useful for Braille readers who need efficient navigation
4. Be clear and direct
5. Return ONLY the summary text, no formatting or additional commentary

Text to summarize:
${text.substring(0, 4000)}`;

    try {
      return await this.groqService.makeRequest(prompt, {
        maxTokens: 256,
        temperature: 0.3
      });
    } catch (error) {
      console.error('Error generating summary:', error);
      return `Summary of ${chapterTitle}: Key concepts and information covered in this section.`;
    }
  }

  private async generateDocumentSummary(
    text: string, 
    chapters: Chapter[], 
    options: { conversionId?: string }
  ): Promise<{ documentSummary: string; keyTopics: string[] }> {
    const { conversionId } = options;

    if (conversionId && global.broadcastLiveUpdate) {
      global.broadcastLiveUpdate(conversionId, {
        stage: 'chapter_analysis',
        message: 'Generating document summary and key topics...',
        details: 'Creating overview and extracting main themes',
        timestamp: new Date().toISOString()
      });
    }

    const chapterTitles = chapters.map(c => c.title).join(', ');
    
    const prompt = `You are an AI assistant specialized in document analysis and summarization.

Analyze this document and provide:
1. A concise document summary (2-3 sentences)
2. A list of 5-8 key topics covered in the document

Chapter structure: ${chapterTitles}

Return ONLY valid JSON in this exact format:
{
  "documentSummary": "Brief overview of the entire document...",
  "keyTopics": ["topic1", "topic2", "topic3", "topic4", "topic5"]
}

Document text (first portion):
${text.substring(0, 3000)}`;

    try {
      const result = await this.groqService.makeRequest(prompt, {
        maxTokens: 512,
        temperature: 0.2
      });

      const parsed = JSON.parse(result);
      return {
        documentSummary: parsed.documentSummary || "Document summary not available",
        keyTopics: parsed.keyTopics || []
      };

    } catch (error) {
      console.error('Error generating document summary:', error);
      
      return {
        documentSummary: `This document contains ${chapters.length} main sections covering various topics and concepts.`,
        keyTopics: chapters.flatMap(c => c.keyTopics).slice(0, 8)
      };
    }
  }

  private splitTextIntoChapters(text: string, chapters: Chapter[]): string[] {
    // Simple text splitting based on chapter count
    const chunks: string[] = [];
    const chunkSize = Math.floor(text.length / chapters.length);
    
    for (let i = 0; i < chapters.length; i++) {
      const start = i * chunkSize;
      const end = i === chapters.length - 1 ? text.length : (i + 1) * chunkSize;
      chunks.push(text.substring(start, end));
    }
    
    return chunks;
  }

  updateChapterBraillePositions(chapters: Chapter[], brailleText: string): Chapter[] {
    const brailleLines = brailleText.split('\n');
    const totalLines = brailleLines.length;
    
    return chapters.map((chapter, index) => {
      const linesPerChapter = Math.floor(totalLines / chapters.length);
      const startLine = index * linesPerChapter;
      const endLine = index === chapters.length - 1 ? totalLines : (index + 1) * linesPerChapter;
      
      return {
        ...chapter,
        brailleStartLine: startLine,
        brailleEndLine: endLine
      };
    });
  }
}