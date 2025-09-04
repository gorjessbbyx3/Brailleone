import { File } from "@google-cloud/storage";
import { createWorker } from 'tesseract.js';

export interface TextExtractionResult {
  text: string;
  pageCount: number;
  fileSize: number;
}

export class PDFService {
  async extractTextFromFile(objectFile: File): Promise<TextExtractionResult> {
    let buffer: Buffer | undefined;
    try {
      // Download file to buffer
      [buffer] = await objectFile.download();
      
      // Extract text using pdf-parse with proper error handling
      const result = await this.extractTextWithPdfParse(buffer);
      
      return {
        text: result.text,
        pageCount: result.pageCount,
        fileSize: buffer.length
      };
    } catch (error) {
      console.error("Error extracting text from PDF file:", error);
      console.error("File size:", buffer?.length || 'unknown');
      throw new Error(`Failed to extract text from PDF file: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      let parseFunction: any;
      try {
        const pdfParse = await import('pdf-parse');
        parseFunction = pdfParse.default || pdfParse;
      } catch (importError) {
        console.error('Failed to import pdf-parse:', importError);
        // Try OCR extraction instead
        console.log('Falling back to OCR text extraction...');
        return await this.extractTextWithOCR(buffer);
      }
      
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
        // Production: Text extracted successfully
        return {
          text: extractedText,
          pageCount: pageCount
        };
      }
      
      // Fallback: Using alternative extraction method
      
      // Try pdf2json as alternative
      try {
        let pdf2json;
        try {
          pdf2json = await import('pdf2json');
        } catch (importError) {
          console.error('Failed to import pdf2json:', importError);
          // Return original result if fallback import fails
          return {
            text: extractedText || "PDF extraction failed - fallback library not available",
            pageCount: pageCount
          };
        }
        
        const PDFParser = pdf2json.default;
        
        return new Promise((resolve) => {
          const pdfParser = new PDFParser();
          let extractedText = "";
          
          pdfParser.on("pdfParser_dataError", (errData: any) => {
            console.error('PDF2JSON error:', errData);
            resolve({
              text: "PDF parsing failed with pdf2json",
              pageCount: 1
            });
          });
          
          pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
            try {
              if (pdfData && pdfData.formImage && pdfData.formImage.Pages) {
                const pages = pdfData.formImage.Pages;
                let allText = '';
                
                for (const page of pages) {
                  if (page.Texts) {
                    for (const textObj of page.Texts) {
                      if (textObj.R) {
                        for (const run of textObj.R) {
                          if (run.T) {
                            allText += decodeURIComponent(run.T) + ' ';
                          }
                        }
                      }
                    }
                  }
                  allText += '\n';
                }
                
                resolve({
                  text: allText || "No readable text found in PDF",
                  pageCount: pages.length || 1
                });
              } else {
                resolve({
                  text: "PDF structure not readable",
                  pageCount: 1
                });
              }
            } catch (parseError) {
              console.error('Error processing PDF data:', parseError);
              resolve({
                text: "Error processing PDF structure",
                pageCount: 1
              });
            }
          });
          
          // Start parsing
          pdfParser.parseBuffer(buffer);
        });
      } catch (pdf2jsonError) {
        console.error('PDF2JSON processing error:', pdf2jsonError);
        
        // Final fallback: OCR if everything else fails
        if (meaningfulText.length < 50) {
          console.log('Trying OCR as final fallback...');
          try {
            return await this.extractTextWithOCR(buffer);
          } catch (ocrError) {
            console.error('OCR fallback also failed:', ocrError);
          }
        }
        
        return {
          text: extractedText || "No readable text found in PDF",
          pageCount: pageCount
        };
      }
    } catch (error) {
      console.error('PDF parsing error:', error);
      // Final fallback to OCR
      try {
        console.log('Attempting OCR extraction as last resort...');
        return await this.extractTextWithOCR(buffer);
      } catch (ocrError) {
        console.error('OCR extraction also failed:', ocrError);
        throw new Error('All text extraction methods failed');
      }
    }
  }

  private async extractTextWithOCR(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
    const maxPages = 20; // Limit to prevent memory issues
    
    try {
      console.log('Starting OCR text extraction...');
      
      // Convert PDF to images using pdf2pic
      let pdf2pic;
      try {
        pdf2pic = await import('pdf2pic');
      } catch (importError) {
        console.error('Failed to import pdf2pic:', importError);
        throw new Error('PDF to image conversion not available');
      }
      
      // Initialize pdf2pic converter
      const convert = pdf2pic.fromBuffer(buffer, {
        density: 100,
        saveFilename: "page",
        savePath: "/tmp",
        format: "png",
        width: 600,
        height: 800
      });
      
      // Get info about the PDF to know how many pages
      let totalPages = 1;
      try {
        const parseFunction = (await import('pdf-parse')).default;
        const info = await parseFunction(buffer, { max: 0 });
        totalPages = Math.min(info.numpages || 1, maxPages);
      } catch (infoError) {
        console.warn('Could not get page count, assuming 1 page');
      }
      
      console.log(`Processing ${totalPages} pages with OCR...`);
      
      let allText = '';
      const worker = await createWorker(['eng']);
      
      try {
        // Process each page
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          try {
            // Convert page to image
            const result = await convert(pageNum, { responseType: 'buffer' });
            
            if (result && result.buffer) {
              // OCR the image
              const { data: { text } } = await worker.recognize(result.buffer);
              allText += text + '\n\n';
              console.log(`OCR completed for page ${pageNum}/${totalPages}`);
            }
          } catch (pageError) {
            console.warn(`Failed to process page ${pageNum}:`, pageError);
            // Continue with other pages
          }
        }
      } finally {
        await worker.terminate();
      }
      
      const finalText = allText.trim();
      
      if (finalText.length < 10) {
        throw new Error('OCR extracted very little text');
      }
      
      console.log(`OCR extraction complete. Extracted ${finalText.length} characters.`);
      
      return {
        text: finalText,
        pageCount: totalPages
      };
      
    } catch (error) {
      console.error('OCR extraction failed:', error);
      throw new Error(`OCR text extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}