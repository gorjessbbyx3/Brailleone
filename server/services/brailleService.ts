export interface BrailleConversionResult {
  brailleText: string;
  pageCount: number;
}

export class BrailleService {
  // Grade 1 Braille character mapping
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
