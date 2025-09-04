import { Groq } from 'groq-sdk';

export interface AICleanupResult {
  cleanedText: string;
  wordCount: number;
  enhancements: string[];
}

export interface LineValidation {
  lineNumber: number;
  originalLine: string;
  brailleLine: string;
  accuracy: number;
  issues?: string[];
}

export interface QualityValidationResult {
  accuracyScore: number;
  report: string;
  lineValidations: LineValidation[];
}

export class GroqService {
  private groq: Groq | null;

  constructor() {
    const apiKey = process.env.GROQ_API_KEY;
    if (apiKey) {
      this.groq = new Groq({ apiKey });
    } else {
      this.groq = null;
      console.warn("GROQ_API_KEY not set - AI features will be disabled");
    }
  }

  async cleanAndValidateText(
    text: string, 
    options: { 
      onProgress?: (progress: number) => void;
      conversionId?: string;
    } = {}
  ): Promise<AICleanupResult> {
    const { onProgress, conversionId } = options;
    
    // If no API key, return text as-is with minimal processing
    if (!this.groq) {
      onProgress?.(1);
      return {
        cleanedText: text,
        wordCount: text.split(/\s+/).length,
        enhancements: ["AI processing disabled - using original text"]
      };
    }
    
    // Quick test for rate limits before processing
    try {
      await this.groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: "test" }],
        temperature: 0.1,
        max_tokens: 1,
      });
    } catch (testError) {
      if (testError instanceof Error && testError.message.includes('rate_limit_exceeded')) {
        console.log('Rate limit detected at start - skipping AI processing entirely');
        
        if (conversionId && global.broadcastLiveUpdate) {
          global.broadcastLiveUpdate(conversionId, {
            stage: 'ai_review',
            message: 'AI rate limit reached - proceeding with original text',
            details: 'Daily AI quota exceeded, continuing without text enhancement',
            timestamp: new Date().toISOString()
          });
        }
        
        onProgress?.(1);
        return {
          cleanedText: text,
          wordCount: text.split(/\s+/).length,
          enhancements: ["AI processing skipped due to rate limits - using original text"]
        };
      }
    }
    
    // Broadcast initial status
    if (conversionId && global.broadcastLiveUpdate) {
      global.broadcastLiveUpdate(conversionId, {
        stage: 'ai_review',
        message: `Starting AI text review and cleanup...`,
        details: `Processing ${text.length.toLocaleString()} characters of text`,
        timestamp: new Date().toISOString()
      });
    }

    // Split text into chunks for processing
    const chunkSize = 4000; // Safe chunk size for Groq API
    const chunks = this.splitTextIntoChunks(text, chunkSize);
    const cleanedChunks: string[] = [];
    const enhancements: string[] = [];

    if (conversionId && global.broadcastLiveUpdate) {
      global.broadcastLiveUpdate(conversionId, {
        stage: 'ai_review',
        message: `Split text into ${chunks.length} chunks for processing`,
        details: `Each chunk: ~${chunkSize} characters`,
        timestamp: new Date().toISOString()
      });
    }

    for (let i = 0; i < chunks.length; i++) {
      onProgress?.(i / chunks.length);

      const prompt = `You are an AI assistant specializing in text cleanup for Braille conversion. 

Your task is to clean and optimize the following extracted text from a PDF for Braille conversion:

1. Fix OCR errors and character recognition mistakes
2. Correct formatting issues and paragraph breaks
3. Preserve the original meaning and structure
4. Optimize for Braille readability
5. Handle mathematical formulas and special notation appropriately
6. Maintain proper spacing and line breaks

Return only the cleaned text without any additional commentary.

Text to clean:
${chunks[i]}`;

      if (conversionId && global.broadcastLiveUpdate) {
        global.broadcastLiveUpdate(conversionId, {
          stage: 'ai_review',
          message: `Processing chunk ${i + 1} of ${chunks.length}`,
          details: `Sending to Groq AI for text cleanup and optimization...`,
          timestamp: new Date().toISOString()
        });
      }

      try {
        const response = await this.groq!.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 4096,
        });

        const cleanedChunk = response.choices[0]?.message?.content || chunks[i];
        cleanedChunks.push(cleanedChunk);

        // Track enhancements made
        if (cleanedChunk !== chunks[i]) {
          enhancements.push(`Chunk ${i + 1}: Text cleaned and optimized`);
        }

        if (conversionId && global.broadcastLiveUpdate) {
          global.broadcastLiveUpdate(conversionId, {
            stage: 'ai_review',
            message: `Completed chunk ${i + 1} of ${chunks.length}`,
            details: cleanedChunk !== chunks[i] ? 'Text cleaned and enhanced' : 'Text validated, no changes needed',
            timestamp: new Date().toISOString()
          });
        }

      } catch (error) {
        console.error(`Error processing chunk ${i}:`, error);
        
        // Check if it's a rate limit error
        if (error instanceof Error && error.message.includes('rate_limit_exceeded')) {
          console.log('Rate limit detected, skipping AI processing for remaining chunks');
          // Add all remaining chunks without AI processing
          cleanedChunks.push(...chunks.slice(i));
          enhancements.push('AI processing limited due to rate limits - using original text');
          break;
        }
        
        // Fallback to original text if API fails
        cleanedChunks.push(chunks[i]);
      }
    }

    onProgress?.(1);

    if (conversionId && global.broadcastLiveUpdate) {
      global.broadcastLiveUpdate(conversionId, {
        stage: 'ai_review',
        message: `AI text cleanup completed!`,
        details: `Processed ${chunks.length} chunks, applied ${enhancements.length} enhancements`,
        timestamp: new Date().toISOString()
      });
    }

    const cleanedText = cleanedChunks.join('\n\n');
    const wordCount = cleanedText.split(/\s+/).length;

    return {
      cleanedText,
      wordCount,
      enhancements
    };
  }

  async makeRequest(
    prompt: string, 
    options: { maxTokens?: number; temperature?: number } = {}
  ): Promise<string> {
    if (!this.groq) {
      throw new Error("Groq API not available - please check GROQ_API_KEY environment variable");
    }

    try {
      const response = await this.groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: options.temperature || 0.1,
        max_tokens: options.maxTokens || 2048,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No content received from Groq API");
      }
      
      return content;
    } catch (error) {
      console.error('Error making Groq API request:', error);
      if (error instanceof Error) {
        throw new Error(`Groq API error: ${error.message}`);
      }
      throw new Error('Groq API request failed');
    }
  }

  async validateBrailleQuality(originalText: string, brailleText: string): Promise<QualityValidationResult> {
    // If no API key or rate limited, return default validation
    if (!this.groq) {
      const originalLines = originalText.split('\n');
      const brailleLines = brailleText.split('\n');
      
      return {
        accuracyScore: 85,
        report: "Quality validation skipped - AI processing disabled. Manual review recommended.",
        lineValidations: originalLines.map((line, index) => ({
          lineNumber: index + 1,
          originalLine: line,
          brailleLine: brailleLines[index] || "",
          accuracy: 85,
          issues: ["AI validation disabled"]
        }))
      };
    }

    // Perform line-by-line validation
    const lineValidations = await this.validateLineByLine(originalText, brailleText);
    
    // Calculate overall accuracy
    const totalAccuracy = lineValidations.reduce((sum, val) => sum + val.accuracy, 0);
    const averageAccuracy = Math.round(totalAccuracy / lineValidations.length);

    // Generate overall report
    const highAccuracyLines = lineValidations.filter(v => v.accuracy >= 95).length;
    const lowAccuracyLines = lineValidations.filter(v => v.accuracy < 85).length;
    
    const report = `Line-by-Line Validation Complete:
- Total Lines: ${lineValidations.length}
- High Accuracy Lines (95%+): ${highAccuracyLines}
- Lines Needing Review (<85%): ${lowAccuracyLines}
- Overall Quality: ${averageAccuracy >= 95 ? 'Excellent' : averageAccuracy >= 85 ? 'Good' : 'Needs Improvement'}

${lowAccuracyLines > 0 ? `\nIssues found in ${lowAccuracyLines} lines. Review flagged sections for accuracy.` : 'No significant issues detected.'}`;

    return {
      accuracyScore: averageAccuracy,
      report,
      lineValidations
    };
  }

  private async validateLineByLine(originalText: string, brailleText: string): Promise<LineValidation[]> {
    const originalLines = originalText.split('\n');
    const brailleLines = brailleText.split('\n');
    const maxLines = Math.max(originalLines.length, brailleLines.length);
    
    const validations: LineValidation[] = [];
    
    // Process in batches to avoid API limits
    const batchSize = 10;
    for (let i = 0; i < maxLines; i += batchSize) {
      const batch = [];
      
      for (let j = i; j < Math.min(i + batchSize, maxLines); j++) {
        const originalLine = originalLines[j] || "";
        const brailleLine = brailleLines[j] || "";
        
        if (originalLine.trim().length === 0 && brailleLine.trim().length === 0) {
          // Empty lines are always accurate
          validations.push({
            lineNumber: j + 1,
            originalLine,
            brailleLine,
            accuracy: 100
          });
          continue;
        }
        
        batch.push({
          lineNumber: j + 1,
          originalLine,
          brailleLine
        });
      }
      
      if (batch.length > 0) {
        const batchValidations = await this.validateBatch(batch);
        validations.push(...batchValidations);
      }
      
      // Small delay to respect API rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return validations;
  }

  private async validateBatch(batch: Array<{lineNumber: number, originalLine: string, brailleLine: string}>): Promise<LineValidation[]> {
    const prompt = `You are an expert Braille validator. Compare these original text lines with their Braille translations and score each line's accuracy from 0-100.

For each line, provide:
1. Accuracy score (0-100)
2. Any specific issues found

Lines to validate:
${batch.map((item, index) => `
Line ${item.lineNumber}:
Original: "${item.originalLine}"
Braille: "${item.brailleLine}"
`).join('')}

Respond in this exact JSON format:
{
  "validations": [
    {"lineNumber": 1, "accuracy": 95, "issues": ["minor spacing issue"]},
    {"lineNumber": 2, "accuracy": 100, "issues": []}
  ]
}`;

    try {
      const response = await this.groq!.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1024,
      });

      const content = response.choices[0]?.message?.content || "";
      
      // Parse JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return batch.map(item => {
          const validation = parsed.validations?.find((v: any) => v.lineNumber === item.lineNumber);
          return {
            lineNumber: item.lineNumber,
            originalLine: item.originalLine,
            brailleLine: item.brailleLine,
            accuracy: validation?.accuracy || 85,
            issues: validation?.issues || []
          };
        });
      }
    } catch (error) {
      console.error("Error validating batch:", error);
      
      // If rate limited, skip validation and return defaults
      if (error instanceof Error && error.message.includes('rate_limit_exceeded')) {
        console.log('Rate limit hit during validation, using default scores');
      }
    }
    
    // Fallback: return default validation
    return batch.map(item => ({
      lineNumber: item.lineNumber,
      originalLine: item.originalLine,
      brailleLine: item.brailleLine,
      accuracy: 85,
      issues: ["Validation failed - manual review recommended"]
    }));
  }

  private splitTextIntoChunks(text: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    let currentPos = 0;

    while (currentPos < text.length) {
      let endPos = Math.min(currentPos + chunkSize, text.length);
      
      // Try to break at a natural boundary (paragraph or sentence)
      if (endPos < text.length) {
        const lastParagraph = text.lastIndexOf('\n\n', endPos);
        const lastSentence = text.lastIndexOf('. ', endPos);
        
        if (lastParagraph > currentPos + chunkSize * 0.5) {
          endPos = lastParagraph + 2;
        } else if (lastSentence > currentPos + chunkSize * 0.5) {
          endPos = lastSentence + 2;
        }
      }

      chunks.push(text.substring(currentPos, endPos));
      currentPos = endPos;
    }

    return chunks;
  }
}
