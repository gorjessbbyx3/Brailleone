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
      // Download content from URL
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to download content: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      const buffer = Buffer.from(await response.arrayBuffer());
      
      // Check if it's likely a PDF based on content-type or URL extension
      const isPdf = contentType.includes('application/pdf') || 
                   url.toLowerCase().endsWith('.pdf') ||
                   buffer.subarray(0, 4).toString() === '%PDF';
      
      if (isPdf) {
        // Extract text using pdf-parse for PDF content
        const result = await this.extractTextWithPdfParse(buffer);
        return {
          text: result.text,
          pageCount: result.pageCount,
          fileSize: buffer.length
        };
      } else {
        // For non-PDF content, extract as plain text
        const text = buffer.toString('utf8');
        return {
          text: text,
          pageCount: 1,
          fileSize: buffer.length
        };
      }
    } catch (error) {
      console.error("Error extracting text from URL:", error);
      throw new Error("Failed to extract text from URL");
    }
  }

  private async extractTextWithPdfParse(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
    try {
      // First try pdf-parse
      const pdfParse = await import('pdf-parse');
      const parseFunction = pdfParse.default || pdfParse;
      
      const options = {
        max: 0,
        normalizeWhitespace: true,
        disableCombineTextItems: false,
        version: undefined
      };
      
      const data = await parseFunction(buffer, options);
      const extractedText = data.text || "";
      const pageCount = data.numpages || 1;
      const meaningfulText = extractedText.trim().replace(/\s+/g, ' ');
      
      // If pdf-parse worked well, return the result
      if (meaningfulText.length > 100) {
        console.log(`pdf-parse extracted ${meaningfulText.length} characters from ${pageCount} pages`);
        return {
          text: extractedText,
          pageCount: pageCount
        };
      }
      
      console.warn(`pdf-parse yielded only ${meaningfulText.length} characters from ${pageCount} pages, trying pdf2json`);
      
      // Try pdf2json as alternative
      try {
        const pdf2json = await import('pdf2json');
        const PDFParser = pdf2json.default;
        
        return new Promise((resolve) => {
          const pdfParser = new PDFParser();
          let extractedContent = '';
          
          pdfParser.on("pdfParser_dataError", () => {
            // If pdf2json also fails, use the original pdf-parse result
            resolve({
              text: extractedText || "Multiple PDF extraction methods failed - document may be image-based or encrypted",
              pageCount: pageCount
            });
          });
          
          pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
            try {
              // Extract text from pdf2json data structure
              let text = '';
              if (pdfData.formImage && pdfData.formImage.Pages) {
                for (const page of pdfData.formImage.Pages) {
                  if (page.Texts) {
                    for (const textItem of page.Texts) {
                      if (textItem.R) {
                        for (const run of textItem.R) {
                          if (run.T) {
                            text += decodeURIComponent(run.T) + ' ';
                          }
                        }
                      }
                    }
                    text += '\n'; // Add newline after each page
                  }
                }
              }
              
              if (text.trim().length > meaningfulText.length) {
                console.log(`pdf2json extracted ${text.trim().length} characters (better than pdf-parse)`);
                resolve({
                  text: text.trim(),
                  pageCount: pdfData.formImage?.Pages?.length || pageCount
                });
              } else {
                resolve({
                  text: extractedText || "PDF text extraction yielded minimal content",
                  pageCount: pageCount
                });
              }
            } catch (parseError) {
              resolve({
                text: extractedText || "PDF parsing error occurred",
                pageCount: pageCount
              });
            }
          });
          
          // Parse the buffer
          pdfParser.parseBuffer(buffer);
          
          // Timeout fallback
          setTimeout(() => {
            resolve({
              text: extractedText || "PDF extraction timeout",
              pageCount: pageCount
            });
          }, 10000); // 10 second timeout
        });
      } catch (pdf2jsonError) {
        console.error("pdf2json not available:", pdf2jsonError);
        return {
          text: extractedText || "PDF extraction failed - multiple methods attempted",
          pageCount: pageCount
        };
      }
    } catch (error) {
      console.error("Error with PDF parsing:", error);
      
      // Final fallback: raw text extraction
      const rawText = buffer.toString('utf8');
      const cleanedText = rawText
        .replace(/[^\x20-\x7E\s\n\r\t]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (cleanedText.length > 100) {
        console.log(`Raw fallback extraction yielded ${cleanedText.length} characters`);
        return {
          text: cleanedText,
          pageCount: 1
        };
      }
      
      return {
        text: "PDF text extraction completely failed - document may be image-based, encrypted, or corrupted. Please try uploading a different PDF file.",
        pageCount: 1
      };
    }
  }
}