import { XmlRpcService } from './api/xmlrpc.js';
import { SubtitleHashService } from './subtitleHash.js';

/**
 * Service for uploading subtitles to OpenSubtitles
 */
export class SubtitleUploadService {
  
  /**
   * Process upload for all selected subtitles
   * @param {Object} validationResult - Validation result from UploadButton
   * @param {Array} pairedFiles - Array of paired video/subtitle files
   * @param {Object} movieGuesses - Movie identification data
   * @param {Object} featuresByImdbId - Features data by IMDb ID
   * @param {Object} guessItData - GuessIt metadata
   * @param {Function} getSubtitleLanguage - Function to get subtitle language
   * @param {Function} getUploadEnabled - Function to check if upload is enabled
   * @param {Object} combinedLanguages - Combined language data
   * @param {Function} addDebugInfo - Debug callback
   * @returns {Promise<Object>} - Upload results
   */
  static async processUpload({
    validationResult,
    pairedFiles,
    orphanedSubtitles = [],
    movieGuesses,
    featuresByImdbId,
    guessItData,
    getSubtitleLanguage,
    getUploadEnabled,
    uploadOptions,
    combinedLanguages,
    addDebugInfo,
    onProgress,
    getVideoMetadata // Add video metadata getter
  }) {
    const results = {
      success: [],
      errors: [],
      totalSubtitles: 0,
      processedSubtitles: 0,
      successful: 0,
      alreadyExists: 0,
      failed: 0,
      detailedResults: []
    };

    addDebugInfo('🚀 Starting subtitle upload process...');

    try {
      // Group enabled subtitles by video file
      const videoGroups = new Map();
      pairedFiles.forEach(pair => {
        if (pair.video && pair.subtitles.length > 0) {
          const enabledSubtitles = pair.subtitles.filter(subtitle => getUploadEnabled(subtitle.fullPath));
          if (enabledSubtitles.length > 0) {
            videoGroups.set(pair.video.fullPath, {
              video: pair.video,
              subtitles: enabledSubtitles,
              movieData: movieGuesses[pair.video.fullPath]
            });
          }
        }
      });

      // Handle orphaned subtitles
      const enabledOrphanedSubtitles = orphanedSubtitles.filter(subtitle => getUploadEnabled(subtitle.fullPath));
      
      results.totalSubtitles = Array.from(videoGroups.values()).reduce((sum, group) => sum + group.subtitles.length, 0) + enabledOrphanedSubtitles.length;
      addDebugInfo(`📊 Found ${results.totalSubtitles} subtitles to upload across ${videoGroups.size} video files + ${enabledOrphanedSubtitles.length} orphaned subtitles`);

      // Process each video group
      for (const [videoPath, { video, subtitles, movieData }] of videoGroups) {
        addDebugInfo(`🎬 Processing video: ${video.name}`);
        
        try {
          // Process each subtitle individually (using cd1 for each)
          const subtitleResults = [];
          
          for (const subtitle of subtitles) {
            addDebugInfo(`📤 Attempting upload for subtitle: ${subtitle.name}`);
            
            const uploadData = await this.prepareUploadDataForSingleSubtitle({
              video,
              subtitle,
              movieData,
              guessItData,
              featuresByImdbId,
              getSubtitleLanguage,
              uploadOptions,
              combinedLanguages,
              addDebugInfo,
              getVideoMetadata
            });

            const tryUploadResponse = await XmlRpcService.tryUploadSubtitles(uploadData);
            
            addDebugInfo(`✅ TryUpload response received for ${subtitle.name}:`);
            addDebugInfo(JSON.stringify(tryUploadResponse, null, 2));
            
            let finalResponse = tryUploadResponse;
            let actualUploadData = null;
            let actualUploadResponse = null;
            
            // If alreadyindb=0, need to do actual upload with UploadSubtitles
            if (tryUploadResponse.alreadyindb === 0 || tryUploadResponse.alreadyindb === '0') {
              addDebugInfo(`📤 Subtitle not in database, proceeding with UploadSubtitles for ${subtitle.name}`);
              
              actualUploadData = await this.prepareActualUploadData({
                video,
                subtitle,
                movieData,
                guessItData,
                featuresByImdbId,
                getSubtitleLanguage,
                uploadOptions,
                combinedLanguages,
                addDebugInfo,
                getVideoMetadata
              });
              
              actualUploadResponse = await XmlRpcService.uploadSubtitles(actualUploadData);
              
              addDebugInfo(`✅ UploadSubtitles response received for ${subtitle.name}:`);
              addDebugInfo(JSON.stringify(actualUploadResponse, null, 2));
              
              finalResponse = actualUploadResponse;
            } else {
              addDebugInfo(`✅ Subtitle already in database for ${subtitle.name} (alreadyindb=${tryUploadResponse.alreadyindb})`);
            }
            
            subtitleResults.push({
              subtitle: subtitle.name,
              subtitlePath: subtitle.fullPath,
              response: finalResponse,
              // Include the exact subcontent that was sent for debugging (only if actual upload happened)
              subcontent: actualUploadData ? actualUploadData.subcontent : null
            });
            
            results.processedSubtitles++;
            
            // Analyze result and update counters
            const response = finalResponse;
            let status = 'unknown';
            let message = 'Upload completed';
            let url = null;
            
            if (response.status && response.status !== '200 OK') {
              status = 'failed';
              message = `Upload failed - ${response.status}`;
              results.failed++;
            } else if (response.alreadyindb === 1 || response.alreadyindb === '1') {
              status = 'exists';
              message = 'Already in database';
              results.alreadyExists++;
              url = typeof response.data === 'string' && response.data.startsWith('http') ? response.data : null;
            } else if (response.status === '200 OK' && response.data && !response.alreadyindb) {
              status = 'success';
              message = 'Successfully uploaded as new subtitle';
              results.successful++;
              url = typeof response.data === 'string' && response.data.startsWith('http') ? response.data : null;
            } else {
              // Handle other cases
              results.successful++;
              status = 'success';
              message = 'Upload completed';
            }
            
            // Add to detailed results
            results.detailedResults.push({
              filename: subtitle.name,
              status,
              message,
              url
            });
            
            // Update progress with detailed information
            if (onProgress) {
              onProgress(results.processedSubtitles, results.totalSubtitles, {
                currentSubtitle: subtitle.name,
                successful: results.successful,
                alreadyExists: results.alreadyExists,
                failed: results.failed,
                results: results.detailedResults
              });
            }
          }
          
          results.success.push({
            video: video.name,
            subtitles: subtitles.length,
            results: subtitleResults
          });
          
        } catch (error) {
          addDebugInfo(`❌ Upload failed for ${video.name}: ${error.message}`);
          results.errors.push({
            video: video.name,
            subtitles: subtitles.length,
            error: error.message,
            stack: error.stack
          });
          
          // Update progress for each failed subtitle in this video
          subtitles.forEach(subtitle => {
            results.processedSubtitles++;
            results.failed++;
            
            // Add to detailed results
            results.detailedResults.push({
              filename: subtitle.name,
              status: 'failed',
              message: `Upload failed: ${error.message}`,
              url: null
            });
            
            // Update progress with detailed information
            if (onProgress) {
              onProgress(results.processedSubtitles, results.totalSubtitles, {
                currentSubtitle: subtitle.name,
                successful: results.successful,
                alreadyExists: results.alreadyExists,
                failed: results.failed,
                results: results.detailedResults
              });
            }
          });
        }
      }

      // Process orphaned subtitles
      for (const subtitle of enabledOrphanedSubtitles) {
        addDebugInfo(`📝 Processing orphaned subtitle: ${subtitle.name}`);
        
        try {
          const movieData = movieGuesses[subtitle.fullPath];
          
          if (!movieData || movieData === 'guessing' || movieData === 'error' || movieData === 'no-match') {
            throw new Error(`Subtitle movie not identified for orphaned subtitle: ${subtitle.name}`);
          }

          addDebugInfo(`📤 Attempting upload for orphaned subtitle: ${subtitle.name}`);
          
          const uploadData = await this.prepareUploadDataForOrphanedSubtitle({
            subtitle,
            movieData,
            guessItData,
            featuresByImdbId,
            getSubtitleLanguage,
            uploadOptions,
            combinedLanguages,
            addDebugInfo
          });

          const tryUploadResponse = await XmlRpcService.tryUploadSubtitles(uploadData);
          
          addDebugInfo(`✅ TryUpload response received for ${subtitle.name}:`);
          addDebugInfo(JSON.stringify(tryUploadResponse, null, 2));
          
          let finalResponse = tryUploadResponse;
          let actualUploadData = null;
          let actualUploadResponse = null;
          
          // If alreadyindb=0, need to do actual upload with UploadSubtitles
          if (tryUploadResponse.alreadyindb === 0 || tryUploadResponse.alreadyindb === '0') {
            addDebugInfo(`📤 Orphaned subtitle not in database, proceeding with UploadSubtitles for ${subtitle.name}`);
            
            actualUploadData = await this.prepareActualUploadDataForOrphanedSubtitle({
              subtitle,
              movieData,
              guessItData,
              featuresByImdbId,
              getSubtitleLanguage,
              uploadOptions,
              combinedLanguages,
              addDebugInfo
            });
            
            actualUploadResponse = await XmlRpcService.uploadSubtitles(actualUploadData);
            
            addDebugInfo(`✅ UploadSubtitles response received for ${subtitle.name}:`);
            addDebugInfo(JSON.stringify(actualUploadResponse, null, 2));
            
            finalResponse = actualUploadResponse;
          } else {
            addDebugInfo(`✅ Orphaned subtitle already in database for ${subtitle.name} (alreadyindb=${tryUploadResponse.alreadyindb})`);
          }
          
          results.success.push({
            video: `Orphaned: ${subtitle.name}`,
            subtitles: 1,
            results: [{
              subtitle: subtitle.name,
              subtitlePath: subtitle.fullPath,
              response: finalResponse,
              subcontent: actualUploadData ? actualUploadData.subcontent : null
            }]
          });
          
          results.processedSubtitles++;
          
          // Analyze result and update counters
          const response = finalResponse;
          let status = 'unknown';
          let message = 'Upload completed';
          let url = null;
          
          if (response.status && response.status !== '200 OK') {
            status = 'failed';
            message = `Upload failed - ${response.status}`;
            results.failed++;
          } else if (response.alreadyindb === 1 || response.alreadyindb === '1') {
            status = 'exists';
            message = 'Already in database';
            results.alreadyExists++;
            url = typeof response.data === 'string' && response.data.startsWith('http') ? response.data : null;
          } else if (response.status === '200 OK' && response.data && !response.alreadyindb) {
            status = 'success';
            message = 'Successfully uploaded as new subtitle';
            results.successful++;
            url = typeof response.data === 'string' && response.data.startsWith('http') ? response.data : null;
          } else {
            // Handle other cases
            results.successful++;
            status = 'success';
            message = 'Upload completed';
          }
          
          // Add to detailed results
          results.detailedResults.push({
            filename: subtitle.name,
            status,
            message,
            url
          });
          
          // Update progress with detailed information
          if (onProgress) {
            onProgress(results.processedSubtitles, results.totalSubtitles, {
              currentSubtitle: subtitle.name,
              successful: results.successful,
              alreadyExists: results.alreadyExists,
              failed: results.failed,
              results: results.detailedResults
            });
          }
          
        } catch (error) {
          addDebugInfo(`❌ Upload failed for orphaned subtitle ${subtitle.name}: ${error.message}`);
          results.errors.push({
            video: `Orphaned: ${subtitle.name}`,
            subtitles: 1,
            error: error.message,
            stack: error.stack
          });
          
          results.processedSubtitles++;
          results.failed++;
          
          // Add to detailed results
          results.detailedResults.push({
            filename: subtitle.name,
            status: 'failed',
            message: `Upload failed: ${error.message}`,
            url: null
          });
          
          // Update progress with detailed information
          if (onProgress) {
            onProgress(results.processedSubtitles, results.totalSubtitles, {
              currentSubtitle: subtitle.name,
              successful: results.successful,
              alreadyExists: results.alreadyExists,
              failed: results.failed,
              results: results.detailedResults
            });
          }
        }
      }

      const successRate = results.totalSubtitles > 0 ? (results.processedSubtitles / results.totalSubtitles * 100).toFixed(1) : 0;
      addDebugInfo(`🎯 Upload completed: ${results.processedSubtitles}/${results.totalSubtitles} subtitles (${successRate}% success rate)`);
      
      return results;
      
    } catch (error) {
      addDebugInfo(`💥 Upload process failed: ${error.message}`);
      results.errors.push({
        error: 'Upload process failed',
        message: error.message,
        stack: error.stack
      });
      return results;
    }
  }

  /**
   * Prepare upload data for a single subtitle (using cd1)
   * @param {Object} params - Parameters object
   * @returns {Promise<Object>} - Upload data structure
   */
  static async prepareUploadDataForSingleSubtitle({
    video,
    subtitle,
    movieData,
    guessItData,
    featuresByImdbId,
    getSubtitleLanguage,
    uploadOptions,
    combinedLanguages,
    addDebugInfo,
    getVideoMetadata
  }) {
    // Get the best movie data (episode-specific if available)
    const bestMovieData = this.getBestMovieData(video.fullPath, movieData, featuresByImdbId, guessItData);
    const uploadImdbId = bestMovieData?.kind === 'episode' && bestMovieData.imdbid 
      ? bestMovieData.imdbid 
      : movieData.imdbid;

    addDebugInfo(`🎭 Using IMDb ID for upload: ${uploadImdbId} (${bestMovieData?.kind || 'movie'})`);
    addDebugInfo(`📝 Processing subtitle: ${subtitle.name}`);
    
    try {
      // Calculate MD5 hash of subtitle file
      const subtitleInfo = await SubtitleHashService.readAndHashSubtitleFile(subtitle.file);
      
      // Validate required fields
      if (!video.movieHash || video.movieHash === 'error') {
        throw new Error(`Movie hash not available for video: ${video.name}`);
      }

      const subtitleEntry = {
        subhash: subtitleInfo.hash,           // MD5 hash of subtitle file content
        subfilename: subtitle.name,
        moviehash: video.movieHash,           // Movie hash from video file
        moviebytesize: video.size.toString(),
        moviefilename: video.name,
        idmovieimdb: uploadImdbId
      };
      
      addDebugInfo(`✅ Prepared subtitle data for: ${subtitle.name}`);
      addDebugInfo(`   - Movie hash: ${video.movieHash}`);
      addDebugInfo(`   - IMDb ID: ${uploadImdbId}`);
      
      return {
        subtitles: [subtitleEntry] // Always single subtitle in cd1
      };
      
    } catch (error) {
      addDebugInfo(`❌ Failed to prepare subtitle ${subtitle.name}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Prepare upload data for actual UploadSubtitles (when alreadyindb=0)
   * @param {Object} params - Parameters object
   * @returns {Promise<Object>} - Upload data structure with baseinfo and cd1
   */
  static async prepareActualUploadData({
    video,
    subtitle,
    movieData,
    guessItData,
    featuresByImdbId,
    getSubtitleLanguage,
    uploadOptions,
    combinedLanguages,
    addDebugInfo,
    getVideoMetadata
  }) {
    // Get the best movie data (episode-specific if available)
    const bestMovieData = this.getBestMovieData(video.fullPath, movieData, featuresByImdbId, guessItData);
    const uploadImdbId = bestMovieData?.kind === 'episode' && bestMovieData.imdbid 
      ? bestMovieData.imdbid 
      : movieData.imdbid;

    addDebugInfo(`🎭 Using IMDb ID for actual upload: ${uploadImdbId} (${bestMovieData?.kind || 'movie'})`);
    addDebugInfo(`📝 Processing subtitle for actual upload: ${subtitle.name}`);
    
    try {
      // Read subtitle file with content for UploadSubtitles
      const subtitleInfo = await SubtitleHashService.readAndHashSubtitleFile(subtitle.file, true);
      
      // Get language ID
      const languageCode = getSubtitleLanguage(subtitle);
      const languageId = SubtitleHashService.getLanguageId(languageCode, combinedLanguages);
      
      if (!languageId) {
        throw new Error(`No valid language ID found for subtitle: ${subtitle.name}`);
      }
      
      // Validate required fields
      if (!video.movieHash || video.movieHash === 'error') {
        throw new Error(`Movie hash not available for video: ${video.name}`);
      }

      // Get subtitle-specific upload options
      const subtitleOptions = uploadOptions?.[subtitle.fullPath] || {};
      
      // DEBUG: Log upload options to verify they are being passed through
      addDebugInfo(`🔍 DEBUG Upload Options for ${subtitle.name}:`);
      addDebugInfo(`   - uploadOptions object keys: ${Object.keys(uploadOptions || {}).join(', ')}`);
      addDebugInfo(`   - subtitle path: ${subtitle.fullPath}`);
      addDebugInfo(`   - subtitleOptions: ${JSON.stringify(subtitleOptions, null, 2)}`);
      if (subtitleOptions.movieaka) addDebugInfo(`   - movieaka: "${subtitleOptions.movieaka}"`);
      if (subtitleOptions.moviereleasename) addDebugInfo(`   - moviereleasename: "${subtitleOptions.moviereleasename}"`);
      if (subtitleOptions.subauthorcomment) addDebugInfo(`   - subauthorcomment: "${subtitleOptions.subauthorcomment}"`);
      if (subtitleOptions.subtranslator) addDebugInfo(`   - subtranslator: "${subtitleOptions.subtranslator}"`);
      
      // Prepare baseinfo section
      const baseinfo = {
        idmovieimdb: uploadImdbId,
        moviereleasename: subtitleOptions.moviereleasename || video.name.replace(/\.(mkv|mp4|avi|mov|wmv|flv|webm)$/i, ''), // Use custom release name or video name
        movieaka: subtitleOptions.movieaka || '', // Movie title in subtitle language
        sublanguageid: languageId,
        subauthorcomment: subtitleOptions.subauthorcomment || '',
        hearingimpaired: subtitleOptions.hearingimpaired || '0',
        highdefinition: subtitleOptions.highdefinition || (video.name.toLowerCase().includes('1080p') || video.name.toLowerCase().includes('2160p') ? '1' : '0'),
        automatictranslation: subtitleOptions.automatictranslation || '0',
        subtranslator: subtitleOptions.subtranslator || '',
        foreignpartsonly: subtitleOptions.foreignpartsonly || '0'
      };

      // Get video metadata for upload parameters
      const videoMetadata = getVideoMetadata ? getVideoMetadata(video.fullPath) : null;
      
      // Prepare cd1 section
      const cd1 = {
        subhash: subtitleInfo.hash, // Use same hash as TryUploadSubtitles (MD5 of original content)
        subfilename: subtitle.name,
        moviehash: video.movieHash,
        moviebytesize: video.size.toString(),
        moviefilename: video.name,
        subcontent: subtitleInfo.contentGzipBase64,
        
        // Add video metadata parameters for OpenSubtitles API
        ...(videoMetadata && {
          movietimems: videoMetadata.movietimems?.toString(),
          moviefps: videoMetadata.moviefps?.toString(),
          movieframes: videoMetadata.movieframes?.toString()
        })
      };
      
      addDebugInfo(`✅ Prepared actual upload data for: ${subtitle.name}`);
      addDebugInfo(`   - Language: ${languageId}`);
      addDebugInfo(`   - Movie hash: ${video.movieHash}`);
      addDebugInfo(`   - IMDb ID: ${uploadImdbId}`);
      addDebugInfo(`   - HD: ${baseinfo.highdefinition}`);
      addDebugInfo(`   - Content length: ${subtitleInfo.content.length} chars`);
      addDebugInfo(`   - Compressed content length: ${subtitleInfo.contentGzipBase64.length} chars (base64)`);
      
      // Log video metadata if available
      if (videoMetadata) {
        addDebugInfo(`   - Video metadata:`);
        addDebugInfo(`     * FPS: ${videoMetadata.moviefps}`);
        addDebugInfo(`     * Duration: ${videoMetadata.durationFormatted} (${videoMetadata.movietimems}ms)`);
        addDebugInfo(`     * Frames: ${videoMetadata.movieframes}`);
      } else {
        addDebugInfo(`   - Video metadata: not available`);
      }
      
      // DEBUG: Verify compression round-trip for this specific upload
      try {
        const debugResult = SubtitleHashService.debugCompressedContent(subtitleInfo.contentGzipBase64, subtitleInfo.content);
        addDebugInfo(`   - DEBUG Round-trip verification:`);
        addDebugInfo(`     * Content match: ${debugResult.contentMatch}`);
        addDebugInfo(`     * Hash match: ${debugResult.hashMatch}`);
        addDebugInfo(`     * Original hash: ${debugResult.originalHash}`);
        addDebugInfo(`     * Decompressed hash: ${debugResult.decompressedHash}`);
        if (debugResult.error) {
          addDebugInfo(`     * ERROR: ${debugResult.error}`);
        }
      } catch (debugError) {
        addDebugInfo(`   - DEBUG verification failed: ${debugError.message}`);
      }
      
      return {
        baseinfo,
        cd1,
        // Return the exact subcontent data for debugging/download purposes
        subcontent: subtitleInfo.contentGzipBase64
      };
      
    } catch (error) {
      addDebugInfo(`❌ Failed to prepare actual upload data for ${subtitle.name}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Prepare upload data for orphaned subtitle (using only subtitle hash, no video)
   * @param {Object} params - Parameters object
   * @returns {Promise<Object>} - Upload data structure
   */
  static async prepareUploadDataForOrphanedSubtitle({
    subtitle,
    movieData,
    guessItData,
    featuresByImdbId,
    getSubtitleLanguage,
    uploadOptions,
    combinedLanguages,
    addDebugInfo
  }) {
    // Get the best movie data (episode-specific if available)
    const bestMovieData = this.getBestMovieData(subtitle.fullPath, movieData, featuresByImdbId, guessItData);
    const uploadImdbId = bestMovieData?.kind === 'episode' && bestMovieData.imdbid 
      ? bestMovieData.imdbid 
      : movieData.imdbid;

    addDebugInfo(`🎭 Using IMDb ID for orphaned subtitle upload: ${uploadImdbId} (${bestMovieData?.kind || 'movie'})`);
    addDebugInfo(`📝 Processing orphaned subtitle: ${subtitle.name}`);
    
    try {
      // Calculate MD5 hash of subtitle file
      const subtitleInfo = await SubtitleHashService.readAndHashSubtitleFile(subtitle.file);
      
      const subtitleEntry = {
        subhash: subtitleInfo.hash,           // MD5 hash of subtitle file content
        subfilename: subtitle.name
        // For orphaned subtitles, we don't include movie fields or idmovieimdb in TryUploadSubtitles
        // moviehash, moviebytesize, moviefilename, and idmovieimdb are not sent
      };
      
      addDebugInfo(`✅ Prepared orphaned subtitle data for: ${subtitle.name}`);
      addDebugInfo(`   - No movie fields included (orphaned subtitle for TryUploadSubtitles)`);
      addDebugInfo(`   - IMDb ID will be used later in UploadSubtitles: ${uploadImdbId}`);
      
      return {
        subtitles: [subtitleEntry] // Always single subtitle
      };
      
    } catch (error) {
      addDebugInfo(`❌ Failed to prepare orphaned subtitle ${subtitle.name}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Prepare upload data for actual UploadSubtitles for orphaned subtitle (when alreadyindb=0)
   * @param {Object} params - Parameters object
   * @returns {Promise<Object>} - Upload data structure with baseinfo and cd1
   */
  static async prepareActualUploadDataForOrphanedSubtitle({
    subtitle,
    movieData,
    guessItData,
    featuresByImdbId,
    getSubtitleLanguage,
    uploadOptions,
    combinedLanguages,
    addDebugInfo
  }) {
    // Get the best movie data (episode-specific if available)
    const bestMovieData = this.getBestMovieData(subtitle.fullPath, movieData, featuresByImdbId, guessItData);
    const uploadImdbId = bestMovieData?.kind === 'episode' && bestMovieData.imdbid 
      ? bestMovieData.imdbid 
      : movieData.imdbid;

    addDebugInfo(`🎭 Using IMDb ID for orphaned subtitle actual upload: ${uploadImdbId} (${bestMovieData?.kind || 'movie'})`);
    addDebugInfo(`📝 Processing orphaned subtitle for actual upload: ${subtitle.name}`);
    
    try {
      // Read subtitle file with content for UploadSubtitles
      const subtitleInfo = await SubtitleHashService.readAndHashSubtitleFile(subtitle.file, true);
      
      // Get language ID
      const languageCode = getSubtitleLanguage(subtitle);
      const languageId = SubtitleHashService.getLanguageId(languageCode, combinedLanguages);
      
      if (!languageId) {
        throw new Error(`No valid language ID found for orphaned subtitle: ${subtitle.name}`);
      }
      
      // Get subtitle-specific upload options
      const subtitleOptions = uploadOptions?.[subtitle.fullPath] || {};
      
      // DEBUG: Log upload options to verify they are being passed through
      addDebugInfo(`🔍 DEBUG Upload Options for ${subtitle.name}:`);
      addDebugInfo(`   - uploadOptions object keys: ${Object.keys(uploadOptions || {}).join(', ')}`);
      addDebugInfo(`   - subtitle path: ${subtitle.fullPath}`);
      addDebugInfo(`   - subtitleOptions: ${JSON.stringify(subtitleOptions, null, 2)}`);
      if (subtitleOptions.movieaka) addDebugInfo(`   - movieaka: "${subtitleOptions.movieaka}"`);
      if (subtitleOptions.moviereleasename) addDebugInfo(`   - moviereleasename: "${subtitleOptions.moviereleasename}"`);
      if (subtitleOptions.subauthorcomment) addDebugInfo(`   - subauthorcomment: "${subtitleOptions.subauthorcomment}"`);
      if (subtitleOptions.subtranslator) addDebugInfo(`   - subtranslator: "${subtitleOptions.subtranslator}"`);
      
      // Prepare baseinfo section (only include fields we can determine for orphaned subtitles)
      const baseinfo = {
        idmovieimdb: uploadImdbId,
        moviereleasename: subtitleOptions.moviereleasename || subtitle.name.replace(/\.(srt|sub|ass|ssa|vtt)$/i, ''), // Use custom release name or subtitle name
        movieaka: subtitleOptions.movieaka || '', // Movie title in subtitle language
        sublanguageid: languageId,
        subauthorcomment: subtitleOptions.subauthorcomment || '',
        hearingimpaired: subtitleOptions.hearingimpaired || '0',
        automatictranslation: subtitleOptions.automatictranslation || '0',
        subtranslator: subtitleOptions.subtranslator || '',
        foreignpartsonly: subtitleOptions.foreignpartsonly || '0'
        // highdefinition omitted - unknown for orphaned subtitles unless specified
      };
      
      // Add highdefinition if specified in upload options
      if (subtitleOptions.highdefinition) {
        baseinfo.highdefinition = subtitleOptions.highdefinition;
      }

      // Prepare cd1 section (no movie file data for orphaned subtitles)
      const cd1 = {
        subhash: subtitleInfo.hash, // Use same hash as TryUploadSubtitles (MD5 of original content)
        subfilename: subtitle.name,
        subcontent: subtitleInfo.contentGzipBase64
        // No movie data included for orphaned subtitles (moviehash, moviebytesize, moviefilename)
      };
      
      addDebugInfo(`✅ Prepared actual upload data for orphaned subtitle: ${subtitle.name}`);
      addDebugInfo(`   - Language: ${languageId}`);
      addDebugInfo(`   - IMDb ID: ${uploadImdbId}`);
      addDebugInfo(`   - HD field omitted (unknown for orphaned subtitle)`);
      addDebugInfo(`   - Content length: ${subtitleInfo.content.length} chars`);
      addDebugInfo(`   - Compressed content length: ${subtitleInfo.contentGzipBase64.length} chars (base64)`);
      addDebugInfo(`   - No movie fields in cd1 (orphaned subtitle)`);
      
      // DEBUG: Verify compression round-trip for this specific upload
      try {
        const debugResult = SubtitleHashService.debugCompressedContent(subtitleInfo.contentGzipBase64, subtitleInfo.content);
        addDebugInfo(`   - DEBUG Round-trip verification:`);
        addDebugInfo(`     * Content match: ${debugResult.contentMatch}`);
        addDebugInfo(`     * Hash match: ${debugResult.hashMatch}`);
        addDebugInfo(`     * Original hash: ${debugResult.originalHash}`);
        addDebugInfo(`     * Decompressed hash: ${debugResult.decompressedHash}`);
        if (debugResult.error) {
          addDebugInfo(`     * ERROR: ${debugResult.error}`);
        }
      } catch (debugError) {
        addDebugInfo(`   - DEBUG verification failed: ${debugError.message}`);
      }
      
      return {
        baseinfo,
        cd1,
        // Return the exact subcontent data for debugging/download purposes
        subcontent: subtitleInfo.contentGzipBase64
      };
      
    } catch (error) {
      addDebugInfo(`❌ Failed to prepare actual upload data for orphaned subtitle ${subtitle.name}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get the best movie data (episode-specific if available, otherwise main show)
   * @param {string} videoPath - Path to video file
   * @param {Object} movieData - Original movie data
   * @param {Object} featuresByImdbId - Features data by IMDb ID
   * @param {Object} guessItData - GuessIt data
   * @returns {Object} - Best movie data
   */
  static getBestMovieData(videoPath, movieData, featuresByImdbId, guessItData) {
    const featuresData = movieData?.imdbid ? featuresByImdbId[movieData.imdbid] : null;
    const guessItVideoData = guessItData[videoPath];

    // Try to find episode match if we have GuessIt data
    if (movieData && featuresData && guessItVideoData && typeof guessItVideoData === 'object') {
      if (featuresData?.data?.[0]?.attributes?.seasons && guessItVideoData) {
        const attributes = featuresData.data[0].attributes;
        
        if (attributes.feature_type === 'Tvshow' && guessItVideoData.season && guessItVideoData.episode) {
          const seasonNumber = parseInt(guessItVideoData.season);
          const episodeNumber = parseInt(guessItVideoData.episode);

          if (!isNaN(seasonNumber) && !isNaN(episodeNumber)) {
            const season = attributes.seasons.find(s => s.season_number === seasonNumber);
            if (season?.episodes) {
              const episode = season.episodes.find(e => e.episode_number === episodeNumber);
              if (episode) {
                return {
                  imdbid: episode.feature_imdb_id?.toString(),
                  title: `${attributes.title} - S${seasonNumber.toString().padStart(2, '0')}E${episodeNumber.toString().padStart(2, '0')} - ${episode.title}`,
                  year: attributes.year,
                  kind: 'episode',
                  season: seasonNumber,
                  episode: episodeNumber,
                  episode_title: episode.title,
                  show_title: attributes.title,
                  feature_id: episode.feature_id,
                  reason: 'Episode matched from GuessIt data'
                };
              }
            }
          }
        }
      }
    }

    return movieData;
  }
}