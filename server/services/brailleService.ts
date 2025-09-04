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
    // Split large text into chunks to avoid issues
    const maxChunkSize = 3000; // Conservative chunk size
    const chunks = this.splitIntoChunks(text, maxChunkSize);
    const brailleChunks: string[] = [];
    
    for (const chunk of chunks) {
      // Prepare the request to brailletranslator.org
      const formData = new URLSearchParams();
      formData.append('text', chunk.trim());
      formData.append('grade', '2'); // Use Grade 2 Braille for contractions
      formData.append('lang', 'en-us'); // English US
      
      const response = await fetch(this.BRAILLE_TRANSLATOR_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (compatible; BrailleConvert/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5'
        },
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Translator API error: ${response.status} ${response.statusText}`);
      }
      
      const html = await response.text();
      const brailleText = this.extractBrailleFromResponse(html);
      
      if (!brailleText || brailleText.trim().length === 0) {
        throw new Error('Could not extract Braille from response');
      }
      
      brailleChunks.push(brailleText.trim());
      
      // Small delay between requests to be respectful
      if (chunks.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    const fullBrailleText = brailleChunks.join('\n\n');
    const lines = fullBrailleText.split('\n').filter(line => line.trim().length > 0);
    const pageCount = Math.ceil(lines.length / 25);
    
    return {
      brailleText: fullBrailleText,
      pageCount
    };
  }
  
  private extractBrailleFromResponse(html: string): string | null {
    // Try multiple patterns to extract the Braille result
    const patterns = [
      // Look for textarea with the result
      /<textarea[^>]*name=["']?output["']?[^>]*>([^<]+)<\/textarea>/gi,
      /<textarea[^>]*id=["']?output["']?[^>]*>([^<]+)<\/textarea>/gi,
      // Look for div with result class
      /<div[^>]*class="[^"]*result[^"]*"[^>]*>([^<]+)<\/div>/gi,
      /<div[^>]*id="[^"]*result[^"]*"[^>]*>([^<]+)<\/div>/gi,
      // Look for pre tag with Braille
      /<pre[^>]*>([^<]+)<\/pre>/gi
    ];
    
    for (const pattern of patterns) {
      const match = pattern.exec(html);
      if (match && match[1]) {
        const brailleText = match[1]
          .replace(/&nbsp;/g, ' ')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .trim();
        
        // Check if it contains actual Braille characters
        if (/[\u2800-\u28FF]/.test(brailleText)) {
          return brailleText;
        }
      }
    }
    
    // Fallback: look for any Unicode Braille patterns in the entire response
    const brailleMatches = html.match(/[\u2800-\u28FF][\u2800-\u28FF\s\n]*/g);
    if (brailleMatches && brailleMatches.length > 0) {
      return brailleMatches.join('\n').trim();
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
