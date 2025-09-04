export interface BrailleConversionResult {
  brailleText: string;
  pageCount: number;
}

export class BrailleService {
  // Online Braille translator integration
  private readonly BRAILLE_TRANSLATOR_URL = 'https://www.brailletranslator.org';
  
  // Grade 1 Braille character mapping (fallback)
  private readonly brailleMap: Record<string, string> = {
    'a': '⠁', 'b': '⠃', 'c': '⠉', 'd': '⠙', 'e': '⠑', 'f': '⠋',
    'g': '⠛', 'h': '⠓', 'i': '⠊', 'j': '⠚', 'k': '⠅', 'l': '⠇',
    'm': '⠍', 'n': '⠝', 'o': '⠕', 'p': '⠏', 'q': '⠟', 'r': '⠗',
    's': '⠎', 't': '⠞', 'u': '⠥', 'v': '⠧', 'w': '⠺', 'x': '⠭',
    'y': '⠽', 'z': '⠵',
    '1': '⠼⠁', '2': '⠼⠃', '3': '⠼⠉', '4': '⠼⠙', '5': '⠼⠑',
    '6': '⠼⠋', '7': '⠼⠛', '8': '⠼⠓', '9': '⠼⠊', '0': '⠼⠚',
    '.': '⠲', ',': '⠂', ';': '⠆', ':': '⠒', '!': '⠖', '?': '⠦',
    "'": '⠄', '"': '⠦', '(': '⠷', ')': '⠾', '-': '⠤', ' ': ' ',
    '\n': '\n', '\r': '', '\t': ' '
  };

  async convertToBraille(
    text: string,
    options: { onProgress?: (progress: number) => void } = {}
  ): Promise<BrailleConversionResult> {
    const { onProgress } = options;
    
    // Try advanced online translator first for Grade 2 Braille
    try {
      console.log('Using brailletranslator.org for Grade 2 Braille conversion...');
      onProgress?.(0.1);
      
      const result = await this.convertWithOnlineTranslator(text);
      onProgress?.(1.0);
      
      if (result && result.brailleText.trim().length > 0) {
        console.log('Online Grade 2 Braille conversion successful');
        return result;
      }
    } catch (error) {
      console.warn('Online translator failed, falling back to local conversion:', error);
    }
    
    // Fallback to local Grade 1 conversion
    console.log('Using local Grade 1 Braille conversion...');
    return this.convertWithLocalMapping(text, options);
  }
  
  private async convertWithOnlineTranslator(text: string): Promise<BrailleConversionResult> {
    // Use a simpler API approach - test with direct translation
    const maxChunkSize = 2000; // Conservative chunk size
    const chunks = this.splitIntoChunks(text, maxChunkSize);
    const brailleChunks: string[] = [];
    
    for (const chunk of chunks) {
      try {
        // Try different API endpoints for brailletranslator.org
        const endpoints = [
          { url: `${this.BRAILLE_TRANSLATOR_URL}/api/translate`, params: { text: chunk, grade: 2, lang: 'en-us' } },
          { url: `${this.BRAILLE_TRANSLATOR_URL}/translate`, params: { text: chunk, grade: 2, lang: 'en-us' } }
        ];
        
        let brailleText: string | null = null;
        
        for (const endpoint of endpoints) {
          try {
            const formData = new URLSearchParams();
            Object.entries(endpoint.params).forEach(([key, value]) => {
              formData.append(key, value.toString());
            });
            
            const response = await fetch(endpoint.url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (compatible; BrailleConvert/1.0)'
              },
              body: formData
            });
            
            if (response.ok) {
              const result = await response.text();
              brailleText = this.extractBrailleFromResponse(result);
              
              if (brailleText && brailleText.trim().length > 0) {
                break; // Success with this endpoint
              }
            }
          } catch (endpointError) {
            console.log(`Endpoint ${endpoint.url} failed:`, endpointError);
          }
        }
        
        // If API endpoints don't work, try the main page form submission
        if (!brailleText) {
          brailleText = await this.tryMainPageSubmission(chunk);
        }
        
        if (!brailleText || brailleText.trim().length === 0) {
          throw new Error('Could not extract Braille from any endpoint');
        }
        
        brailleChunks.push(brailleText.trim());
        
        // Small delay between requests
        if (chunks.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      } catch (chunkError) {
        console.warn(`Failed to convert chunk: ${chunkError}`);
        // Continue with remaining chunks rather than failing completely
      }
    }
    
    if (brailleChunks.length === 0) {
      throw new Error('Failed to convert any text chunks');
    }
    
    const fullBrailleText = brailleChunks.join('\n\n');
    const lines = fullBrailleText.split('\n').filter(line => line.trim().length > 0);
    const pageCount = Math.ceil(lines.length / 25);
    
    return {
      brailleText: fullBrailleText,
      pageCount
    };
  }
  
  private async tryMainPageSubmission(text: string): Promise<string | null> {
    try {
      // Submit to the main page form
      const formData = new URLSearchParams();
      formData.append('text', text);
      formData.append('lang', 'en-us-g2'); // English US Grade 2
      
      const response = await fetch(this.BRAILLE_TRANSLATOR_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Referer': this.BRAILLE_TRANSLATOR_URL
        },
        body: formData
      });
      
      if (response.ok) {
        const html = await response.text();
        return this.extractBrailleFromResponse(html);
      }
    } catch (error) {
      console.warn('Main page submission failed:', error);
    }
    
    return null;
  }
  
  private extractBrailleFromResponse(html: string): string | null {
    // Log the response for debugging
    console.log('Braille response snippet:', html.substring(0, 500));
    
    // Try multiple patterns to extract the Braille result
    const patterns = [
      // Common result containers
      /<div[^>]*id=["']?braille-result["']?[^>]*>([\s\S]*?)<\/div>/gi,
      /<div[^>]*class="[^"]*braille[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      /<div[^>]*class="[^"]*result[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      // Textarea patterns
      /<textarea[^>]*name=["']?output["']?[^>]*>([\s\S]*?)<\/textarea>/gi,
      /<textarea[^>]*id=["']?output["']?[^>]*>([\s\S]*?)<\/textarea>/gi,
      /<textarea[^>]*>([\s\S]*?)<\/textarea>/gi,
      // Pre patterns  
      /<pre[^>]*>([\s\S]*?)<\/pre>/gi,
      // Span patterns
      /<span[^>]*class="[^"]*braille[^"]*"[^>]*>([\s\S]*?)<\/span>/gi
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        if (match[1]) {
          const brailleText = match[1]
            .replace(/&nbsp;/g, ' ')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/<[^>]*>/g, '') // Remove any HTML tags
            .trim();
          
          // Check if it contains actual Braille characters
          if (/[\u2800-\u28FF]/.test(brailleText)) {
            console.log('Found Braille text:', brailleText.substring(0, 100));
            return brailleText;
          }
        }
      }
    }
    
    // More aggressive search - look for any Unicode Braille patterns
    const brailleMatches = html.match(/[\u2800-\u28FF][\u2800-\u28FF\s\n\r\t]*/g);
    if (brailleMatches && brailleMatches.length > 0) {
      const result = brailleMatches.join('\n').trim();
      console.log('Found Braille via pattern matching:', result.substring(0, 100));
      return result;
    }
    
    // If the response contains "braille" text, it might be a status message
    if (html.toLowerCase().includes('braille')) {
      console.log('Response contains "braille" but no Braille characters found');
    }
    
    return null;
  }
  
  private splitIntoChunks(text: string, maxSize: number): string[] {
    if (text.length <= maxSize) {
      return [text];
    }
    
    const chunks: string[] = [];
    let currentPos = 0;
    
    while (currentPos < text.length) {
      let endPos = Math.min(currentPos + maxSize, text.length);
      
      // Try to break at natural boundaries
      if (endPos < text.length) {
        const boundaries = [
          text.lastIndexOf('\n\n', endPos), // Paragraph break
          text.lastIndexOf('. ', endPos),   // Sentence end
          text.lastIndexOf('\n', endPos),   // Line break
          text.lastIndexOf(' ', endPos)     // Word break
        ];
        
        for (const boundary of boundaries) {
          if (boundary > currentPos + maxSize * 0.5) {
            endPos = boundary + (boundary === text.lastIndexOf('. ', endPos) ? 2 : 1);
            break;
          }
        }
      }
      
      chunks.push(text.substring(currentPos, endPos).trim());
      currentPos = endPos;
    }
    
    return chunks.filter(chunk => chunk.length > 0);
  }
  
  private convertWithLocalMapping(
    text: string,
    options: { onProgress?: (progress: number) => void } = {}
  ): BrailleConversionResult {
    const { onProgress } = options;
    
    // Split text into lines for processing
    const lines = text.split('\n');
    const brailleLines: string[] = [];
    const charactersPerLine = 40; // Standard Braille line length
    
    let processedLines = 0;
    
    for (const line of lines) {
      const brailleLine = this.convertLineToBraille(line);
      
      // Handle line wrapping for Braille format
      if (brailleLine.length > charactersPerLine) {
        const wrappedLines = this.wrapBrailleLine(brailleLine, charactersPerLine);
        brailleLines.push(...wrappedLines);
      } else {
        brailleLines.push(brailleLine);
      }
      
      processedLines++;
      onProgress?.(processedLines / lines.length);
    }

    const brailleText = brailleLines.join('\n');
    
    // Calculate approximate page count (25 lines per Braille page)
    const pageCount = Math.ceil(brailleLines.length / 25);

    return {
      brailleText,
      pageCount
    };
  }

  private convertLineToBraille(line: string): string {
    let brailleText = '';
    
    for (const char of line.toLowerCase()) {
      if (this.brailleMap[char]) {
        brailleText += this.brailleMap[char];
      } else if (char.match(/[A-Z]/)) {
        // Handle uppercase letters with capital sign
        brailleText += '⠠' + this.brailleMap[char.toLowerCase()];
      } else {
        // For unmapped characters, use the original character
        brailleText += char;
      }
    }
    
    return brailleText;
  }

  private wrapBrailleLine(line: string, maxLength: number): string[] {
    const words = line.split(' ');
    const wrappedLines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if (currentLine.length + word.length + 1 <= maxLength) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) {
          wrappedLines.push(currentLine);
          currentLine = word;
        } else {
          // Word is too long, split it
          while (word.length > maxLength) {
            wrappedLines.push(word.substring(0, maxLength));
            word.substring(maxLength);
          }
          currentLine = word;
        }
      }
    }

    if (currentLine) {
      wrappedLines.push(currentLine);
    }

    return wrappedLines;
  }
}
