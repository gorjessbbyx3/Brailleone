import { File } from "@google-cloud/storage";

// Use dynamic import to avoid module path issues
const loadPdfJs = async () => {
  try {
    const pdfjs = await import("pdfjs-dist");
    return pdfjs;
  } catch (error) {
    console.error("Failed to load pdfjs-dist:", error);
    throw error;
  }
};

export interface TextExtractionResult {
  text: string;
  pageCount: number;
  fileSize: number;
}

export class PDFService {
  async extractTextFromFile(objectFile: File): Promise<TextExtractionResult> {
    try {
      // Download file to buffer
      const [buffer] = await objectFile.download();
      
      // Extract text using PDF.js
      const result = await this.extractTextWithPdfJs(buffer);
      
      return {
        text: result.text,
        pageCount: result.pageCount,
        fileSize: buffer.length
      };
    } catch (error) {
      console.error("Error extracting text from PDF file:", error);
      throw new Error("Failed to extract text from PDF file");
    }
  }

  async extractTextFromUrl(url: string): Promise<TextExtractionResult> {
    try {
      // Download PDF from URL
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to download PDF: ${response.statusText}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      
      // Extract text using PDF.js
      const result = await this.extractTextWithPdfJs(buffer);
      
      return {
        text: result.text,
        pageCount: result.pageCount,
        fileSize: buffer.length
      };
    } catch (error) {
      console.error("Error extracting text from PDF URL:", error);
      throw new Error("Failed to extract text from PDF URL");
    }
  }

  private async extractTextWithPdfJs(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
    try {
      const pdfjs = await loadPdfJs();
      const pdf = await pdfjs.getDocument({ data: buffer }).promise;
      const pageCount = pdf.numPages;
      let text = '';

      // Extract text from all pages
      for (let i = 1; i <= pageCount; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Combine all text items from the page
        const pageText = textContent.items
          .filter((item: any) => item.str)
          .map((item: any) => item.str)
          .join(' ');
        
        text += pageText + '\n';
      }

      return {
        text: text.trim(),
        pageCount
      };
    } catch (error) {
      console.error("Error with PDF.js extraction:", error);
      throw new Error("Failed to extract text with PDF.js");
    }
  }
}
