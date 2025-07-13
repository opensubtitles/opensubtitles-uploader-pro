# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React-based subtitle uploader application that integrates with the OpenSubtitles API. The application allows users to drag and drop video and subtitle files, automatically pairs them, detects subtitle languages, calculates movie hashes, and provides metadata enrichment through various services.

## Development Commands

- `npm run dev` - Start development server with Vite
- `npm run build` - Build production version
- `npm run preview` - Preview production build locally

## Architecture

### Core Components

The application is structured around a main `SubtitleUploader` component that orchestrates multiple custom hooks and services:

**Main Component**: `src/components/SubtitleUploader.jsx`
- Central orchestrator that manages file processing, language detection, and movie metadata
- Uses multiple custom hooks for different concerns
- Handles file upload states and user interactions

**Custom Hooks** (in `src/hooks/`):
- `useFileHandling` - Manages file drop, processing, and pairing logic
- `useLanguageData` - Handles language data fetching and management
- `useLanguageDetection` - Processes subtitle language detection via OpenSubtitles API
- `useMovieGuess` - Integrates with GuessIt service for movie metadata
- `useGuessIt` - Provides detailed file metadata extraction
- `useDebugMode` - Debug panel and logging functionality

**Services** (in `src/services/`):
- `api/openSubtitlesApi.js` - OpenSubtitles REST API integration
- `api/xmlrpc.js` - XML-RPC client for legacy OpenSubtitles API
- `fileProcessing.js` - File system handling and drag-drop processing
- `movieHash.js` - Movie hash calculation service
- `cache.js` - Local storage caching system
- `guessItService.js` - GuessIt API integration for metadata extraction

### File Processing Flow

1. **Drop Zone**: Files are dropped into `DropZone` component
2. **File Processing**: `FileProcessingService` processes dropped items (supports directories)
3. **File Pairing**: `pairVideoAndSubtitleFiles` utility matches videos with subtitles
4. **Parallel Processing**: Multiple services run concurrently:
   - Movie hash calculation for video files
   - Language detection for subtitle files
   - Movie metadata guessing via GuessIt
   - Feature data fetching from OpenSubtitles API

### Key Utilities

- `src/utils/fileUtils.js` - File type detection, pairing logic, and validation
- `src/utils/constants.js` - API endpoints, cache keys, and configuration
- `src/utils/networkUtils.js` - Network request utilities with delays
- `src/utils/retryUtils.js` - Retry logic for API calls

## Technical Stack

- **React 18** with hooks-based architecture
- **Vite** for development and build tooling
- **Tailwind CSS** for styling
- **OpenSubtitles API** for language detection and metadata
- **GuessIt API** for movie metadata extraction
- **Local Storage** for caching API responses

## Key Features

- Drag and drop support for files and directories
- Automatic video/subtitle file pairing
- Language detection for subtitle files
- Movie hash calculation for video files
- Movie metadata enrichment
- Upload state management per subtitle
- Debug mode with detailed logging
- Caching system for API responses
- Retry logic for network operations

## File Structure Notes

- Components are organized by functionality in `src/components/`
- File list components are grouped under `src/components/FileList/`
- Custom hooks are separated by concern in `src/hooks/`
- Services are organized by API type in `src/services/api/`
- Utilities are grouped by purpose in `src/utils/`
- Configuration uses JSON files (vite.config.json, tailwind.config.json)

## Development Notes

- The application uses parallel processing to handle multiple files efficiently
- Processing states are tracked per file to prevent duplicate operations
- The pairing algorithm matches files based on name similarity and directory structure
- Debug mode provides detailed logging for troubleshooting file processing issues
- Browser capabilities are detected to optimize file handling behavior

## Episode-Specific Features

For TV show episodes, the application provides enhanced functionality:

- **Episode Matching**: Uses GuessIt data to match specific episodes within TV series
- **Episode-Specific Display**: Shows formatted titles like "Resident Alien - S04E04 - Truth Hurts (2021)"
- **Dual IMDb Links**: Displays both "TV IMDb" (for the series) and "Episode IMDb" (for the specific episode)
- **Episode Posters**: Automatically fetches and displays episode-specific posters when available
- **Episode Features**: Fetches episode-specific subtitle counts and metadata from OpenSubtitles API
- **Smart Title Generation**: Uses parent_title + season/episode + original_title format for clarity

## Upload System

The application includes a comprehensive upload validation and submission system:

- **Upload Button**: Large, prominent upload button that appears when paired files are available
- **Comprehensive Validation**: Ensures all requirements are met before allowing upload:
  - All selected subtitles must have identified movies with valid IMDb IDs
  - All selected subtitles must have assigned upload languages
  - Features data should be loaded for accurate metadata
- **Visual Feedback**: Clear indication of upload readiness with detailed error/warning messages
- **Upload Requirements Checklist**: Shows users exactly what needs to be completed
- **Smart IMDb Selection**: Automatically uses episode-specific IMDb IDs when available for TV shows
- **Progress Tracking**: Shows count of ready subtitles vs. total selected subtitles