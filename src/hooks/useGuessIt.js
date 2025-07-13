import { useState, useCallback, useRef } from 'react';
import { GuessItService } from '../services/guessItService.js';

/**
 * Custom hook for GuessIt metadata extraction
 * Now uses data from XML-RPC GuessMovieFromString instead of separate API calls
 */
export const useGuessIt = (addDebugInfo) => {
  const [guessItData, setGuessItData] = useState({});
  
  // Track which files are currently being processed
  const processingFiles = useRef(new Set());
  const failedFiles = useRef(new Set());

  // Extract GuessIt data from movie guess results
  const extractGuessItFromMovieData = useCallback((movieData, filePath, filename) => {
    if (movieData && movieData.guessit) {
      addDebugInfo(`GuessIt metadata found in XML-RPC response for: ${filename}`);
      
      setGuessItData(prev => ({
        ...prev,
        [filePath]: movieData.guessit
      }));
      
      addDebugInfo(`GuessIt metadata extracted for ${filename}: ${movieData.guessit.title || 'Unknown'}`);
      return true;
    }
    return false;
  }, [addDebugInfo]);

  // Process file metadata extraction (now checks XML-RPC first, fallback to API)
  const processGuessIt = useCallback(async (videoFile, movieGuesses = {}) => {
    const filePath = videoFile.fullPath;
    
    // Check if already processing or failed
    if (processingFiles.current.has(filePath)) {
      addDebugInfo(`GuessIt already in progress for ${videoFile.name}, skipping`);
      return;
    }
    
    if (failedFiles.current.has(filePath)) {
      addDebugInfo(`GuessIt previously failed for ${videoFile.name}, skipping`);
      return;
    }
    
    // Check if already completed
    if (guessItData[filePath] && typeof guessItData[filePath] === 'object') {
      addDebugInfo(`GuessIt already completed for ${videoFile.name}, skipping`);
      return;
    }
    
    // First, check if we have GuessIt data from XML-RPC movie guess
    const movieData = movieGuesses[filePath];
    if (movieData && typeof movieData === 'object' && movieData.guessit) {
      extractGuessItFromMovieData(movieData, filePath, videoFile.name);
      return;
    }
    
    // If XML-RPC data not available, use fallback to direct API call
    processingFiles.current.add(filePath);
    
    try {
      addDebugInfo(`XML-RPC GuessIt data not available, using fallback API for: ${videoFile.name}`);
      
      // Set processing status
      setGuessItData(prev => ({
        ...prev,
        [filePath]: 'processing'
      }));

      const metadata = await GuessItService.guessFileMetadataWithRetry(videoFile.name, addDebugInfo);
      
      setGuessItData(prev => ({
        ...prev,
        [filePath]: metadata || 'no-data'
      }));

      if (metadata) {
        addDebugInfo(`GuessIt metadata extracted for ${videoFile.name}: ${metadata.title || 'Unknown'}`);
      } else {
        addDebugInfo(`No GuessIt metadata extracted for ${videoFile.name}`);
      }
      
    } catch (error) {
      addDebugInfo(`GuessIt failed for ${videoFile.name}: ${error.message}`);
      failedFiles.current.add(filePath);
      setGuessItData(prev => ({
        ...prev,
        [filePath]: 'error'
      }));
    } finally {
      processingFiles.current.delete(filePath);
    }
  }, [addDebugInfo, guessItData, extractGuessItFromMovieData]);

  // Clear processing state for a file
  const clearGuessItProcessingState = useCallback((filePath) => {
    processingFiles.current.delete(filePath);
    failedFiles.current.delete(filePath);
  }, []);

  // Clear all state (for fresh file drops)
  const clearAllGuessItState = useCallback(() => {
    setGuessItData({});
    processingFiles.current.clear();
    failedFiles.current.clear();
  }, []);

  // Get processing status
  const getGuessItProcessingStatus = useCallback((filePath) => {
    return {
      isProcessing: processingFiles.current.has(filePath),
      hasFailed: failedFiles.current.has(filePath),
      isComplete: guessItData[filePath] && typeof guessItData[filePath] === 'object'
    };
  }, [guessItData]);

  // Get formatted tags for a file
  const getFormattedTags = useCallback((filePath) => {
    const data = guessItData[filePath];
    if (!data || typeof data !== 'object') {
      return [];
    }
    
    return GuessItService.formatMetadataAsTags(data);
  }, [guessItData]);

  return {
    guessItData,
    processGuessIt,
    clearGuessItProcessingState,
    clearAllGuessItState,
    getGuessItProcessingStatus,
    getFormattedTags,
    extractGuessItFromMovieData
  };
};

