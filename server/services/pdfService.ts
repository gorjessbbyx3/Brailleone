import { File } from "@google-cloud/storage";
import fetch from "node-fetch";

// Dynamic import for pdf-parse to avoid initialization issues
const getPdfParse = async () => {
  const pdfParse = await import("pdf-parse");
  return pdfParse.default || pdfParse;
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
      
      // Extract text using pdf-parse
      const pdf = await getPdfParse();
      const data = await pdf(buffer);
      
      return {
        text: data.text,
        pageCount: data.numpages,
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
      
      // Extract text using pdf-parse
      const pdf = await getPdfParse();
      const data = await pdf(buffer);
      
      return {
        text: data.text,
        pageCount: data.numpages,
        fileSize: buffer.length
      };
    } catch (error) {
      console.error("Error extracting text from PDF URL:", error);
      throw new Error("Failed to extract text from PDF URL");
    }
  }
}
