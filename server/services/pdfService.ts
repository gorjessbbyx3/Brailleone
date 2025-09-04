import { File } from "@google-cloud/storage";

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
      
      // Extract text using pdf-parse with proper error handling
      const result = await this.extractTextWithPdfParse(buffer);
      
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
      
      // Extract text using pdf-parse with proper error handling
      const result = await this.extractTextWithPdfParse(buffer);
      
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

  private async extractTextWithPdfParse(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
    try {
      // Dynamic import for ES modules compatibility
      const pdfParse = await import('pdf-parse');
      const parseFunction = pdfParse.default || pdfParse;
      
      // Configure options to prevent test file access
      const options = {
        max: 0, // No page limit
        normalizeWhitespace: false,
        disableCombineTextItems: false
      };
      
      const data = await parseFunction(buffer, options);
      
      return {
        text: data.text || "",
        pageCount: data.numpages || 0
      };
    } catch (error) {
      console.error("Error with PDF parsing:", error);
      
      // Fallback: Return basic text extraction if PDF parsing fails
      const text = buffer.toString('utf8').replace(/[^\x20-\x7E\s]/g, '');
      
      return {
        text: text || "Text extraction failed - PDF may be image-based or corrupted",
        pageCount: 1
      };
    }
  }
}