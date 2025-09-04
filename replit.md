# BrailleConvert - AI-Powered PDF to Braille Converter

## Overview

BrailleConvert is a full-stack web application that converts PDF documents and URLs into Grade 1 Braille format using AI-enhanced text processing. The system provides an intelligent pipeline that extracts text from PDFs, cleans and optimizes it using Groq AI, and converts it to accessible Braille output. Built with modern web technologies, it offers real-time progress tracking, file management, and comprehensive conversion analytics.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript running on Vite for development and build tooling
- **Routing**: Wouter for lightweight client-side routing
- **UI Components**: shadcn/ui component library built on Radix UI primitives with Tailwind CSS
- **State Management**: TanStack React Query for server state management and API caching
- **File Upload**: Uppy with AWS S3 integration for direct-to-cloud file uploads
- **Real-time Updates**: Polling-based system for conversion progress tracking

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with structured error handling and request logging middleware
- **File Processing**: Streaming approach for large PDF processing with progress callbacks
- **Storage Strategy**: Hybrid approach using in-memory storage for development with PostgreSQL schema ready for production

### Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Schema Design**: Comprehensive conversion tracking with status, progress, and metadata fields
- **Object Storage**: Google Cloud Storage integration via Replit sidecar for file persistence
- **Session Management**: PostgreSQL-backed sessions using connect-pg-simple

### AI Integration Pipeline
- **Text Extraction**: PDF-parse library for reliable text extraction from uploaded documents
- **AI Enhancement**: Groq API integration for intelligent text cleanup and OCR error correction
- **Quality Validation**: AI-powered accuracy scoring and conversion quality reports
- **Braille Conversion**: Custom Grade 1 Braille mapping with proper formatting and page breaks

### Processing Workflow
- **Multi-stage Pipeline**: Text extraction → AI cleanup → Braille conversion → Quality validation
- **Progress Tracking**: Real-time status updates through polling with detailed stage information
- **Error Handling**: Comprehensive error recovery with detailed error reporting
- **Performance Optimization**: Chunked processing for large documents with memory management

## External Dependencies

### Core Services
- **Groq AI API**: Advanced language model for text cleanup and quality validation
- **Google Cloud Storage**: Object storage for uploaded files and conversion outputs
- **Neon Database**: PostgreSQL hosting for production database operations
- **Replit Sidecar**: Authentication bridge for Google Cloud Storage access

### Key Libraries
- **PDF Processing**: pdf-parse for reliable text extraction from PDF documents
- **Database**: Drizzle ORM with PostgreSQL driver for type-safe database operations
- **File Upload**: Uppy with AWS S3 multipart upload support for large file handling
- **UI Framework**: shadcn/ui component system with Radix UI and Tailwind CSS
- **Validation**: Zod for runtime type validation and schema definition
- **Query Management**: TanStack React Query for efficient data fetching and caching

### Development Tools
- **Build System**: Vite for fast development and optimized production builds
- **Type Safety**: TypeScript with strict configuration across frontend and backend
- **CSS Framework**: Tailwind CSS with custom design tokens and responsive design
- **Code Organization**: Monorepo structure with shared schemas and types