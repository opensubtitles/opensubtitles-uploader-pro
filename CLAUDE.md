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
- `useMovieGuess` - Integrates with GuessIt service for movie metadata (episode detection disabled)
- `useGuessIt` - Provides detailed file metadata extraction
- `useDebugMode` - Debug panel and logging functionality

**Note**: `useMovieGuess` currently has episode detection functionality disabled to prevent React setState during render warnings.

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

### Currently Working Features ✅

- Drag and drop support for files and directories
- Automatic video/subtitle file pairing
- Language detection for subtitle files
- Movie hash calculation for video files
- Basic movie metadata enrichment (without episode detection)
- Upload state management per subtitle
- Debug mode with detailed logging
- Caching system for API responses
- Retry logic for network operations
- Movie poster display
- Basic TV series detection (shows as TV series)
- GuessIt metadata tags (quality, codecs, etc.)
- Manual movie search and selection
- Features data fetching and error handling

### Disabled Features ❌

- Episode-specific title formatting
- Episode-specific IMDb ID detection
- Episode-specific poster fetching
- Complex episode matching logic
- Season/episode number display in titles
- Episode-specific features data fetching

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

### React setState During Render Prevention

**CRITICAL**: When working with this codebase, be extremely careful about React setState during render warnings. The following practices should be followed:

1. **Never call setState or state-updating functions directly in render**
2. **Use useEffect hooks for side effects, not direct function calls in render**
3. **Be cautious with useMemo and useCallback dependencies that might trigger state updates**
4. **Avoid complex nested state updates in component rendering**
5. **Use setTimeout or useEffect to defer state updates when needed**
6. **Test incrementally when adding back complex functionality**

### Current Safe Patterns

- ✅ Basic feature fetching with setTimeout delays
- ✅ Simple useMemo for basic data transformation
- ✅ useCallback for event handlers
- ✅ Direct prop passing without complex processing
- ❌ Complex episode detection logic in render
- ❌ Nested state updates in useMemo
- ❌ Direct API calls in render functions

## Episode-Specific Features (SUCCESSFULLY RESTORED)

**IMPORTANT**: Episode-specific features have been successfully restored using useEffect-based approach to avoid setState during render warnings.

**Current Status**:
- **Episode Matching**: Uses GuessIt data to match specific episodes within TV series ✅ **WORKING**
- **Episode-Specific IMDb IDs**: Correctly identifies episode-specific IMDb IDs for proper uploads ✅ **WORKING**
- **Episode Detection**: Detects season/episode numbers from filenames ✅ **WORKING**
- **Episode-Specific Display**: Shows "Resident Alien - S04E04 - Truth Hurts (2021)" format ✅ **WORKING**
- **Episode Features**: Fetches episode-specific subtitle counts and metadata from OpenSubtitles API ✅ **WORKING**
- **Episode Posters**: Automatically fetches and displays episode-specific posters when available ✅ **WORKING**
- **Smart Title Generation**: Uses parent_title + season/episode + original_title format for clarity ✅ **WORKING**

**SUCCESS**: All episode-specific features are now working correctly for both paired files and orphaned subtitles.

### Episode Detection Issue History

The application previously had comprehensive episode detection functionality that was causing React setState during render warnings. To resolve this issue, the following components were systematically disabled:

1. **MovieDisplay.jsx**: 
   - Disabled `findEpisodeMatch` function
   - Disabled `getBestMovieData` episode processing
   - Disabled episode-specific features data fetching
   - Disabled complex useMemo hooks that were causing setState calls

2. **useMovieGuess.js**:
   - Disabled `createEpisodeMovieData` function
   - Disabled TV series episode enhancement logic
   - Disabled episode-specific GuessIt processing

3. **MatchedPairs.jsx & OrphanedSubtitles.jsx**:
   - Temporarily disabled MovieDisplay components entirely
   - Later re-enabled with basic functionality only
   - Removed episode detection data passing

### Second setState During Render Issue (Current)

**Date**: 2025-07-16
**Issue**: After successfully restoring episode detection with proper IMDb IDs, attempting to enhance title formatting with `/features` endpoint data caused the setState during render warning to return.

**What Was Working Before This Issue**:
- ✅ Episode-specific IMDb IDs (e.g., 8690918) for proper uploads
- ✅ Basic episode detection (S00E?? format)
- ✅ Episode-specific features fetching
- ✅ Proper episode titles ("Resident Alien - S04E04 - Truth Hurts")

**What Caused the Issue**:
- Re-enabling `findEpisodeMatch` function in `MovieDisplay.jsx`
- Enhanced `getBestMovieData` useMemo with complex episode matching logic
- Using `/features` endpoint data in useMemo dependencies

**Root Cause**: The `findEpisodeMatch` function and enhanced `getBestMovieData` useMemo are causing setState during render because they process complex data transformations that trigger state updates in the render cycle.

**Solution Needed**: Move episode matching logic outside of render cycle, possibly to:
1. useEffect hooks for episode matching
2. Separate service/context for episode processing
3. Defer episode enhancement to avoid render-time processing
4. Use a separate state management system for episode data

### SOLUTION IMPLEMENTED (2025-07-16)

**✅ RESOLVED**: Successfully implemented useEffect-based episode enhancement approach.

**What Was Implemented**:
1. **Separate State Management**: Added `enhancedEpisodeData` state in MovieDisplay component
2. **useEffect-Based Processing**: Moved all /features endpoint processing to useEffect hook
3. **Deferred Title Updates**: Initial render shows basic data, then enhances with proper titles
4. **Two-Stage Rendering**: Basic episode detection first, then enhanced titles from /features API

**Technical Implementation**:
- Added `const [enhancedEpisodeData, setEnhancedEpisodeData] = React.useState(null)` to MovieDisplay
- Created dedicated useEffect for episode title enhancement that runs after render
- Enhanced data processing moved outside render cycle to prevent setState warnings
- Final movie data prefers enhanced data: `const finalMovieData = enhancedEpisodeData || getBestMovieData`

**Bug Fix for Orphaned Subtitles**:
- Fixed OrphanedSubtitles.jsx passing `guessItData={{}}` instead of `guessItData={guessItData}`
- This was preventing episode enhancement from working for orphaned subtitles

**Current Working State**:
- ✅ **Paired files**: Movie + subtitle files show proper episode titles
- ✅ **Orphaned subtitles**: Subtitle-only files show proper episode titles
- ✅ **Episode IMDb IDs**: Correctly uses episode-specific IMDb IDs for upload
- ✅ **No setState warnings**: All processing happens in useEffect, not during render
- ✅ **Proper titles**: Shows "Resident Alien - S04E04 - Truth Hurts (2021)" format

**Result**: Critical UX issue resolved - no more "S00E??" format, proper episode titles display correctly.

### Current Working State

The application currently works with the following functionality:

✅ **Working Features**:
- Basic movie detection via XML-RPC
- Basic TV series detection (shows as TV series, but no episode specifics)
- Features data fetching from OpenSubtitles API
- Movie posters and basic metadata display
- Checkbox functionality for subtitle selection
- Retry functionality for failed API calls
- GuessIt metadata tags display (quality, codecs, etc.)
- Upload functionality with validation
- Movie search and manual selection

❌ **Disabled Features**:
- Episode-specific title formatting
- Episode-specific IMDb ID detection
- Episode-specific poster fetching
- Episode-specific features data
- Complex episode matching logic
- Season/episode number display
- Episode-specific upload handling

### Technical Details of the Issue

The setState during render warnings occurred because:
1. MovieDisplay component was calling `fetchFeaturesByImdbId` during render
2. Episode detection logic was triggering state updates in render cycles
3. Complex useMemo dependencies were causing cascading state updates
4. GuessIt processing was triggering state changes during component rendering

The solution involved:
1. Disabling all episode-specific logic
2. Simplifying state management in MovieDisplay
3. Removing complex memoization that caused setState calls
4. Gradually re-enabling basic functionality without episode detection

### Re-enabling Process

If episode detection needs to be re-enabled, it should be done carefully:
1. Use useEffect hooks instead of direct function calls in render
2. Implement proper state management to avoid setState during render
3. Consider using useCallback and useMemo more carefully
4. Test each component incrementally to identify specific causes
5. Consider moving episode detection to a separate service or context

## Upload System

The application includes a comprehensive upload validation and submission system:

- **Upload Button**: Large, prominent upload button that appears when paired files are available
- **Comprehensive Validation**: Ensures all requirements are met before allowing upload:
  - All selected subtitles must have identified movies with valid IMDb IDs
  - All selected subtitles must have assigned upload languages
  - Features data should be loaded for accurate metadata
- **Visual Feedback**: Clear indication of upload readiness with detailed error/warning messages
- **Upload Requirements Checklist**: Shows users exactly what needs to be completed
- **Smart IMDb Selection**: Currently uses main series IMDb IDs for TV shows (episode-specific IDs disabled)
- **Progress Tracking**: Shows count of ready subtitles vs. total selected subtitles

**Note**: Upload functionality works correctly with the current basic implementation, but TV shows will upload with series-level IMDb IDs rather than episode-specific IDs due to the disabled episode detection.