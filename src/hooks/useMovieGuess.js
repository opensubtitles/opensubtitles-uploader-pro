import { useState, useCallback, useRef, useEffect } from 'react';
import { XmlRpcService } from '../services/api/xmlrpc.js';
import { OpenSubtitlesApiService } from '../services/api/openSubtitlesApi.js';
import { MovieHashService } from '../services/movieHash.js';
import { detectVideoFileInfo, getBestMovieDetectionName } from '../utils/fileUtils.js';

/**
 * Custom hook for movie guessing and hash calculation
 */
export const useMovieGuess = (addDebugInfo) => {
  const [movieGuesses, setMovieGuesses] = useState({});
  const [featuresByImdbId, setFeaturesByImdbId] = useState({});
  const [featuresLoading, setFeaturesLoading] = useState({});
  
  // Track which files are currently being processed to prevent duplicates
  const processingFiles = useRef(new Set());
  const failedFiles = useRef(new Set());

  // Manually set a movie guess (for user selections)
  const setMovieGuess = useCallback((videoPath, movieGuess) => {
    setMovieGuesses(prev => ({
      ...prev,
      [videoPath]: movieGuess
    }));
  }, []);

  // Calculate movie hash for a file
  const calculateHash = useCallback(async (videoFile) => {
    try {
      addDebugInfo(`Calculating movie hash for ${videoFile.name}`);
      const hash = await MovieHashService.calculateMovieHashWithRetry(videoFile.file, addDebugInfo);
      addDebugInfo(`Movie hash calculated: ${hash}`);
      return hash;
    } catch (error) {
      addDebugInfo(`Movie hash calculation failed for ${videoFile.name}: ${error.message}`);
      return 'error';
    }
  }, [addDebugInfo]);

  // Use refs to track current state without causing dependency issues
  const featuresByImdbIdRef = useRef(featuresByImdbId);
  const featuresLoadingRef = useRef(featuresLoading);
  
  // Update refs when state changes
  useEffect(() => {
    featuresByImdbIdRef.current = featuresByImdbId;
  }, [featuresByImdbId]);
  
  useEffect(() => {
    featuresLoadingRef.current = featuresLoading;
  }, [featuresLoading]);

  // Fetch features by IMDb ID
  const fetchFeaturesByImdbId = useCallback(async (imdbId) => {
    if (!imdbId) return;

    try {
      // Check if we already have this data using refs
      if (featuresByImdbIdRef.current[imdbId]) {
        addDebugInfo(`Features already cached for IMDb ID: ${imdbId}`);
        return featuresByImdbIdRef.current[imdbId];
      }
      
      // Check if already loading using refs
      if (featuresLoadingRef.current[imdbId]) {
        addDebugInfo(`Features already loading for IMDb ID: ${imdbId}`);
        return;
      }
      
      addDebugInfo(`Fetching features for IMDb ID: ${imdbId}`);
      
      // Set loading state
      setFeaturesLoading(prev => ({
        ...prev,
        [imdbId]: true
      }));
      
      const features = await OpenSubtitlesApiService.getFeaturesByImdbId(imdbId);
      
      setFeaturesByImdbId(prev => ({
        ...prev,
        [imdbId]: features
      }));
      
      addDebugInfo(`Features fetched for IMDb ID: ${imdbId}`);
      return features;
    } catch (error) {
      addDebugInfo(`Features fetch failed for IMDb ID ${imdbId}: ${error.message}`);
      setFeaturesByImdbId(prev => ({
        ...prev,
        [imdbId]: { error: error.message }
      }));
      return null;
    } finally {
      // Clear loading state
      setFeaturesLoading(prev => ({
        ...prev,
        [imdbId]: false
      }));
    }
  }, [addDebugInfo]);

  // Extract directory name from file path for fallback movie guessing
  const extractDirectoryName = useCallback((fullPath) => {
    if (!fullPath) return null;
    
    // Split path and get directory parts (remove filename)
    const pathParts = fullPath.split('/').filter(Boolean);
    if (pathParts.length < 2) return null;
    
    // Get the immediate parent directory name
    const directoryName = pathParts[pathParts.length - 2];
    
    // Clean up the directory name for better matching
    // Remove common patterns but keep years in parentheses
    const cleanedName = directoryName
      .replace(/\[.*?\]/g, '') // Remove content in brackets like [1080p] [WEBRip] [5.1] [YTS.MX]
      .replace(/\((?!\d{4})[^)]*\)/g, '') // Remove content in parentheses EXCEPT years (4 digits)
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    // If the cleaned name is too short, use original
    if (cleanedName.length < 3) {
      return directoryName;
    }
    
    return cleanedName;
  }, []);

  // Helper function to generate a movie key for deduplication
  const getMovieKey = useCallback((file) => {
    // For files in the same directory with similar names, use the base movie name
    const pathParts = file.fullPath.split('/');
    const directory = pathParts.slice(0, -1).join('/');
    const fileName = file.name;
    
    // Remove common subtitle/audio/quality indicators and extensions
    const baseName = fileName
      .replace(/\.(mkv|mp4|avi|mov|wmv|flv|webm|srt|sub|ass|ssa|vtt)$/i, '') // Remove extensions
      .replace(/\.(en|eng|spanish|french|german|italian|czech|cz|sk|slovak|chinese|japanese|korean|russian|ru|pl|polish|de|fr|es|it|pt|nl|sv|no|da|fi|hu|hr|sr|bg|ro|el|tr|ar|he|hi|th|vi|id|ms|tl|uk|ca|eu|gl|cy|ga|mt|is|lv|lt|et|sl|mk|sq|bs|hr|sr|me|cs|sk)$/i, '') // Remove language codes
      .replace(/\.(720p|1080p|2160p|4k|hd|fhd|uhd|bluray|brrip|dvdrip|webrip|hdtv|web-dl|webdl|ac3|dts|aac|mp3|5\.1|7\.1|x264|x265|hevc|h264|h265|xvid|divx)$/i, '') // Remove quality/codec indicators
      .replace(/\.(cd1|cd2|disc1|disc2|part1|part2|pt1|pt2)$/i, '') // Remove disc/part indicators
      .trim();
      
    return `${directory}/${baseName}`;
  }, []);

  // Guess movie from filename with state tracking and deduplication
  const guessMovie = useCallback(async (videoFile) => {
    const filePath = videoFile.fullPath;
    const movieKey = getMovieKey(videoFile);
    
    // Check if already processing or failed
    if (processingFiles.current.has(filePath)) {
      addDebugInfo(`Movie guess already in progress for ${videoFile.name}, skipping`);
      return;
    }
    
    if (failedFiles.current.has(filePath)) {
      addDebugInfo(`Movie guess previously failed for ${videoFile.name}, skipping`);
      return;
    }
    
    // Check if already completed for this specific file
    if (movieGuesses[filePath] && typeof movieGuesses[filePath] === 'object') {
      addDebugInfo(`Movie already identified for ${videoFile.name}, skipping`);
      return;
    }
    
    // Check if we already have movie data for the same movie (deduplication)
    const existingMovieData = Object.entries(movieGuesses).find(([path, data]) => {
      if (typeof data === 'object' && data !== null && data.imdbid) {
        const existingKey = getMovieKey({ fullPath: path, name: path.split('/').pop() });
        return existingKey === movieKey;
      }
      return false;
    });
    
    if (existingMovieData) {
      const [existingPath, existingData] = existingMovieData;
      addDebugInfo(`Reusing movie identification from similar file: ${videoFile.name} -> ${existingData.title} (${existingData.year})`);
      setMovieGuesses(prev => ({
        ...prev,
        [filePath]: {
          ...existingData,
          reason: `Reused from: ${existingPath.split('/').pop()}`
        }
      }));
      
      // Also fetch features if we have an IMDb ID and it's a TV series (allow multiple calls for episodes)
      if (existingData.imdbid && (!existingData.kind || existingData.kind === 'tv series' || existingData.kind.toLowerCase().includes('episode'))) {
        fetchFeaturesByImdbId(existingData.imdbid);
      }
      return;
    }
    
    processingFiles.current.add(filePath);
    
    try {
      addDebugInfo(`Starting movie guess for: ${videoFile.name}`);
      
      setMovieGuesses(prev => ({
        ...prev,
        [filePath]: 'guessing'
      }));

      // First attempt: try with the actual filename
      let movieGuess = await XmlRpcService.guessMovieFromStringWithRetry(videoFile.name, addDebugInfo);
      
      // Check if we got a valid movie guess (not just an empty response)
      const isValidMovieGuess = movieGuess && 
                                movieGuess.title && 
                                movieGuess.title !== 'undefined' && 
                                movieGuess.title.trim() !== '';
      
      // Fallback attempt: if no match found OR invalid response, try with directory name
      if (!isValidMovieGuess) {
        const directoryName = extractDirectoryName(videoFile.fullPath);
        if (directoryName && directoryName !== videoFile.name) {
          addDebugInfo(`Primary guess failed, trying directory name fallback: "${directoryName}"`);
          movieGuess = await XmlRpcService.guessMovieFromStringWithRetry(directoryName, addDebugInfo);
          
          if (movieGuess) {
            // Mark that this was identified from directory
            movieGuess.reason = `Directory match: ${directoryName}`;
            addDebugInfo(`Movie identified from directory name: ${movieGuess.title} (${movieGuess.year})`);
          }
        }
      }
      
      // Final validation - check if we have a valid result
      const finalValidMovieGuess = movieGuess && 
                                   movieGuess.title && 
                                   movieGuess.title !== 'undefined' && 
                                   movieGuess.title.trim() !== '';

      // Add subtitle detection reason if this file has one
      if (finalValidMovieGuess && videoFile.detectionReason === 'parent-directory') {
        movieGuess.reason = `Subtitle parent directory: ${videoFile.name.replace(/\.[^/.]+$/, '')}`;
      }

      setMovieGuesses(prev => ({
        ...prev,
        [filePath]: finalValidMovieGuess ? movieGuess : 'no-match'
      }));

      if (finalValidMovieGuess) {
        addDebugInfo(`Movie identified: ${movieGuess.title} (${movieGuess.year}) - ${movieGuess.reason || 'Filename match'}`);
        
        // Fetch features if we have an IMDb ID
        // For movies: only fetch once per IMDb ID (already handled by fetchFeaturesByImdbId caching)
        // For TV series/episodes: allow multiple fetches as episodes might need different season/episode data
        if (movieGuess.imdbid) {
          fetchFeaturesByImdbId(movieGuess.imdbid);
        }
      } else {
        addDebugInfo(`No valid movie match found for ${videoFile.name} or its directory`);
      }
    } catch (error) {
      addDebugInfo(`Movie guess failed for ${videoFile.name}: ${error.message}`);
      failedFiles.current.add(filePath);
      setMovieGuesses(prev => ({
        ...prev,
        [filePath]: 'error'
      }));
    } finally {
      processingFiles.current.delete(filePath);
    }
  }, [addDebugInfo, fetchFeaturesByImdbId, movieGuesses, extractDirectoryName, getMovieKey]);

  // Process complete movie analysis (hash + guess + file info)
  const processMovieGuess = useCallback(async (videoFile) => {
    const filePath = videoFile.fullPath;
    
    // Prevent duplicate processing
    if (processingFiles.current.has(filePath + '_processing')) {
      addDebugInfo(`Movie processing already in progress for ${videoFile.name}, skipping`);
      return;
    }
    
    processingFiles.current.add(filePath + '_processing');
    
    try {
      addDebugInfo(`Processing video file: ${videoFile.name}`);
      
      // Only start movie guess, don't wait for it
      setTimeout(() => {
        guessMovie(videoFile).catch(error => {
          addDebugInfo(`Delayed movie guess failed for ${videoFile.name}: ${error.message}`);
        });
      }, 100);
      
      addDebugInfo(`Initiated movie guess for ${videoFile.name}`);
      
    } catch (error) {
      addDebugInfo(`Error initiating movie processing for ${videoFile.name}: ${error.message}`);
      throw error;
    } finally {
      processingFiles.current.delete(filePath + '_processing');
    }
  }, [addDebugInfo, guessMovie]);

  // Process movie guess for subtitle files (orphaned subtitles)
  const processSubtitleMovieGuess = useCallback(async (subtitleFile) => {
    const filePath = subtitleFile.fullPath;
    
    // Prevent duplicate processing
    if (processingFiles.current.has(filePath + '_processing')) {
      addDebugInfo(`Subtitle movie processing already in progress for ${subtitleFile.name}, skipping`);
      return;
    }
    
    processingFiles.current.add(filePath + '_processing');
    
    try {
      addDebugInfo(`Processing orphaned subtitle: ${subtitleFile.name}`);
      
      // Get the best name for movie detection (use parent directory for generic names)
      const detectionName = getBestMovieDetectionName(subtitleFile);
      const originalName = subtitleFile.name.replace(/\.[^/.]+$/, ''); // Remove extension
      
      // Log what name we're using for detection
      if (detectionName !== originalName) {
        addDebugInfo(`Using parent directory "${detectionName}" for generic subtitle "${originalName}"`);
      }
      
      // Create a modified file object for movie guessing
      const modifiedSubtitleFile = {
        ...subtitleFile,
        name: detectionName + '.srt', // Add .srt extension for processing
        detectionReason: detectionName !== originalName ? 'parent-directory' : 'filename'
      };
      
      // Start movie guess for subtitle with improved detection
      setTimeout(() => {
        guessMovie(modifiedSubtitleFile).catch(error => {
          addDebugInfo(`Subtitle movie guess failed for ${subtitleFile.name}: ${error.message}`);
        });
      }, 100);
      
      addDebugInfo(`Initiated movie guess for subtitle: ${subtitleFile.name} (using: ${detectionName})`);
      
    } catch (error) {
      addDebugInfo(`Error initiating movie processing for subtitle ${subtitleFile.name}: ${error.message}`);
      throw error;
    } finally {
      processingFiles.current.delete(filePath + '_processing');
    }
  }, [addDebugInfo, guessMovie]);

  // Clear processing state for a file
  const clearProcessingState = useCallback((filePath) => {
    processingFiles.current.delete(filePath);
    processingFiles.current.delete(filePath + '_processing');
    failedFiles.current.delete(filePath);
  }, []);

  // Clear all state (for fresh file drops)
  const clearAllState = useCallback(() => {
    setMovieGuesses({});
    setFeaturesByImdbId({});
    setFeaturesLoading({});
    processingFiles.current.clear();
    failedFiles.current.clear();
  }, []);

  // Get processing status
  const getProcessingStatus = useCallback((filePath) => {
    return {
      isProcessing: processingFiles.current.has(filePath),
      hasFailed: failedFiles.current.has(filePath),
      isComplete: movieGuesses[filePath] && typeof movieGuesses[filePath] === 'object'
    };
  }, [movieGuesses]);

  return {
    movieGuesses,
    featuresByImdbId,
    featuresLoading,
    processMovieGuess,
    processSubtitleMovieGuess, // New function for subtitle movie guessing
    calculateHash,
    guessMovie,
    fetchFeaturesByImdbId,
    clearProcessingState,
    clearAllState,
    getProcessingStatus,
    setMovieGuess // New function for manual movie setting
  };
};