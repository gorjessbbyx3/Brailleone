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
      
      // Extract text using our parsing method
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
      // Check if this is actually a PDF first
      const headerCheck = buffer.subarray(0, 4).toString();
      if (!headerCheck.includes('%PDF')) {
        // This might be plain text, try to extract directly
        const textContent = buffer.toString('utf8');
        if (textContent && textContent.length > 10) {
          console.log('Detected non-PDF content, extracting as plain text');
          return {
            text: textContent,
            pageCount: 1
          };
        }
      }

      // For now, skip pdf-parse library due to import issues and go directly to OCR
      console.log('Using OCR extraction for PDF content...');
      return await this.extractTextWithOCR(buffer);
      
    } catch (error) {
      console.error('All extraction methods failed:', error);
      
      // Final fallback: try basic text extraction
      try {
        const basicText = buffer.toString('utf8');
        if (basicText && basicText.length > 20) {
          console.log('Using basic text extraction as final fallback');
          return {
            text: basicText.substring(0, 10000), // Limit length
            pageCount: 1
          };
        }
      } catch (basicError) {
        console.error('Basic text extraction failed:', basicError);
      }
      
      throw new Error('All text extraction methods failed');
    }
  }

  private async extractTextWithOCR(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
    const maxPages = 2; // Reduced to prevent issues
    
    try {
      console.log('Starting OCR text extraction...');
      
      // Validate buffer first
      if (!buffer || buffer.length === 0) {
        throw new Error('Invalid buffer for OCR processing');
      }
      
      console.log(`Buffer size: ${buffer.length} bytes`);
      
      // Check if this is actually a PDF
      const headerCheck = buffer.subarray(0, 4).toString();
      if (!headerCheck.includes('%PDF')) {
        console.log('Not a PDF file, attempting direct text extraction');
        const textContent = buffer.toString('utf8');
        if (textContent && textContent.length > 10) {
          // Limit text size to prevent memory issues
          const maxSize = 100000; // 100KB limit
          const limitedText = textContent.length > maxSize 
            ? textContent.substring(0, maxSize) + '\n[Text truncated]'
            : textContent;
          return {
            text: limitedText,
            pageCount: 1
          };
        }
      }

      // Force garbage collection to free memory
      if (global.gc) {
        global.gc();
      }
      
      // Import pdf2pic
      let pdf2pic;
      try {
        pdf2pic = await import('pdf2pic');
      } catch (importError) {
        console.error('Failed to import pdf2pic:', importError);
        throw new Error('PDF to image conversion not available');
      }

      // Initialize pdf2pic converter with memory-safe settings
      const convert = pdf2pic.fromBuffer(buffer, {
        density: 100, // Reduced density to save memory
        saveFilename: "ocr_page_temp",
        savePath: "/tmp", 
        format: "jpeg", // JPEG uses less memory than PNG
        width: 400,     // Smaller width
        height: 500,    // Smaller height
        quality: 85     // Compress to reduce file size
      });
      
      // Assume 1 page for now since we can't use pdf-parse to get count
      let totalPages = Math.min(1, maxPages);
      console.log(`Processing ${totalPages} pages with OCR...`);
      
      let allText = '';
      const worker = await createWorker(['eng']);
      
      try {
        // Process each page with better error handling
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          try {
            console.log(`Converting page ${pageNum} to image...`);
            
            // Convert page to image with timeout
            const conversionPromise = convert(pageNum, { responseType: 'buffer' });
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Page conversion timeout')), 30000)
            );
            
            const result = await Promise.race([conversionPromise, timeoutPromise]) as any;
            
            if (result && result.buffer && result.buffer.length > 0) {
              console.log(`Image size for page ${pageNum}: ${result.buffer.length} bytes`);
              
              // Limit buffer size to prevent memory issues
              if (result.buffer.length > 2000000) { // 2MB limit
                console.warn(`Image buffer too large (${result.buffer.length} bytes), skipping OCR`);
                continue;
              }
              
              // OCR the image with timeout
              const ocrPromise = worker.recognize(result.buffer);
              const ocrTimeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('OCR timeout')), 20000) // Reduced timeout
              );
              
              const { data: { text } } = await Promise.race([ocrPromise, ocrTimeoutPromise]) as any;
              
              // Clear the image buffer immediately after OCR
              result.buffer = null;
              
              if (text && text.trim().length > 0) {
                allText += text.trim() + '\n\n';
                console.log(`OCR completed for page ${pageNum}/${totalPages} - extracted ${text.trim().length} characters`);
                
                // Force garbage collection after each page
                if (global.gc) {
                  global.gc();
                }
              } else {
                console.warn(`No text extracted from page ${pageNum}`);
              }
            } else {
              console.warn(`No image buffer received for page ${pageNum}`);
            }
          } catch (pageError) {
            console.warn(`Failed to process page ${pageNum}:`, pageError);
            // Continue with other pages - don't let one page failure stop everything
          }
        }
      } finally {
        try {
          await worker.terminate();
        } catch (terminateError) {
          console.warn('Error terminating OCR worker:', terminateError);
        }
      }
      
      const finalText = allText.trim();
      
      if (finalText.length < 5) {
        console.log('OCR extracted very little text, trying direct buffer extraction');
        // Try direct text extraction as final fallback
        const directText = buffer.toString('utf8');
        if (directText && directText.length > 10) {
          const maxSize = 10000; // 10KB limit for fallback
          return {
            text: directText.substring(0, maxSize),
            pageCount: 1
          };
        }
        throw new Error('OCR extracted very little text');
      }
      
      // Limit final text size
      const maxFinalSize = 200000; // 200KB limit
      if (finalText.length > maxFinalSize) {
        console.warn(`OCR result too large (${finalText.length} chars), truncating to ${maxFinalSize}`);
        return {
          text: finalText.substring(0, maxFinalSize) + '\n[Text truncated]',
          pageCount: totalPages
        };
      }
      
      console.log(`OCR extraction complete. Extracted ${finalText.length} characters.`);
      
      return {
        text: finalText,
        pageCount: totalPages
      };
      
    } catch (error) {
      console.error('OCR extraction failed:', error);
      
      // Final direct text extraction attempt
      try {
        console.log('Attempting direct text extraction as final fallback');
        const directText = buffer.toString('utf8');
        if (directText && directText.length > 10) {
          return {
            text: directText.substring(0, 5000),
            pageCount: 1
          };
        }
      } catch (directError) {
        console.error('Direct text extraction failed:', directError);
      }
      
      throw new Error(`OCR text extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}