import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from "react";
import { useDebugMode } from "../hooks/useDebugMode.js";
import { useFileHandling } from "../hooks/useFileHandling.js";
import { useLanguageData } from "../hooks/useLanguageData.js";
import { useLanguageDetection } from "../hooks/useLanguageDetection.js";
import { useMovieGuess } from "../hooks/useMovieGuess.js";
import { useGuessIt } from "../hooks/useGuessIt.js";
import { useUserSession } from "../hooks/useUserSession.js";
import { useCheckSubHash } from "../hooks/useCheckSubHash.js";
import { useVideoMetadata } from "../hooks/useVideoMetadata.js";
import { CacheService } from "../services/cache.js";
import { MovieHashService } from "../services/movieHash.js";
import { SubtitleUploadService } from "../services/subtitleUploadService.js";
import { detectVideoFileInfo, formatFileSize, getBestMovieDetectionName } from "../utils/fileUtils.js";
import { DropZone } from "./DropZone.jsx";
import { FileList } from "./FileList/FileList.jsx";
import { MatchedPairs } from "./MatchedPairs.jsx";
import { OrphanedSubtitles } from "./OrphanedSubtitles.jsx";
import { StatsPanel } from "./StatsPanel.jsx";
import { SubtitlePreview } from "./SubtitlePreview.jsx";
import { UploadButton } from "./UploadButton.jsx";
import { ApiHealthCheck } from "./ApiHealthCheck.jsx";
import { ConfigOverlay } from "./ConfigOverlay.jsx";
import { HelpOverlay } from "./HelpOverlay.jsx";
import ProgressOverlay from "./ProgressOverlay.jsx";
import { ThemeProvider, useTheme } from "../contexts/ThemeContext.jsx";
import { getThemeStyles, createHoverHandlers } from "../utils/themeUtils.js";
import { APP_VERSION } from "../utils/constants.js";
import TestModePanel from "./TestModePanel.jsx";

// Lazy load the DebugPanel component
const DebugPanel = lazy(() => import("./DebugPanel.jsx").then(module => ({ default: module.DebugPanel })));

function SubtitleUploaderInner() {
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = getThemeStyles(colors);
  const [error, setError] = useState(null);
  const [previewSubtitle, setPreviewSubtitle] = useState(null);
  const [subtitleContent, setSubtitleContent] = useState('');
  const [openDropdowns, setOpenDropdowns] = useState({});
  const [dropdownSearch, setDropdownSearch] = useState({});
  const [uploadStates, setUploadStates] = useState({}); // New state for upload enable/disable
  const [uploadResults, setUploadResults] = useState({}); // New state for upload results
  const [subcontentData, setSubcontentData] = useState({}); // New state for subcontent data
  const [uploadOptions, setUploadOptions] = useState({}); // New state for upload options (release name, comments, etc.)
  const [uploadProgress, setUploadProgress] = useState({ 
    isUploading: false,
    isComplete: false,
    processed: 0, 
    total: 0,
    successful: 0,
    alreadyExists: 0,
    failed: 0,
    currentSubtitle: '',
    results: []
  }); // Enhanced upload progress tracking
  
  // File processing progress state
  const [processingProgress, setProcessingProgress] = useState({
    isProcessing: false,
    startTime: null,
    totalFiles: 0,
    processedFiles: 0,
    fileDiscovery: 0,
    fileDiscoveryTotal: 0,
    directoriesProcessed: 0,
    videoProcessing: 0,
    videoProcessingTotal: 0,
    subtitleProcessing: 0,
    subtitleProcessingTotal: 0,
    languageDetection: 0,
    languageDetectionTotal: 0,
    errors: 0,
    skipped: 0
  });
  
  // Config state
  const [config, setConfig] = useState({
    uploadOptionsExpanded: false, // Default to collapsed (current behavior)
    globalComment: '' // Global comment for all subtitles
  });
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  
  

  // Load config from localStorage on mount
  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem('opensubtitles-uploader-config');
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig);
        setConfig(prev => ({ ...prev, ...parsedConfig }));
      }
    } catch (error) {
      console.error('Error loading config from localStorage:', error);
    }
  }, []);

  // Save config to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('opensubtitles-uploader-config', JSON.stringify(config));
    } catch (error) {
      console.error('Error saving config to localStorage:', error);
    }
  }, [config]);

  // Custom hooks - DEBUG MODE RE-ENABLED AFTER FIX
  const { 
    debugMode, 
    debugInfo, 
    addDebugInfo, 
    clearDebugInfo, 
    toggleDebugMode 
  } = useDebugMode();

  // Config handlers (moved after debug mode hook)
  const handleConfigChange = useCallback((newConfig) => {
    const oldConfig = config;
    setConfig(newConfig);
    addDebugInfo(`Config updated: ${JSON.stringify(newConfig)}`);
    
    // Apply global comment to all existing subtitles if it changed
    if (oldConfig.globalComment !== newConfig.globalComment) {
      applyGlobalCommentToAllSubtitles(newConfig.globalComment);
    }
  }, [addDebugInfo, config]);

  const handleConfigToggle = useCallback(() => {
    setIsConfigOpen(prev => !prev);
  }, []);

  const handleConfigClose = useCallback(() => {
    setIsConfigOpen(false);
  }, []);

  // Help handlers
  const handleHelpToggle = useCallback(() => {
    setIsHelpOpen(prev => !prev);
  }, []);
  
  const handleHelpClose = useCallback(() => {
    setIsHelpOpen(false);
  }, []);

  // Progress management functions
  const initializeProgress = useCallback((totalFiles, directoriesProcessed = 1) => {
    setProcessingProgress({
      isProcessing: true,
      startTime: Date.now(),
      totalFiles,
      processedFiles: 0,
      fileDiscovery: 1, // Completed after file discovery
      fileDiscoveryTotal: 1, // Always 1 for directory discovery
      directoriesProcessed,
      videoProcessing: 0,
      videoProcessingTotal: 0,
      subtitleProcessing: 0,
      subtitleProcessingTotal: 0,
      languageDetection: 0,
      languageDetectionTotal: 0,
      errors: 0,
      skipped: 0
    });
  }, []);

  const updateProgress = useCallback((updates) => {
    setProcessingProgress(prev => ({
      ...prev,
      ...(typeof updates === 'function' ? updates(prev) : updates)
    }));
  }, []);

  const finalizeProgress = useCallback(() => {
    setProcessingProgress(prev => ({
      ...prev,
      isProcessing: false,
      processedFiles: prev.totalFiles
    }));
  }, []);

  const cancelProgress = useCallback(() => {
    setProcessingProgress(prev => ({
      ...prev,
      isProcessing: false
    }));
  }, []);

  
  // Mock debug functions to prevent errors (commented out)
  // const debugMode = false;
  // const debugInfo = [];
  // const addDebugInfo = () => {};
  // const clearDebugInfo = () => {};
  // const toggleDebugMode = () => {};

  const {
    files,
    pairedFiles,
    isDragOver,
    browserCapabilities,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    clearFiles,
    updateFile,
    setFiles
  } = useFileHandling(addDebugInfo);

  const {
    combinedLanguages,
    languagesLoading,
    languagesError,
    subtitleLanguages,
    handleSubtitleLanguageChange,
    clearSubtitleLanguages,
    getLanguageInfo,
    getSubtitleLanguage,
    getLanguageOptionsForSubtitle
  } = useLanguageData(addDebugInfo);

  const { 
    processLanguageDetection,
    getLanguageProcessingStatus,
    clearLanguageProcessingState,
    clearAllLanguageState
  } = useLanguageDetection(addDebugInfo, updateFile);

  // RE-ENABLED: GuessIt hook (debug mode was the actual cause)
  const {
    guessItData,
    processGuessIt,
    clearGuessItProcessingState,
    clearAllGuessItState,
    getGuessItProcessingStatus,
    getFormattedTags,
    extractGuessItFromMovieData,
    setGuessItDataForFile
  } = useGuessIt(addDebugInfo);
  
  // Mock GuessIt functions to prevent errors (commented out)
  // const guessItData = {};
  // const processGuessIt = () => {};
  // const clearGuessItProcessingState = () => {};
  // const clearAllGuessItState = () => {};
  // const getGuessItProcessingStatus = () => 'none';
  // const getFormattedTags = () => [];
  // const extractGuessItFromMovieData = () => {};
  // const setGuessItDataForFile = () => {};

  const { 
    movieGuesses, 
    featuresByImdbId, 
    featuresLoading,
    processMovieGuess,
    processSubtitleMovieGuess,
    getProcessingStatus,
    clearProcessingState,
    clearAllState,
    fetchFeaturesByImdbId,
    setMovieGuess
  } = useMovieGuess(addDebugInfo, setGuessItDataForFile);

  const {
    userInfo,
    isLoading: userLoading,
    getUsername,
    isLoggedIn,
    getUserRank
  } = useUserSession(addDebugInfo);

  // RE-ENABLED: CheckSubHash hook (debug mode was the actual cause)
  const {
    hashCheckResults,
    hashCheckLoading,
    hashCheckProcessed,
    processSubtitleHashes,
    getHashCheckResult,
    fileExistsInDatabase,
    getHashCheckSummary,
    clearHashCheckResults
  } = useCheckSubHash(addDebugInfo);
  
  // Mock CheckSubHash functions to prevent errors (commented out)
  // const hashCheckResults = {};
  // const hashCheckLoading = {};
  // const hashCheckProcessed = {};
  // const processSubtitleHashes = () => {};
  // const getHashCheckResult = () => null;
  // const fileExistsInDatabase = () => false;
  // const getHashCheckSummary = () => ({});
  // const clearHashCheckResults = () => {};

  // RE-ENABLED: VideoMetadata hook (debug mode was the actual cause)
  const {
    videoMetadata,
    isFFmpegLoaded,
    extractVideoMetadata,
    processVideoFiles,
    clearVideoMetadata,
    clearAllVideoMetadata,
    getVideoMetadata,
    isMetadataLoading,
    getMetadataError,
    getUploadParameters,
    hasAnyMetadata,
    loadingCount: metadataLoadingCount,
    errorCount: metadataErrorCount,
    processedCount: metadataProcessedCount
  } = useVideoMetadata();
  
  // Mock VideoMetadata functions to prevent errors (commented out)
  // const videoMetadata = {};
  // const isFFmpegLoaded = false;
  // const extractVideoMetadata = () => {};
  // const processVideoFiles = () => {};
  // const clearVideoMetadata = () => {};
  // const clearAllVideoMetadata = () => {};
  // const getVideoMetadata = () => null;
  // const isMetadataLoading = () => false;
  // const getMetadataError = () => null;
  // const getUploadParameters = () => ({});
  // const hasAnyMetadata = () => false;
  // const metadataLoadingCount = 0;
  // const metadataErrorCount = 0;
  // const metadataProcessedCount = 0;

  // Track processed files to prevent reprocessing
  const processedFilesSet = useRef(new Set());
  
  // Track when state is reset to force useEffect re-execution
  const [stateResetKey, setStateResetKey] = useState(0);

  // Calculate orphaned subtitles (subtitles that are not paired with any video)
  const orphanedSubtitles = (() => {
    // Get all subtitle file paths that are in paired files
    const pairedSubtitlePaths = new Set();
    pairedFiles.forEach(pair => {
      if (pair.subtitles && pair.subtitles.length > 0) {
        pair.subtitles.forEach(subtitle => {
          pairedSubtitlePaths.add(subtitle.fullPath);
        });
      }
    });
    
    // Return subtitles that are not in any paired file
    const orphaned = files.filter(file => 
      file.isSubtitle && 
      !file.shouldRemove && 
      !pairedSubtitlePaths.has(file.fullPath)
    );
    
    
    return orphaned;
  })();

  // Handle subtitle upload toggle
  const handleSubtitleUploadToggle = useCallback((subtitlePath, enabled) => {
    setUploadStates(prev => ({
      ...prev,
      [subtitlePath]: enabled
    }));
    addDebugInfo(`Upload ${enabled ? 'enabled' : 'disabled'} for: ${subtitlePath}`);
  }, [addDebugInfo]);

  // Handle upload options update
  const handleUploadOptionsUpdate = useCallback((subtitlePath, options) => {
    setUploadOptions(prev => ({
      ...prev,
      [subtitlePath]: options
    }));
  }, [addDebugInfo]);

  // Apply global comment to all subtitles
  const applyGlobalCommentToAllSubtitles = useCallback((globalComment) => {
    const allSubtitlePaths = [];
    
    // Collect all subtitle paths from paired files
    pairedFiles.forEach(pair => {
      if (pair.subtitles && pair.subtitles.length > 0) {
        pair.subtitles.forEach(subtitle => {
          allSubtitlePaths.push(subtitle.fullPath);
        });
      }
    });
    
    // Add orphaned subtitles
    orphanedSubtitles.forEach(subtitle => {
      allSubtitlePaths.push(subtitle.fullPath);
    });
    
    // Update upload options for all subtitles
    if (allSubtitlePaths.length > 0) {
      setUploadOptions(prev => {
        const newOptions = { ...prev };
        allSubtitlePaths.forEach(path => {
          newOptions[path] = {
            ...newOptions[path],
            subauthorcomment: globalComment
          };
        });
        return newOptions;
      });
      
      addDebugInfo(`Applied global comment to ${allSubtitlePaths.length} subtitles: "${globalComment}"`);
    }
  }, [pairedFiles, orphanedSubtitles, addDebugInfo]);


  // Get upload status for subtitle (default to true)
  const getUploadEnabled = useCallback((subtitlePath) => {
    return uploadStates[subtitlePath] !== false; // Default to true unless explicitly set to false
  }, [uploadStates]);

  // Handle upload action
  const handleUpload = useCallback(async (validationResult) => {
    addDebugInfo(`🚀 Starting upload of ${validationResult.readySubtitlesCount} subtitles`);
    
    // Set initial upload progress state
    setTimeout(() => {
      setUploadProgress({ 
        isUploading: true,
        isComplete: false,
        processed: 0, 
        total: validationResult.readySubtitlesCount,
        successful: 0,
        alreadyExists: 0,
        failed: 0,
        currentSubtitle: '',
        results: []
      });
    }, 0);
    
    try {
      const uploadResults = await SubtitleUploadService.processUpload({
        validationResult,
        pairedFiles,
        orphanedSubtitles,
        movieGuesses,
        featuresByImdbId,
        guessItData,
        getSubtitleLanguage,
        getUploadEnabled,
        uploadOptions,
        combinedLanguages,
        addDebugInfo,
        onProgress: (processed, total, details = {}) => {
          setTimeout(() => {
            setUploadProgress(prev => ({ 
              ...prev,
              isUploading: true, 
              processed, 
              total,
              currentSubtitle: details.currentSubtitle || prev.currentSubtitle,
              successful: details.successful !== undefined ? details.successful : prev.successful,
              alreadyExists: details.alreadyExists !== undefined ? details.alreadyExists : prev.alreadyExists,
              failed: details.failed !== undefined ? details.failed : prev.failed,
              results: details.results || prev.results
            }));
          }, 0);
        },
        getVideoMetadata
      });

      // Process upload results and update state
      const newUploadResults = {};
      const newSubcontentData = {};
      
      uploadResults.success.forEach(videoResult => {
        if (videoResult.results) {
          videoResult.results.forEach(subtitleResult => {
            newUploadResults[subtitleResult.subtitlePath] = subtitleResult.response;
            // Store the exact subcontent that was sent to server
            if (subtitleResult.subcontent) {
              newSubcontentData[subtitleResult.subtitlePath] = subtitleResult.subcontent;
            }
          });
        }
      });
      
      // Defer state updates to avoid setState during render warnings
      setTimeout(() => {
        setUploadResults(newUploadResults);
        setSubcontentData(newSubcontentData);
      }, 0);

      // Log results to debug panel
      addDebugInfo('📊 UPLOAD RESULTS SUMMARY:');
      addDebugInfo(`✅ Successful uploads: ${uploadResults.success.length}`);
      addDebugInfo(`❌ Failed uploads: ${uploadResults.errors.length}`);
      addDebugInfo(`📈 Success rate: ${uploadResults.processedSubtitles}/${uploadResults.totalSubtitles} subtitles`);
      
      if (uploadResults.success.length > 0) {
        addDebugInfo('');
        addDebugInfo('🎉 SUCCESSFUL UPLOADS:');
        uploadResults.success.forEach((result, index) => {
          addDebugInfo(`${index + 1}. ${result.video} (${result.subtitles} subtitles)`);
          if (result.results) {
            result.results.forEach(subtitleResult => {
              const response = subtitleResult.response;
              
              // Check for error responses first
              if (response.status && response.status !== '200 OK') {
                addDebugInfo(`   - ${subtitleResult.subtitle}: ❌ Upload failed - ${response.status}`);
              } else if (response.alreadyindb === 1 || response.alreadyindb === '1') {
                // When alreadyindb=1, subtitle already exists in database (duplicate)
                const subtitleUrl = response.data;
                if (subtitleUrl && typeof subtitleUrl === 'string' && subtitleUrl.startsWith('http')) {
                  addDebugInfo(`   - ${subtitleResult.subtitle}: ⚠️ Duplicate found`);
                  addDebugInfo(`     🔗 View existing at: ${subtitleUrl}`);
                } else {
                  addDebugInfo(`   - ${subtitleResult.subtitle}: ⚠️ Duplicate found (ID: ${subtitleUrl})`);
                }
              } else if (response.alreadyindb === 0 || response.alreadyindb === '0') {
                // When alreadyindb=0, subtitle not uploaded yet, but found existing match
                const subtitleData = Array.isArray(response.data) ? response.data[0] : null;
                const subtitleId = subtitleData?.IDSubtitle;
                addDebugInfo(`   - ${subtitleResult.subtitle}: Not uploaded, uploading... (Found existing: ${subtitleId})`);
              } else if (response.status === '200 OK' && response.data && !response.alreadyindb) {
                // Successful new upload response (from UploadSubtitles)
                if (typeof response.data === 'string' && response.data.startsWith('http')) {
                  addDebugInfo(`   - ${subtitleResult.subtitle}: 🎉 Successfully uploaded as NEW subtitle!`);
                  addDebugInfo(`     🔗 View at: ${response.data}`);
                } else {
                  addDebugInfo(`   - ${subtitleResult.subtitle}: 🎉 Successfully uploaded as NEW subtitle!`);
                  addDebugInfo(`     📊 Response: ${JSON.stringify(response, null, 2)}`);
                }
              } else {
                // For other cases
                const subtitleId = typeof response.data === 'object' ? response.data?.IDSubtitle : response.data;
                addDebugInfo(`   - ${subtitleResult.subtitle}: Upload result (ID: ${subtitleId})`);
              }
            });
          }
        });
      }
      
      if (uploadResults.errors.length > 0) {
        addDebugInfo('');
        addDebugInfo('💥 FAILED UPLOADS:');
        uploadResults.errors.forEach((error, index) => {
          addDebugInfo(`${index + 1}. ${error.video || 'Unknown'}: ${error.error || error.message}`);
        });
      }
      
    } catch (error) {
      addDebugInfo(`💥 Upload process failed: ${error.message}`);
      console.error('Upload error:', error);
    } finally {
      // Mark upload as complete
      setTimeout(() => {
        setUploadProgress(prev => ({ 
          ...prev,
          isUploading: false,
          isComplete: true,
          // Ensure processed equals total for completion detection
          processed: prev.total || prev.processed
        }));
      }, 0);
    }
  }, [addDebugInfo, pairedFiles, orphanedSubtitles, movieGuesses, featuresByImdbId, guessItData, getSubtitleLanguage, getUploadEnabled, combinedLanguages]);

  // Handle movie change when user selects a different movie
  const handleMovieChange = async (videoPath, newMovieGuess) => {
    try {
      addDebugInfo(`Updating movie for ${videoPath}: ${newMovieGuess.title} (${newMovieGuess.imdbid})`);
      
      // Update the movie guess immediately (setTimeout removed - debug mode issues fixed)
      setMovieGuess(videoPath, newMovieGuess);
      
      // Fetch new features data for the new IMDb ID
      if (newMovieGuess.imdbid) {
        addDebugInfo(`Fetching features for new IMDb ID: ${newMovieGuess.imdbid}`);
        await fetchFeaturesByImdbId(newMovieGuess.imdbid);
        addDebugInfo(`Features fetched successfully for IMDb ID: ${newMovieGuess.imdbid}`);
      }
      
    } catch (error) {
      addDebugInfo(`Error updating movie: ${error.message}`);
      throw error;
    }
  };

  // Handle file drop with processing
  const handleFileDropComplete = async (event) => {
    try {
      setError(null);
      
      addDebugInfo('🔄 New files dropped - clearing ALL previous state...');
      
      // Clear all hook state completely (this will reset everything)
      clearAllState(); // Movie guesses, features, processing state
      clearAllGuessItState(); // GuessIt data and processing state
      clearAllLanguageState(); // Language detection processing state
      clearSubtitleLanguages(); // Subtitle language selections
      clearHashCheckResults(); // Clear CheckSubHash results
      clearAllVideoMetadata(); // Clear video metadata
      
      // Reset all UI state when new files are dropped
      setUploadResults({}); // Clear previous upload results
      setSubcontentData({}); // Clear previous subcontent data
      setUploadStates({}); // Reset upload enable/disable states
      setUploadOptions({}); // Reset upload options states
      setOpenDropdowns({}); // Close any open dropdowns
      setDropdownSearch({}); // Clear dropdown search states
      setPreviewSubtitle(null); // Close any preview
      setSubtitleContent('');
      
      // Clear processing state tracking
      processedFilesSet.current.clear();
      
      // Force useEffect to re-run by changing the reset key
      setStateResetKey(prev => prev + 1);
      
      addDebugInfo('✅ ALL previous state cleared completely, processing new files...');
      
      // Initialize progress tracking for file discovery
      initializeProgress(0); // Will be updated when files are counted
      updateProgress({ fileDiscovery: 1, fileDiscoveryTotal: 1 });
      
      // Now handle the new files
      await handleDrop(event);
      
      
    } catch (err) {
      setError(err.message);
      addDebugInfo(`Drop error: ${err.message}`);
      // Reset progress on error
      cancelProgress();
    }
  };

  // Process video files when files change
  useEffect(() => {
    if (files.length === 0) {
      // Clear processed files tracking when no files
      processedFilesSet.current.clear();
      return;
    }

    const videoFiles = files.filter(file => file.isVideo && !file.shouldRemove);
    const subtitleFiles = files.filter(file => file.isSubtitle && !file.shouldRemove);

    // Initialize progress tracking with correct totals
    if (files.length > 0 && processingProgress.isProcessing && processingProgress.totalFiles === 0) {
      // Count unique directories from file paths
      const directorySet = new Set();
      files.forEach(file => {
        const directory = file.fullPath.includes('/') ? 
          file.fullPath.substring(0, file.fullPath.lastIndexOf('/')) : 'Root';
        directorySet.add(directory);
      });
      const directoriesCount = directorySet.size;
      
      addDebugInfo(`📊 Initializing progress: ${files.length} files (${videoFiles.length} videos, ${subtitleFiles.length} subtitles) from ${directoriesCount} directories`);
      updateProgress({
        totalFiles: files.length,
        fileDiscovery: 1,
        fileDiscoveryTotal: 1,
        directoriesProcessed: directoriesCount,
        videoProcessingTotal: videoFiles.length,
        subtitleProcessingTotal: subtitleFiles.length,
        languageDetectionTotal: subtitleFiles.length
      });
    }

    addDebugInfo(`🔄 Processing: ${files.length} files (reset: ${stateResetKey})`);
    addDebugInfo(`📁 ${videoFiles.length} videos, ${subtitleFiles.length} subtitles`);
    
    // Log all file paths for debugging
    if (videoFiles.length > 0) {
      addDebugInfo(`🎥 Video files: ${videoFiles.map(f => f.name).join(', ')}`);
    }
    if (subtitleFiles.length > 0) {
      addDebugInfo(`📝 Subtitle files: ${subtitleFiles.map(f => f.name).join(', ')}`);
      
      // Process subtitle files for CheckSubHash
      processSubtitleHashes(subtitleFiles);
    }

    // Process video files for hashes, file info, and movie guessing
    videoFiles.forEach(async (videoFile, index) => {
      const fileId = `${videoFile.fullPath}_${videoFile.size}`;
      
      // Skip if already processed
      if (processedFilesSet.current.has(fileId)) {
        addDebugInfo(`⏭️ Skipping already processed video: ${videoFile.name}`);
        return;
      }
      
      // Mark as processing immediately
      processedFilesSet.current.add(fileId);
      addDebugInfo(`🎬 Starting processing video file: ${videoFile.name}`);
      
      
      try {
        addDebugInfo(`Processing video ${index + 1}/${videoFiles.length}: ${videoFile.name}`);
        
        // Add file type info immediately
        const fileInfo = detectVideoFileInfo(videoFile.file);
        updateFile(videoFile.fullPath, { 
          file_type: fileInfo.file_type, 
          file_kind: fileInfo.file_kind 
        });
        
        // Calculate movie hash with timeout and retry
        try {
          addDebugInfo(`Starting hash calculation for ${videoFile.name} (${formatFileSize(videoFile.size)})`);
          
          const hash = await MovieHashService.calculateMovieHashWithRetry(videoFile.file, addDebugInfo);
          
          addDebugInfo(`Hash calculated: ${hash}`);
          updateFile(videoFile.fullPath, { movieHash: hash });
          
          // Update video processing progress
          updateProgress(prev => {
            const newVideoProgress = prev.videoProcessing + 1;
            const newProcessedFiles = prev.processedFiles + 1;
            addDebugInfo(`📊 Video progress: ${newVideoProgress}/${prev.videoProcessingTotal}`);
            return {
              videoProcessing: newVideoProgress,
              processedFiles: newProcessedFiles
            };
          });
          
        } catch (hashError) {
          console.error(`Hash calculation error for ${videoFile.name}:`, hashError);
          updateFile(videoFile.fullPath, { movieHash: 'error' });
          addDebugInfo(`Hash calculation failed: ${hashError.message}`);
          
          // Update progress with error
          updateProgress(prev => {
            const newVideoProgress = prev.videoProcessing + 1;
            const newProcessedFiles = prev.processedFiles + 1;
            const newErrors = prev.errors + 1;
            addDebugInfo(`📊 Video progress (error): ${newVideoProgress}/${prev.videoProcessingTotal}`);
            return {
              videoProcessing: newVideoProgress,
              processedFiles: newProcessedFiles,
              errors: newErrors
            };
          });
        }

        // Extract video metadata (FPS, duration, etc.) for upload parameters
        if (isFFmpegLoaded) {
          try {
            addDebugInfo(`🎬 Extracting video metadata for ${videoFile.name}`);
            await extractVideoMetadata(videoFile.file, videoFile.fullPath);
            addDebugInfo(`✅ Video metadata extracted successfully for ${videoFile.name}`);
          } catch (metadataError) {
            console.error(`Video metadata extraction error for ${videoFile.name}:`, metadataError);
            addDebugInfo(`❌ Video metadata extraction failed: ${metadataError.message}`);
          }
        } else {
          addDebugInfo(`⏳ FFmpeg not loaded yet, skipping video metadata extraction for ${videoFile.name}`);
        }

        // Check if movie guess is needed
        const status = getProcessingStatus(videoFile.fullPath);
        if (!status.isProcessing && !status.isComplete && !status.hasFailed) {
          const delay = 1000 + index * 500;
          
          setTimeout(() => {
            const currentStatus = getProcessingStatus(videoFile.fullPath);
            if (!currentStatus.isProcessing && !currentStatus.isComplete) {
              processMovieGuess(videoFile).catch(error => {
                addDebugInfo(`Movie guess failed: ${error.message}`);
              });
            }
          }, delay);
        }

        // GuessIt processing will be handled automatically when movie guess completes
        // via the useEffect that watches movieGuesses changes
        
      } catch (error) {
        addDebugInfo(`Failed to process ${videoFile.name}: ${error.message}`);
        updateFile(videoFile.fullPath, { movieHash: 'error' });
        processedFilesSet.current.delete(fileId);
        
      }
    });

    // Process subtitle files for language detection
    subtitleFiles.forEach(async (subtitleFile, index) => {
      const fileId = `${subtitleFile.fullPath}_${subtitleFile.size}_lang`;
      
      // Skip if already processed
      if (processedFilesSet.current.has(fileId)) {
        addDebugInfo(`⏭️ Skipping already processed subtitle: ${subtitleFile.name}`);
        return;
      }
      
      addDebugInfo(`💬 Starting processing subtitle file: ${subtitleFile.name}`);
      
      // Skip language detection for files that have been pre-classified as non-subtitles
      if (subtitleFile.detectedLanguage && 
          typeof subtitleFile.detectedLanguage === 'object' && 
          subtitleFile.detectedLanguage.file_kind && 
          subtitleFile.detectedLanguage.file_kind === 'Unknown text file') {
        addDebugInfo(`Skipping language detection for ${subtitleFile.name} - already classified as ${subtitleFile.detectedLanguage.file_kind}`);
        return;
      }
      
      // Check if language detection is needed
      const status = getLanguageProcessingStatus(subtitleFile.fullPath);
      if (status.isProcessing || status.hasFailed) {
        return;
      }
      
      // Check if already has language detection result
      if (subtitleFile.detectedLanguage && 
          typeof subtitleFile.detectedLanguage === 'object' && 
          subtitleFile.detectedLanguage.language_code) {
        return;
      }
      
      processedFilesSet.current.add(fileId);
      
      
      const delay = 2000 + index * 500;
      
      setTimeout(() => {
        const currentStatus = getLanguageProcessingStatus(subtitleFile.fullPath);
        if (!currentStatus.isProcessing) {
          processLanguageDetection(subtitleFile).then(() => {
            // Check if file should be removed (detected as non-subtitle)
            const updatedFile = files.find(f => f.fullPath === subtitleFile.fullPath);
            if (updatedFile?.shouldRemove) {
              setFiles(prevFiles => 
                prevFiles.filter(file => file.fullPath !== subtitleFile.fullPath)
              );
              addDebugInfo(`Removed ${subtitleFile.name} - not a subtitle file`);
              
              // Update progress with skipped file
              updateProgress(prev => ({
                subtitleProcessing: prev.subtitleProcessing + 1,
                languageDetection: prev.languageDetection + 1,
                processedFiles: prev.processedFiles + 1,
                skipped: prev.skipped + 1
              }));
            } else {
              // Update progress for successful processing
              updateProgress(prev => {
                addDebugInfo(`📊 Subtitle progress: ${prev.subtitleProcessing + 1}/${prev.subtitleProcessingTotal}`);
                return {
                  subtitleProcessing: prev.subtitleProcessing + 1,
                  languageDetection: prev.languageDetection + 1,
                  processedFiles: prev.processedFiles + 1
                };
              });
            }
            
            // Note: Already marked as processed when processing started
          }).catch(error => {
            addDebugInfo(`Language detection failed: ${error.message}`);
            processedFilesSet.current.delete(fileId);
            
            // Update progress with error
            updateProgress(prev => ({
              subtitleProcessing: prev.subtitleProcessing + 1,
              languageDetection: prev.languageDetection + 1,
              processedFiles: prev.processedFiles + 1,
              errors: prev.errors + 1
            }));
          });
        }
      }, delay);
    });

    // Process orphaned subtitles for movie guessing
    const orphanedSubtitles = subtitleFiles.filter(subtitle => {
      // Check if this subtitle has a matching video file
      const subtitleBaseName = subtitle.name.replace(/\.[^/.]+$/, ''); // Remove extension
      const subtitleDir = subtitle.fullPath.includes('/') ? 
        subtitle.fullPath.substring(0, subtitle.fullPath.lastIndexOf('/')) : 'Root';
      
      // Look for matching video in same directory
      const hasMatchingVideo = videoFiles.some(video => {
        const videoBaseName = video.name.replace(/\.[^/.]+$/, ''); // Remove extension
        const videoDir = video.fullPath.includes('/') ? 
          video.fullPath.substring(0, video.fullPath.lastIndexOf('/')) : 'Root';
        
        return videoDir === subtitleDir && (
          videoBaseName === subtitleBaseName || 
          subtitleBaseName.startsWith(videoBaseName + '.')
        );
      });
      
      return !hasMatchingVideo;
    });

    // Process movie guessing for orphaned subtitles
    orphanedSubtitles.forEach(async (subtitleFile, index) => {
      const fileId = `${subtitleFile.fullPath}_${subtitleFile.size}_movie`;
      
      // Skip if already processed
      if (processedFilesSet.current.has(fileId)) {
        return;
      }
      
      // Check if we can reuse movie identification from a video file in the same directory
      const subtitleDir = subtitleFile.fullPath.includes('/') ? 
        subtitleFile.fullPath.substring(0, subtitleFile.fullPath.lastIndexOf('/')) : 'Root';
      
      // Look for existing movie data from video files in the same directory
      const existingMovieData = Object.entries(movieGuesses).find(([videoPath, movieData]) => {
        if (movieData && typeof movieData === 'object' && movieData.imdbid) {
          const videoDir = videoPath.includes('/') ? 
            videoPath.substring(0, videoPath.lastIndexOf('/')) : 'Root';
          return videoDir === subtitleDir;
        }
        return false;
      });
      
      if (existingMovieData) {
        const [videoPath, movieData] = existingMovieData;
        const videoFileName = videoPath.split('/').pop();
        addDebugInfo(`🔄 Reusing movie identification for orphaned subtitle ${subtitleFile.name} from video ${videoFileName}: ${movieData.title} (${movieData.year})`);
        
        // Set the movie data for this orphaned subtitle
        setMovieGuess(subtitleFile.fullPath, {
          ...movieData,
          reason: `Reused from video: ${videoFileName}`
        });
        
        processedFilesSet.current.add(fileId);
        return;
      }
      
      // Check if movie guess is needed
      const status = getProcessingStatus(subtitleFile.fullPath);
      if (!status.isProcessing && !status.isComplete && !status.hasFailed) {
        processedFilesSet.current.add(fileId);
        
        const delay = 3000 + index * 500; // Start after language detection
        
        setTimeout(() => {
          const currentStatus = getProcessingStatus(subtitleFile.fullPath);
          if (!currentStatus.isProcessing && !currentStatus.isComplete) {
            processSubtitleMovieGuess(subtitleFile).catch(error => {
              addDebugInfo(`Orphaned subtitle movie guess failed: ${error.message}`);
              processedFilesSet.current.delete(fileId);
            });
          }
        }, delay);
      }
    });

    if (orphanedSubtitles.length > 0) {
      addDebugInfo(`📝 Found ${orphanedSubtitles.length} orphaned subtitles - starting movie identification`);
    }

  }, [files.length, stateResetKey, initializeProgress, updateProgress, processingProgress.isProcessing]);



  // Extract GuessIt data from movie guesses when they become available
  useEffect(() => {
    Object.entries(movieGuesses).forEach(([filePath, movieData]) => {
      // Check if this is a valid movie data object
      if (movieData && typeof movieData === 'object' && movieData !== 'guessing' && movieData !== 'error' && movieData !== 'no-match') {
        // Check if we don't already have GuessIt data for this file
        const currentGuessItStatus = getGuessItProcessingStatus(filePath);
        if (!currentGuessItStatus.isComplete && !currentGuessItStatus.isProcessing) {
          // Find the video file for this path
          const videoFile = files.find(f => f.fullPath === filePath && f.isVideo);
          if (videoFile) {
            if (movieData.guessit) {
              // Extract GuessIt data from XML-RPC response
              addDebugInfo(`Extracting GuessIt data from XML-RPC for: ${videoFile.name}`);
              extractGuessItFromMovieData(movieData, filePath, videoFile.name);
            } else {
              // No GuessIt data in XML-RPC response, use fallback API with delay
              addDebugInfo(`No GuessIt data in XML-RPC response for: ${videoFile.name}, using fallback API`);
              setTimeout(() => {
                const stillNeedGuessIt = getGuessItProcessingStatus(filePath);
                if (!stillNeedGuessIt.isComplete && !stillNeedGuessIt.isProcessing) {
                  processGuessIt(videoFile, movieGuesses).catch(error => {
                    addDebugInfo(`GuessIt fallback failed: ${error.message}`);
                  });
                }
              }, 500); // Small delay to avoid race conditions
            }
          }
        }
      }
    });
  }, [movieGuesses, extractGuessItFromMovieData, getGuessItProcessingStatus, processGuessIt, files, addDebugInfo]);

  // Process GuessIt data for orphaned subtitles
  useEffect(() => {
    orphanedSubtitles.forEach(async (subtitleFile) => {
      const filePath = subtitleFile.fullPath;
      const status = getGuessItProcessingStatus(filePath);
      
      // Skip if already processed or processing
      if (status.isComplete || status.isProcessing) {
        return;
      }
      
      try {
        // Get the best name for movie detection (use parent directory for generic names)
        const detectionName = getBestMovieDetectionName(subtitleFile);
        const originalName = subtitleFile.name.replace(/\.[^/.]+$/, ''); // Remove extension
        
        // Log what name we're using for detection
        if (detectionName !== originalName) {
          addDebugInfo(`GuessIt using parent directory "${detectionName}" for generic subtitle "${originalName}"`);
        }
        
        // Create modified subtitle file with detection name (same as movie detection)
        const modifiedSubtitleFile = {
          ...subtitleFile,
          name: detectionName + '.srt', // Add .srt extension for processing
          detectionReason: detectionName !== originalName ? 'parent-directory' : 'filename'
        };
        
        // Process GuessIt data for orphaned subtitle using the same name logic as movie detection
        await processGuessIt(modifiedSubtitleFile, movieGuesses);
        addDebugInfo(`✅ GuessIt processing completed for orphaned subtitle: ${subtitleFile.name} (using: ${detectionName})`);
      } catch (error) {
        addDebugInfo(`❌ GuessIt processing failed for orphaned subtitle ${subtitleFile.name}: ${error.message}`);
      }
    });
  }, [orphanedSubtitles, getGuessItProcessingStatus, processGuessIt, movieGuesses, addDebugInfo]);

  // Handle subtitle preview
  const handleSubtitlePreview = async (subtitle) => {
    try {
      addDebugInfo(`Opening preview for: ${subtitle.name}`);
      setPreviewSubtitle(subtitle);
      
      const text = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(subtitle.file, 'utf-8');
      });
      
      setSubtitleContent(text);
      addDebugInfo(`Loaded ${text.length} characters for preview`);
    } catch (error) {
      addDebugInfo(`Error loading subtitle preview: ${error.message}`);
      setSubtitleContent('Error loading subtitle content.');
    }
  };

  const closeSubtitlePreview = () => {
    setPreviewSubtitle(null);
    setSubtitleContent('');
  };

  // Dropdown management
  const toggleDropdown = (subtitlePath) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [subtitlePath]: !prev[subtitlePath]
    }));
  };

  const handleDropdownSearch = (subtitlePath, searchTerm) => {
    setDropdownSearch(prev => ({
      ...prev,
      [subtitlePath]: searchTerm
    }));
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if any dropdowns are open
      const hasOpenDropdowns = Object.values(openDropdowns).some(isOpen => isOpen);
      if (!hasOpenDropdowns) return;

      // Close all dropdowns if clicking outside
      const isClickInsideDropdown = event.target.closest('[data-dropdown]');
      if (!isClickInsideDropdown) {
        setOpenDropdowns({});
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdowns]);

  // Clear all cache
  const clearAllCache = () => {
    const success = CacheService.clearAllCache();
    if (success) {
      addDebugInfo("All cache cleared from localStorage.");
      // Reset language data
      window.location.reload(); // Simple way to reset all state
    } else {
      addDebugInfo("Error clearing cache.");
    }
  };

  // Clear files and related state
  const handleClearFiles = () => {
    clearFiles();
    clearDebugInfo();
    setError(null);
    setPreviewSubtitle(null);
    setSubtitleContent('');
    setOpenDropdowns({});
    setDropdownSearch({});
    setUploadStates({}); // Clear upload states
    setUploadOptions({}); // Clear upload options
    setUploadResults({}); // Clear upload results
    setSubcontentData({}); // Clear subcontent data
    
    // Clear processing state
    processedFilesSet.current.clear();
    
    // Clear progress state
    cancelProgress();
    
    // Clear CheckSubHash results
    clearHashCheckResults();
    
    // Clear all processing states
    files.forEach(file => {
      clearProcessingState(file.fullPath);
      clearLanguageProcessingState(file.fullPath);
      clearGuessItProcessingState(file.fullPath);
    });
  };

  // Clean up processed files tracking when files are cleared
  useEffect(() => {
    if (files.length === 0) {
      processedFilesSet.current.clear();
    }
  }, [files.length]);

  // Auto-close progress overlay when processing is complete
  useEffect(() => {
    if (processingProgress.isProcessing && 
        processingProgress.processedFiles >= processingProgress.totalFiles && 
        processingProgress.totalFiles > 0) {
      // Check if all stages are complete
      const allStagesComplete = 
        processingProgress.fileDiscovery >= processingProgress.fileDiscoveryTotal &&
        (processingProgress.videoProcessingTotal === 0 || processingProgress.videoProcessing >= processingProgress.videoProcessingTotal) &&
        (processingProgress.subtitleProcessingTotal === 0 || processingProgress.subtitleProcessing >= processingProgress.subtitleProcessingTotal) &&
        (processingProgress.languageDetectionTotal === 0 || processingProgress.languageDetection >= processingProgress.languageDetectionTotal);
      
      if (allStagesComplete) {
        // Add a small delay to show completion, then close
        setTimeout(() => {
          finalizeProgress();
        }, 1500);
      }
    }
  }, [
    processingProgress.processedFiles, 
    processingProgress.totalFiles, 
    processingProgress.isProcessing,
    processingProgress.fileDiscovery,
    processingProgress.fileDiscoveryTotal,
    processingProgress.videoProcessing,
    processingProgress.videoProcessingTotal,
    processingProgress.subtitleProcessing,
    processingProgress.subtitleProcessingTotal,
    processingProgress.languageDetection,
    processingProgress.languageDetectionTotal,
    finalizeProgress
  ]);

  // Apply global comment to new subtitles when files change
  useEffect(() => {
    if (config.globalComment && (pairedFiles.length > 0 || orphanedSubtitles.length > 0)) {
      // Small delay to ensure files are processed first
      setTimeout(() => {
        applyGlobalCommentToAllSubtitles(config.globalComment);
      }, 100);
    }
  }, [pairedFiles.length, orphanedSubtitles.length, config.globalComment, applyGlobalCommentToAllSubtitles]);


  // Filter successful pairs
  const successfulPairs = pairedFiles.filter(pair => pair.video && pair.subtitles.length > 0);
  
  const hasUploadableContent = successfulPairs.length > 0 || orphanedSubtitles.length > 0;

  const hasUnpairedFiles = files.length > 0 && successfulPairs.length === 0;


  return (
    <div className="min-h-screen p-6" style={styles.background}>
      {/* Unified API and Ad Blocker Warning */}
      <ApiHealthCheck onApiBlocked={(reason) => {
        addDebugInfo(`🚫 API blocked by ${reason}: Ad blocker or network issue detected`);
      }} />
      
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="border-b-4 shadow-sm mb-6 p-6" style={{...styles.card, borderBottomColor: colors.success}}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <a 
                href="https://www.opensubtitles.org" 
                target="_blank" 
                rel="noopener noreferrer"
                className="block hover:opacity-80 transition-opacity"
              >
                <img 
                  src={isDark 
                    ? "https://opensubtitles.org/gfx/logotype/opensubtitles_new/opensubtitles_logo_final_white_on_transparent.png"
                    : "https://opensubtitles.org/gfx/logotype/opensubtitles_new/opensubtitles_logo_final_black_on_transparent.png"
                  }
                  alt="OpenSubtitles Logo" 
                  className="h-16 w-auto"
                  onError={(e) => {
                    // Fallback to emoji if image fails to load
                    e.target.style.display = 'none';
                    e.target.nextElementSibling.style.display = 'block';
                  }}
                />
                <div className="text-4xl hidden" style={{display: 'none'}}>🎬</div>
              </a>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-3xl font-bold" style={styles.text}>
                    OpenSubtitles Uploader <span style={styles.link}>PRO</span>
                  </h1>
                  <span 
                    className="px-2 py-1 text-xs font-semibold rounded-full"
                    style={{
                      backgroundColor: colors.success + '20',
                      color: colors.success,
                      border: `1px solid ${colors.success}40`
                    }}
                  >
                    v{APP_VERSION}
                  </span>
                </div>
                <p style={styles.textSecondary}>
                  Professional subtitle contribution tool for{' '}
                  <a 
                    href="https://www.opensubtitles.org" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:underline transition-all"
                    style={styles.link}
                    {...createHoverHandlers(colors, styles.link, styles.linkHover)}
                  >
                    OpenSubtitles.org
                  </a>
                </p>
              </div>
            </div>
            
            {/* User Info and Theme Toggle - Right Side */}
            <div className="flex flex-col items-end gap-1">
              {/* User Info */}
              <div className="flex items-center gap-2 text-sm px-3 py-1" 
                   style={{
                     color: colors.textSecondary
                   }}>
                <span className="text-base">👤</span>
                {userLoading ? (
                  <span>Loading user...</span>
                ) : isLoggedIn() ? (
                  <span>
                    Logged as: <strong style={styles.link}>{getUsername()}</strong>
                  </span>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span>
                      Logged as: <strong style={styles.link}>Anonymous</strong>
                    </span>
                    <a 
                      href="https://www.opensubtitles.org/login" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-3 py-1 rounded-lg transition-all text-xs"
                      style={{
                        backgroundColor: colors.warning,
                        color: 'white',
                        textDecoration: 'none',
                        fontWeight: '500',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = colors.error;
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = colors.warning;
                      }}
                    >
                      🔑 Login Required
                    </a>
                  </div>
                )}
              </div>
              
              {/* Action Buttons Row */}
              <div className="flex items-center gap-2">
                {/* Config Button */}
                <button
                  onClick={handleConfigToggle}
                  className="flex items-center gap-2 px-3 py-1 rounded-lg transition-all text-xs"
                  style={{
                    backgroundColor: isDark ? colors.background : colors.cardBackground,
                    color: colors.textSecondary,
                    border: `1px solid ${colors.border}`
                  }}
                  {...createHoverHandlers(colors, 
                    {
                      backgroundColor: isDark ? colors.background : colors.cardBackground,
                      color: colors.textSecondary,
                      borderColor: colors.border
                    },
                    {
                      backgroundColor: colors.background,
                      color: colors.link,
                      borderColor: colors.link
                    }
                  )}
                  title="Open configuration"
                >
                  <span>⚙️</span>
                  <span>Config</span>
                </button>

                {/* Help Button */}
                <button
                  onClick={handleHelpToggle}
                  className="flex items-center gap-2 px-3 py-1 rounded-lg transition-all text-xs"
                  style={{
                    backgroundColor: isDark ? colors.background : colors.cardBackground,
                    color: colors.textSecondary,
                    border: `1px solid ${colors.border}`
                  }}
                  {...createHoverHandlers(colors, 
                    {
                      backgroundColor: isDark ? colors.background : colors.cardBackground,
                      color: colors.textSecondary,
                      borderColor: colors.border
                    },
                    {
                      backgroundColor: colors.background,
                      color: colors.link,
                      borderColor: colors.link
                    }
                  )}
                  title="Help & Features"
                >
                  <span>❓</span>
                  <span>Help</span>
                </button>
                
                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className="flex items-center gap-2 px-3 py-1 rounded-lg transition-all text-xs"
                  style={{
                    backgroundColor: isDark ? colors.background : colors.cardBackground,
                    color: colors.textSecondary,
                    border: `1px solid ${colors.border}`
                  }}
                  {...createHoverHandlers(colors, 
                    {
                      backgroundColor: isDark ? colors.background : colors.cardBackground,
                      color: colors.textSecondary,
                      borderColor: colors.border
                    },
                    {
                      backgroundColor: colors.background,
                      color: colors.link,
                      borderColor: colors.link
                    }
                  )}
                  title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
                >
                  <span>{isDark ? '☀️' : '🌙'}</span>
                  <span>{isDark ? 'Light' : 'Dark'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Drop Zone */}
        <DropZone
          isDragOver={isDragOver}
          onDrop={handleFileDropComplete}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          browserCapabilities={browserCapabilities}
          hasFiles={files.length > 0}
          onClearFiles={handleClearFiles}
          colors={colors}
          isDark={isDark}
        />

        {/* Error Display */}
        {error && (
          <div className="rounded-lg p-4 mb-6" 
               style={{
                 backgroundColor: colors.cardBackground, 
                 border: `1px solid ${colors.border}`
               }}>
            <p style={{color: colors.error}}>⚠️ {error}</p>
            {(error.includes('blocked') || error.includes('Brave')) && navigator.userAgent.includes('Brave') && (
              <div className="mt-3 p-3 bg-orange-100 border border-orange-300 rounded text-orange-800 text-sm">
                <div className="flex items-center space-x-2 mb-2">
                  <span>🛡️</span>
                  <strong>Brave Browser Detected - Action Required:</strong>
                </div>
                <div className="space-y-1">
                  <p>1. Click the Shield icon (🛡️) in your address bar</p>
                  <p>2. Turn off "Shields" for this site</p>
                  <p>3. Refresh the page</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* File List - Show ungrouped files if no successful pairs and no orphaned subtitles */}
        {hasUnpairedFiles && orphanedSubtitles.length === 0 && (
          <FileList
            files={files}
            movieGuesses={movieGuesses}
            featuresByImdbId={featuresByImdbId}
            featuresLoading={featuresLoading}
            combinedLanguages={combinedLanguages}
            subtitleLanguages={subtitleLanguages}
            openDropdowns={openDropdowns}
            dropdownSearch={dropdownSearch}
            onSubtitleLanguageChange={handleSubtitleLanguageChange}
            onToggleDropdown={toggleDropdown}
            onDropdownSearch={handleDropdownSearch}
            onSubtitlePreview={handleSubtitlePreview}
            getSubtitleLanguage={getSubtitleLanguage}
            getLanguageOptionsForSubtitle={getLanguageOptionsForSubtitle}
            uploadStates={uploadStates}
            onToggleUpload={handleSubtitleUploadToggle}
            getUploadEnabled={getUploadEnabled}
            onMovieChange={handleMovieChange}
            guessItData={guessItData}
            getGuessItProcessingStatus={getGuessItProcessingStatus}
            getFormattedTags={getFormattedTags}
            fetchFeaturesByImdbId={fetchFeaturesByImdbId}
            uploadResults={uploadResults}
            hashCheckResults={hashCheckResults}
            colors={colors}
            isDark={isDark}
          />
        )}

        {/* Matched Pairs */}
        {hasUploadableContent && (
          <MatchedPairs
            pairedFiles={pairedFiles}
            movieGuesses={movieGuesses}
            featuresByImdbId={featuresByImdbId}
            featuresLoading={featuresLoading}
            combinedLanguages={combinedLanguages}
            subtitleLanguages={subtitleLanguages}
            openDropdowns={openDropdowns}
            dropdownSearch={dropdownSearch}
            onSubtitleLanguageChange={handleSubtitleLanguageChange}
            onToggleDropdown={toggleDropdown}
            onDropdownSearch={handleDropdownSearch}
            onSubtitlePreview={handleSubtitlePreview}
            getSubtitleLanguage={getSubtitleLanguage}
            getLanguageOptionsForSubtitle={getLanguageOptionsForSubtitle}
            onMovieChange={handleMovieChange}
            guessItData={guessItData}
            getGuessItProcessingStatus={getGuessItProcessingStatus}
            getFormattedTags={getFormattedTags}
            uploadStates={uploadStates}
            onToggleUpload={handleSubtitleUploadToggle}
            getUploadEnabled={getUploadEnabled}
            fetchFeaturesByImdbId={fetchFeaturesByImdbId}
            uploadResults={uploadResults}
            hashCheckResults={hashCheckResults}
            uploadOptions={uploadOptions}
            onUpdateUploadOptions={handleUploadOptionsUpdate}
            config={config}
            colors={colors}
            isDark={isDark}
            getVideoMetadata={getVideoMetadata}
            isMetadataLoading={isMetadataLoading}
            getMetadataError={getMetadataError}
          />
        )}

        {/* Orphaned Subtitles */}
        {orphanedSubtitles.length > 0 && (
          <OrphanedSubtitles
            orphanedSubtitles={orphanedSubtitles}
            movieGuesses={movieGuesses}
            featuresByImdbId={featuresByImdbId}
            featuresLoading={featuresLoading}
            combinedLanguages={combinedLanguages}
            subtitleLanguages={subtitleLanguages}
            openDropdowns={openDropdowns}
            dropdownSearch={dropdownSearch}
            onSubtitleLanguageChange={handleSubtitleLanguageChange}
            onToggleDropdown={toggleDropdown}
            onDropdownSearch={handleDropdownSearch}
            onSubtitlePreview={handleSubtitlePreview}
            getSubtitleLanguage={getSubtitleLanguage}
            getLanguageOptionsForSubtitle={getLanguageOptionsForSubtitle}
            uploadStates={uploadStates}
            onToggleUpload={handleSubtitleUploadToggle}
            getUploadEnabled={getUploadEnabled}
            onMovieChange={handleMovieChange}
            guessItData={guessItData}
            getGuessItProcessingStatus={getGuessItProcessingStatus}
            getFormattedTags={getFormattedTags}
            fetchFeaturesByImdbId={fetchFeaturesByImdbId}
            uploadResults={uploadResults}
            uploadOptions={uploadOptions}
            onUpdateUploadOptions={handleUploadOptionsUpdate}
            hashCheckResults={hashCheckResults}
            config={config}
            colors={colors}
            isDark={isDark}
          />
        )}

        {/* Stats Panel */}
        {hasUploadableContent && (
          <StatsPanel
            pairedFiles={pairedFiles}
            files={files}
            orphanedSubtitles={orphanedSubtitles}
            getUploadEnabled={getUploadEnabled}
            colors={colors}
            isDark={isDark}
          />
        )}

        {/* Upload Button - Only show for logged in users */}
        {hasUploadableContent && isLoggedIn() && (
          <div data-upload-results>
          <UploadButton
            pairedFiles={pairedFiles}
            orphanedSubtitles={orphanedSubtitles}
            movieGuesses={movieGuesses}
            featuresByImdbId={featuresByImdbId}
            guessItData={guessItData}
            getSubtitleLanguage={getSubtitleLanguage}
            getUploadEnabled={getUploadEnabled}
            onUpload={handleUpload}
            uploadProgress={uploadProgress}
            hashCheckResults={hashCheckResults}
            hashCheckLoading={hashCheckLoading}
            hashCheckProcessed={hashCheckProcessed}
            getHashCheckSummary={getHashCheckSummary}
            colors={colors}
            isDark={isDark}
          />
          </div>
        )}

        {/* Login Required Message for Anonymous Users */}
        {hasUploadableContent && !isLoggedIn() && (
          <div 
            className="p-8 rounded-xl text-center mt-6"
            style={{
              backgroundColor: colors.cardBackground,
              border: `2px solid ${colors.warning}`,
              boxShadow: `0 8px 32px ${colors.shadow}`,
              background: `linear-gradient(135deg, ${colors.cardBackground} 0%, ${colors.background} 100%)`
            }}
          >
              <div style={{ 
                color: colors.warning, 
                fontSize: '48px', 
                marginBottom: '16px',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
              }}>
                🔑
              </div>
              <div style={{ 
                color: colors.text, 
                fontSize: '24px', 
                fontWeight: '600',
                marginBottom: '12px' 
              }}>
                Login Required to Upload
              </div>
              <div style={{ 
                color: colors.textSecondary, 
                fontSize: '16px',
                marginBottom: '32px',
                maxWidth: '500px',
                margin: '0 auto 32px auto',
                lineHeight: '1.6'
              }}>
                Your subtitle files are ready for upload! Please log in to your OpenSubtitles account to continue with the upload process.
              </div>
              <a 
                href="https://www.opensubtitles.org/login" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-8 py-4 rounded-xl transition-all transform"
                style={{
                  backgroundColor: colors.success,
                  color: 'white',
                  textDecoration: 'none',
                  fontSize: '18px',
                  fontWeight: '600',
                  boxShadow: `0 4px 16px ${colors.shadow}`,
                  border: 'none'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = colors.successHover || colors.primary;
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = `0 8px 24px ${colors.shadow}`;
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = colors.success;
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = `0 4px 16px ${colors.shadow}`;
                }}
              >
                <span style={{ fontSize: '20px' }}>🚀</span>
                Login to OpenSubtitles.org
              </a>
          </div>
        )}

        {/* Subtitle Preview Modal */}
        {previewSubtitle && (
          <SubtitlePreview
            subtitle={previewSubtitle}
            content={subtitleContent}
            onClose={closeSubtitlePreview}
            colors={colors}
            isDark={isDark}
          />
        )}

        {/* Config Overlay */}
        <ConfigOverlay
          isOpen={isConfigOpen}
          onClose={handleConfigClose}
          config={config}
          onConfigChange={handleConfigChange}
          colors={colors}
          isDark={isDark}
        />

        {/* Help Overlay */}
        <HelpOverlay
          isOpen={isHelpOpen}
          onClose={handleHelpClose}
          colors={colors}
          isDark={isDark}
        />

        {/* Progress Overlay */}
        <ProgressOverlay
          isVisible={processingProgress.isProcessing}
          onCancel={cancelProgress}
          progress={processingProgress}
          colors={colors}
          isDark={isDark}
          startTime={processingProgress.startTime}
        />


        {/* Debug Panel */}
        <Suspense fallback={<div className="mt-6 p-4 rounded-lg text-center" style={{backgroundColor: colors.cardBackground, color: colors.textSecondary}}>Loading debug panel...</div>}>
          <DebugPanel
            debugMode={debugMode}
            debugInfo={debugInfo}
            languagesLoading={languagesLoading}
            languagesError={languagesError}
            movieGuesses={movieGuesses}
            featuresByImdbId={featuresByImdbId}
            hashCheckResults={hashCheckResults}
            hashCheckLoading={hashCheckLoading}
            hashCheckProcessed={hashCheckProcessed}
            getHashCheckSummary={getHashCheckSummary}
            toggleDebugMode={toggleDebugMode}
            clearAllCache={clearAllCache}
            colors={colors}
            isDark={isDark}
          />
        </Suspense>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t text-center text-sm" 
             style={{borderTopColor: colors.border, color: colors.textSecondary}}>
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-4">
              <span>
                OpenSubtitles Uploader PRO v{APP_VERSION}
              </span>
              <span className="text-xs opacity-60">•</span>
              <a 
                href="/#/adblock"
                className="hover:underline transition-all flex items-center gap-1"
                style={styles.link}
                {...createHoverHandlers(colors, styles.link, styles.linkHover)}
              >
                <span>🛡️</span>
                Test Connectivity
              </a>
              <span className="text-xs opacity-60">•</span>
              <a 
                href="https://github.com/opensubtitles/opensubtitles-uploader-pro" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:underline transition-all flex items-center gap-1"
                style={styles.link}
                {...createHoverHandlers(colors, styles.link, styles.linkHover)}
              >
                <span>📦</span>
                GitHub Repository
              </a>
            </div>
            <p className="text-xs opacity-75">
              Built with ❤️ for the OpenSubtitles community
            </p>
          </div>
        </div>
      </div>
      
      

      {/* Test Mode Panel - Only shows in development */}
      <TestModePanel 
        files={files} 
        pairedFiles={pairedFiles} 
        onStartTestCase={(description) => {
          addDebugInfo(`🧪 Started test case: ${description}`);
        }}
      />
    </div>
  );
}

// Main component wrapped with theme provider
export default function SubtitleUploader() {
  return (
    <ThemeProvider>
      <SubtitleUploaderInner />
    </ThemeProvider>
  );
}