import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { GroqService } from "./services/groqService";
import { PDFService } from "./services/pdfService";
import { BrailleService } from "./services/brailleService";
import { ChapterService } from "./services/chapterService";
import { insertConversionSchema } from "@shared/schema";
import multer from "multer";
import { z } from "zod";

const upload = multer({ dest: 'uploads/' });
const objectStorageService = new ObjectStorageService();
const groqService = new GroqService();
const pdfService = new PDFService();
const brailleService = new BrailleService();
const chapterService = new ChapterService();

// Global function for broadcasting live updates
declare global {
  var broadcastLiveUpdate: (conversionId: string, update: any) => void;
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Serve public objects
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Serve private objects
  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Get upload URL for object storage
  app.post("/api/objects/upload", async (req, res) => {
    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  // Create conversion job from uploaded file
  app.post("/api/conversions/upload", async (req, res) => {
    try {
      const { fileName, fileSize, uploadUrl } = req.body;
      
      if (!fileName || !fileSize || !uploadUrl) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Normalize the object path
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadUrl);

      // Create conversion record
      const conversion = await storage.createConversion({
        fileName,
        fileSize,
        sourceType: "pdf",
        status: "pending",
        progress: 0,
        currentStage: "initializing",
        originalTextPath: objectPath,
      });

      res.json({ conversionId: conversion.id });
      
      // Start processing asynchronously
      processConversion(conversion.id).catch(console.error);

    } catch (error) {
      console.error("Error creating conversion:", error);
      res.status(500).json({ error: "Failed to create conversion" });
    }
  });

  // Create conversion job from URL
  app.post("/api/conversions/url", async (req, res) => {
    try {
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }

      // Basic URL validation
      try {
        new URL(url);
      } catch {
        return res.status(400).json({ error: "Invalid URL format" });
      }

      // Create conversion record
      const conversion = await storage.createConversion({
        fileName: url.split('/').pop() || 'document.pdf',
        fileSize: 0, // Will be determined during processing
        sourceType: "url",
        sourceUrl: url,
        status: "pending",
        progress: 0,
        currentStage: "initializing",
      });

      res.json({ conversionId: conversion.id });
      
      // Start processing asynchronously
      processConversion(conversion.id).catch(console.error);

    } catch (error) {
      console.error("Error creating URL conversion:", error);
      res.status(500).json({ error: "Failed to create conversion" });
    }
  });

  // Get conversion status
  app.get("/api/conversions/:id", async (req, res) => {
    try {
      const conversion = await storage.getConversion(req.params.id);
      if (!conversion) {
        return res.status(404).json({ error: "Conversion not found" });
      }
      res.json(conversion);
    } catch (error) {
      console.error("Error getting conversion:", error);
      res.status(500).json({ error: "Failed to get conversion" });
    }
  });

  // List recent conversions
  app.get("/api/conversions", async (req, res) => {
    try {
      const conversions = await storage.getRecentConversions();
      res.json(conversions);
    } catch (error) {
      console.error("Error getting conversions:", error);
      res.status(500).json({ error: "Failed to get conversions" });
    }
  });

  // Clear failed conversions
  app.delete("/api/conversions/failed", async (req, res) => {
    try {
      // For database storage, clear failed conversions
      if (process.env.DATABASE_URL) {
        const { DatabaseStorage } = await import("./dbStorage");
        const dbStorage = new DatabaseStorage();
        // Clear failed and error status conversions
        const result = await (dbStorage as any).db.execute(
          `DELETE FROM conversions WHERE status IN ('failed', 'error')`
        );
        // Failed conversions cleared
      }
      
      res.json({ message: "Failed conversions cleared successfully" });
    } catch (error) {
      console.error("Error clearing failed conversions:", error);
      res.status(500).json({ error: "Failed to clear conversions" });
    }
  });

  // Clear all conversions
  app.delete("/api/conversions/all", async (req, res) => {
    try {
      await storage.clearAllConversions();
      res.json({ message: "All conversions cleared successfully" });
    } catch (error) {
      console.error("Error clearing all conversions:", error);
      res.status(500).json({ error: "Failed to clear all conversions" });
    }
  });

  // Get original text for comparison
  app.get("/api/conversions/:id/text/:type", async (req, res) => {
    try {
      const { id, type } = req.params;
      const conversion = await storage.getConversion(id);
      
      if (!conversion) {
        return res.status(404).json({ error: "Conversion not found" });
      }

      let filePath: string | null = null;
      
      switch (type) {
        case "original":
          filePath = conversion.originalTextPath;
          break;
        case "cleaned":
          filePath = conversion.cleanedTextPath;
          break;
        case "braille":
          filePath = conversion.brailleFilePath;
          break;
        default:
          return res.status(400).json({ error: "Invalid text type" });
      }

      if (!filePath) {
        return res.status(404).json({ error: "Text not available" });
      }

      // Get text content from storage
      const objectFile = await objectStorageService.getObjectEntityFile(filePath);
      const [buffer] = await objectFile.download();
      const textContent = buffer.toString('utf-8');
      
      res.json({ content: textContent });
      
    } catch (error) {
      console.error("Error retrieving text:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "Text not found" });
      }
      res.status(500).json({ error: "Failed to retrieve text" });
    }
  });

  // Get file content for preview (streaming)
  app.get('/api/conversions/:id/files/:type', async (req, res) => {
    try {
      const { id, type } = req.params;
      const conversion = await storage.getConversion(id);
      
      if (!conversion) {
        return res.status(404).json({ error: 'Conversion not found' });
      }

      let filePath: string | null = null;
      
      switch (type) {
        case 'braille':
          filePath = conversion.brailleFilePath;
          break;
        case 'cleaned':
          filePath = conversion.cleanedTextPath;
          break;
        case 'original':
          filePath = conversion.originalTextPath;
          break;
        default:
          return res.status(400).json({ error: 'Invalid file type' });
      }

      if (!filePath) {
        return res.status(404).json({ error: 'File not available' });
      }

      // Get file from object storage
      const objectFile = await objectStorageService.getObjectEntityFile(filePath);
      const [buffer] = await objectFile.download();
      const textContent = buffer.toString('utf-8');
      
      res.set({
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'private, max-age=3600'
      });

      res.send(textContent);

    } catch (error) {
      console.error('Error fetching file content:', error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: 'File not found' });
      }
      return res.status(500).json({ error: 'Failed to fetch file content' });
    }
  });

  // Download converted file
  app.get("/api/conversions/:id/download/:type", async (req, res) => {
    try {
      const { id, type } = req.params;
      const conversion = await storage.getConversion(id);
      
      if (!conversion) {
        return res.status(404).json({ error: "Conversion not found" });
      }

      let filePath: string | null = null;
      let filename: string = "";
      
      switch (type) {
        case "braille":
          filePath = conversion.brailleFilePath;
          filename = `${conversion.fileName.replace('.pdf', '')}.brl`;
          break;
        case "text":
          filePath = conversion.cleanedTextPath;
          filename = `${conversion.fileName.replace('.pdf', '')}_cleaned.txt`;
          break;
        case "report":
          filePath = conversion.aiReportPath;
          filename = `${conversion.fileName.replace('.pdf', '')}_ai_report.txt`;
          break;
        default:
          return res.status(400).json({ error: "Invalid download type" });
      }

      if (!filePath) {
        return res.status(404).json({ error: "File not available" });
      }

      // Get object from storage and stream to response
      const objectFile = await objectStorageService.getObjectEntityFile(filePath);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      objectStorageService.downloadObject(objectFile, res);
      
    } catch (error) {
      console.error("Error downloading file:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "File not found" });
      }
      res.status(500).json({ error: "Failed to download file" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for live processing updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected for live processing');
    
    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);
        if (data.type === 'subscribe' && data.conversionId) {
          // Subscribe to conversion updates
          (ws as any).conversionId = data.conversionId;
          console.log(`Client subscribed to conversion: ${data.conversionId}`);
        }
      } catch (error) {
        console.error('Invalid WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });

  // Global function to broadcast live updates to WebSocket clients
  global.broadcastLiveUpdate = (conversionId: string, update: any) => {
    wss.clients.forEach((client: WebSocket) => {
      if (client.readyState === WebSocket.OPEN && (client as any).conversionId === conversionId) {
        client.send(JSON.stringify({
          type: 'liveUpdate',
          conversionId,
          ...update
        }));
      }
    });
  };

  return httpServer;
}

// Main conversion processing pipeline
async function processConversion(conversionId: string) {
  try {
    let conversion = await storage.getConversion(conversionId);
    if (!conversion) return;

    // Stage 1: Text Extraction
    await storage.updateConversion(conversionId, {
      status: "extracting",
      currentStage: "Text Extraction",
      progress: 10
    });

    let extractedText: string;
    let totalPages: number;

    if (conversion.sourceType === "pdf") {
      if (!conversion.originalTextPath) {
        throw new Error("No file path for PDF conversion");
      }
      
      const objectFile = await objectStorageService.getObjectEntityFile(conversion.originalTextPath);
      const result = await pdfService.extractTextFromFile(objectFile);
      extractedText = result.text;
      totalPages = result.pageCount;
      
      await storage.updateConversion(conversionId, {
        totalPages,
        progress: 25
      });
    } else {
      if (!conversion.sourceUrl) {
        throw new Error("No URL for URL conversion");
      }
      
      const result = await pdfService.extractTextFromUrl(conversion.sourceUrl);
      extractedText = result.text;
      totalPages = result.pageCount;
      
      await storage.updateConversion(conversionId, {
        totalPages,
        fileSize: result.fileSize,
        progress: 25
      });
    }

    // Stage 2: AI Review and Cleanup
    await storage.updateConversion(conversionId, {
      status: "ai_reviewing",
      currentStage: "AI Text Review & Cleanup",
      progress: 30
    });

    const aiResult = await groqService.cleanAndValidateText(extractedText, {
      conversionId,
      onProgress: (progress: number) => {
        storage.updateConversion(conversionId, {
          progress: Math.round(30 + (progress * 0.4)) // 30-70%
        }).catch(console.error);
      }
    });

    // Save cleaned text
    const cleanedTextPath = await saveTextToStorage(aiResult.cleanedText, `${conversionId}_cleaned.txt`);

    await storage.updateConversion(conversionId, {
      cleanedTextPath,
      wordCount: aiResult.wordCount,
      aiEnhancements: aiResult.enhancements,
      progress: 70
    });

    // Stage 3: Braille Conversion
    await storage.updateConversion(conversionId, {
      status: "converting",
      currentStage: "Braille Conversion",
      progress: 75
    });

    const brailleResult = await brailleService.convertToBraille(aiResult.cleanedText, {
      onProgress: (progress: number) => {
        storage.updateConversion(conversionId, {
          progress: Math.round(75 + (progress * 0.15)) // 75-90%
        }).catch(console.error);
      }
    });

    // Save Braille file
    const brailleFilePath = await saveTextToStorage(brailleResult.brailleText, `${conversionId}.brl`);

    await storage.updateConversion(conversionId, {
      brailleFilePath,
      braillePages: brailleResult.pageCount,
      progress: 90
    });

    // Stage 4: AI Quality Validation
    await storage.updateConversion(conversionId, {
      currentStage: "AI Quality Validation",
      progress: 95
    });

    const qualityResult = await groqService.validateBrailleQuality(aiResult.cleanedText, brailleResult.brailleText);
    
    // Save AI report
    const aiReportPath = await saveTextToStorage(qualityResult.report, `${conversionId}_report.txt`);

    // Stage 5: Chapter Analysis (Optional Enhancement)
    try {
      await storage.updateConversion(conversionId, {
        currentStage: "Chapter Analysis & Navigation",
        progress: 98
      });

      const documentAnalysis = await chapterService.analyzeDocumentStructure(aiResult.cleanedText, {
        conversionId,
        onProgress: (progress: number) => {
          // Don't update main progress, keep it at 98%
        }
      });

      // Update chapters with Braille line positions
      const chaptersWithBraillePositions = chapterService.updateChapterBraillePositions(
        documentAnalysis.chapters, 
        brailleResult.brailleText
      );

      // Update with chapter information
      await storage.updateConversion(conversionId, {
        chapters: chaptersWithBraillePositions,
        documentSummary: documentAnalysis.documentSummary,
        keyTopics: documentAnalysis.keyTopics,
      });

    } catch (chapterError) {
      console.error("Chapter analysis failed (non-critical):", chapterError);
      // Continue without chapter analysis - don't fail the whole conversion
    }

    // Final completion
    await storage.updateConversion(conversionId, {
      status: "completed",
      currentStage: "Complete",
      progress: 100,
      accuracyScore: qualityResult.accuracyScore,
      lineValidations: qualityResult.lineValidations,
      aiReportPath,
      completedAt: new Date()
    });

  } catch (error) {
    console.error("Error processing conversion:", error);
    await storage.updateConversion(conversionId, {
      status: "failed",
      currentStage: "Error",
      progress: 0
    }).catch(console.error);
  }
}

async function saveTextToStorage(content: string, fileName: string): Promise<string> {
  // Get upload URL for the text file
  const uploadUrl = await objectStorageService.getObjectEntityUploadURL();
  
  // Upload the content
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'text/plain',
    },
    body: content,
  });

  if (!response.ok) {
    throw new Error(`Failed to upload text file: ${response.statusText}`);
  }

  // Return normalized path
  return objectStorageService.normalizeObjectEntityPath(uploadUrl);
}
