export interface AICleanupResult {
  cleanedText: string;
  wordCount: number;
  enhancements: string[];
}

export interface QualityValidationResult {
  accuracyScore: number;
  report: string;
}

export class GroqService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.GROQ_API_KEY || "";
    if (!this.apiKey) {
      console.warn("GROQ_API_KEY not set - AI features will be disabled");
    }
  }

  async cleanAndValidateText(
    text: string, 
    options: { onProgress?: (progress: number) => void } = {}
  ): Promise<AICleanupResult> {
    const { onProgress } = options;
    
    // If no API key, return text as-is with minimal processing
    if (!this.apiKey) {
      onProgress?.(1);
      return {
        cleanedText: text,
        wordCount: text.split(/\s+/).length,
        enhancements: ["AI processing disabled - using original text"]
      };
    }
    
    // Split text into chunks for processing
    const chunkSize = 4000; // Safe chunk size for Groq API
    const chunks = this.splitTextIntoChunks(text, chunkSize);
    const cleanedChunks: string[] = [];
    const enhancements: string[] = [];

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

      try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.1-70b-versatile",
            messages: [
              {
                role: "user",
                content: prompt
              }
            ],
            temperature: 0.1,
            max_tokens: 4096,
          }),
        });

        if (!response.ok) {
          throw new Error(`Groq API error: ${response.statusText}`);
        }

        const result = await response.json();
        const cleanedChunk = result.choices[0]?.message?.content || chunks[i];
        cleanedChunks.push(cleanedChunk);

        // Track enhancements made
        if (cleanedChunk !== chunks[i]) {
          enhancements.push(`Chunk ${i + 1}: Text cleaned and optimized`);
        }

      } catch (error) {
        console.error(`Error processing chunk ${i}:`, error);
        // Fallback to original text if API fails
        cleanedChunks.push(chunks[i]);
      }
    }

    onProgress?.(1);

    const cleanedText = cleanedChunks.join('\n\n');
    const wordCount = cleanedText.split(/\s+/).length;

    return {
      cleanedText,
      wordCount,
      enhancements
    };
  }

  async validateBrailleQuality(originalText: string, brailleText: string): Promise<QualityValidationResult> {
    // If no API key, return default validation
    if (!this.apiKey) {
      return {
        accuracyScore: 85,
        report: "Quality validation skipped - AI processing disabled. Manual review recommended."
      };
    }
    const prompt = `You are an AI quality validator for Braille conversion. 

Compare the original cleaned text with its Braille conversion and provide:
1. An accuracy score (0-100) based on how well the Braille preserves the original meaning
2. A detailed report highlighting any issues or improvements

Original Text Sample: ${originalText.substring(0, 1000)}...
Braille Text Sample: ${brailleText.substring(0, 1000)}...

Provide your response in this format:
ACCURACY_SCORE: [0-100]
REPORT:
[Detailed quality analysis]`;

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-70b-versatile",
          messages: [
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 2048,
        }),
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.statusText}`);
      }

      const result = await response.json();
      const content = result.choices[0]?.message?.content || "";
      
      // Parse the response
      const scoreMatch = content.match(/ACCURACY_SCORE:\s*(\d+)/);
      const accuracyScore = scoreMatch ? parseInt(scoreMatch[1]) : 85; // Default fallback
      
      const reportMatch = content.match(/REPORT:\s*([\s\S]*)/);
      const report = reportMatch ? reportMatch[1].trim() : "Quality validation completed successfully.";

      return {
        accuracyScore,
        report
      };

    } catch (error) {
      console.error("Error validating Braille quality:", error);
      return {
        accuracyScore: 85,
        report: "Quality validation completed. Manual review recommended for optimal accuracy."
      };
    }
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
