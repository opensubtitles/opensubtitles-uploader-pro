import { isMediaFile, isVideoFile, isSubtitleFile } from '../utils/fileUtils.js';
import { ZipProcessingService } from './zipProcessing.js';
import { mkvSubtitleExtractor } from './mkvSubtitleExtractor.js';

/**
 * File processing service for handling drag and drop files
 */
export class FileProcessingService {
  /**
   * Process a single file or directory entry
   */
  static async processFileHandle(item, output, path = '', config = {}) {
    try {
      let file;
      let entry;
      
      // Handle different item types
      if (item instanceof File) {
        file = item;
      } else if (item.webkitGetAsEntry) {
        entry = item.webkitGetAsEntry();
        
        if (entry && entry.isDirectory) {
          await this.traverseWebkitEntry(entry, path + entry.name + "/", output, config);
          return;
        } else if (entry && entry.isFile) {
          file = await new Promise((resolve, reject) => {
            entry.file(resolve, reject);
          });
        } else {
          return;
        }
      } else if (item.getAsFile) {
        file = item.getAsFile();
      } else {
        return;
      }
      
      if (!file) return;
      
      const fileName = file.name;
      const fileSize = file.size;
      const fileType = file.type;
      const fullPath = path + fileName;
      
      // Check if it's an archive file
      if (ZipProcessingService.isArchiveFile(file)) {
        try {
          // Validate archive file size before processing
          const sizeValidation = ZipProcessingService.validateArchiveSize(file);
          if (!sizeValidation.isValid) {
            console.error(`Archive file size validation failed: ${sizeValidation.error}`);
            return;
          }
          
          const extractedFiles = await ZipProcessingService.processArchiveFile(file);
          output.push(...extractedFiles);
        } catch (error) {
          console.error(`Error processing archive file ${fileName}:`, error);
        }
        return;
      }
      
      const { isVideo, isSubtitle, isMedia, fileKind } = isMediaFile(file);
      
      // Debug MKV detection
      if (file.name.toLowerCase().endsWith('.mkv')) {
        console.log(`🔍 MKV file detected: ${file.name}`);
        console.log(`🔍 File classification: isVideo=${isVideo}, isSubtitle=${isSubtitle}, isMedia=${isMedia}`);
      }
      
      if (isMedia) {
        const fileObj = {
          name: file.name,
          fullPath: fullPath,
          size: file.size,
          type: file.type,
          file: file,
          isVideo: isVideo,
          isSubtitle: isSubtitle,
          movieHash: null,
          detectedLanguage: fileKind ? { file_kind: fileKind } : null, // Set fileKind immediately for non-subtitle files
          recognized: true
        };
        
        output.push(fileObj);

        // Check if this is an MKV file and mark it for subtitle extraction (if enabled)
        if (isVideo && file.name.toLowerCase().endsWith('.mkv')) {
          // Check if MKV extraction is enabled in config (default: false)
          const extractMkvSubtitles = config.extractMkvSubtitles === true;
          
          if (extractMkvSubtitles) {
            // Mark this MKV file for subtitle extraction
            fileObj.hasMkvSubtitleExtraction = true;
            fileObj.mkvExtractionStatus = 'pending';
            
            console.log(`🎬 Detected MKV file: ${file.name}, will detect embedded subtitles...`);
            console.log(`📺 MKV file detected - subtitle detection will start automatically`);
          } else {
            console.log(`⚠️ MKV file ${file.name} detected but extraction is disabled in settings`);
          }
        } else if (file.name.toLowerCase().endsWith('.mkv')) {
          console.log(`⚠️ MKV file ${file.name} not flagged for extraction: isVideo=${isVideo}`);
        }
      }
      
    } catch (error) {
      console.error(`Error processing file: ${error.message}`);
    }
  }

  /**
   * Recursive directory traversal for webkit entries
   */
  static traverseWebkitEntry(entry, path, output, config = {}) {
    return new Promise((resolve) => {
      if (entry.isFile && (isVideoFile(entry.name) || isSubtitleFile(entry.name) || entry.name.toLowerCase().endsWith('.zip'))) {
        entry.file(async (file) => {
          try {
            // Check if it's a ZIP file
            if (ZipProcessingService.isZipFile(file)) {
              // Validate ZIP file size before processing
              const sizeValidation = ZipProcessingService.validateZipSize(file);
              if (!sizeValidation.isValid) {
                console.error(`ZIP file size validation failed: ${sizeValidation.error}`);
                resolve();
                return;
              }
              
              const extractedFiles = await ZipProcessingService.processZipFile(file);
              output.push(...extractedFiles);
              resolve();
              return;
            }
            
            const { isVideo, isSubtitle } = isMediaFile(file);
            
            const fileObj = {
              name: file.name,
              fullPath: path + file.name,
              size: file.size,
              type: file.type,
              file: file,
              isVideo: isVideo,
              isSubtitle: isSubtitle,
              movieHash: null,
              detectedLanguage: null,
              recognized: true
            };
            
            output.push(fileObj);
            resolve();
          } catch (error) {
            console.error(`Error processing file ${entry.name}:`, error);
            resolve();
          }
        }, (error) => {
          console.error(`Error reading file ${entry.name}:`, error);
          resolve();
        });
      } else if (entry.isDirectory) {
        const reader = entry.createReader();
        const allEntries = [];
        
        const readEntries = () => {
          reader.readEntries((entries) => {
            if (entries.length === 0) {
              processAllEntries();
            } else {
              allEntries.push(...entries);
              readEntries();
            }
          }, (error) => {
            console.error(`Error reading directory ${entry.name}:`, error);
            processAllEntries();
          });
        };
        
        const processAllEntries = async () => {
          try {
            for (const subEntry of allEntries) {
              try {
                await this.traverseWebkitEntry(subEntry, path + entry.name + "/", output, config);
              } catch (error) {
                console.error(`Error processing entry ${subEntry.name}:`, error);
              }
            }
            resolve();
          } catch (error) {
            console.error(`Error processing directory entries:`, error);
            resolve();
          }
        };
        
        readEntries();
      } else {
        resolve();
      }
    });
  }

  /**
   * Process dropped files/folders
   */
  static async processDroppedItems(event, config = {}) {
    const collectedFiles = [];
    
    try {
      const items = Array.from(event.dataTransfer.items || []);
      const files = Array.from(event.dataTransfer.files || []);
      
      // Process items (preferred for directory support)
      if (items.length > 0) {
        for (const item of items) {
          if (item.kind === 'file') {
            await this.processFileHandle(item, collectedFiles, '', config);
          }
        }
      } else if (files.length > 0) {
        for (const file of files) {
          await this.processFileHandle(file, collectedFiles, '', config);
        }
      }
      
      return collectedFiles;
    } catch (error) {
      console.error('Error processing dropped items:', error);
      throw error;
    }
  }

  /**
   * Process file objects from Tauri (file paths only)
   */
  static async processFileObjects(fileObjects) {
    const collectedFiles = [];
    
    try {
      for (const fileObj of fileObjects) {
        // Extract file name from path
        const fileName = fileObj.name || fileObj.fullPath?.split('/').pop() || fileObj.path?.split('/').pop() || 'unknown';
        const filePath = fileObj.fullPath || fileObj.path || '';
        
        // Check if it's a media file based on file extension
        const { isVideo, isSubtitle, isMedia, fileKind } = isMediaFile({ name: fileName });
        
        if (isMedia) {
          const processedFile = {
            name: fileName,
            fullPath: filePath,
            size: fileObj.size || 0,
            type: fileObj.type || '',
            file: null, // No File object in Tauri, just the path
            isVideo: isVideo,
            isSubtitle: isSubtitle,
            movieHash: null,
            detectedLanguage: fileKind ? { file_kind: fileKind } : null,
            recognized: true,
            isTauriFile: true // Mark as Tauri file for special handling
          };
          
          collectedFiles.push(processedFile);
        }
      }
      
      return collectedFiles;
    } catch (error) {
      console.error('Error processing Tauri file objects:', error);
      throw error;
    }
  }

  /**
   * Process MKV files to extract embedded subtitles
   * @param {Array} files - Array of file objects 
   * @param {Function} onFileUpdate - Callback to update file status
   * @param {Function} onSubtitleExtracted - Callback when subtitle is extracted
   * @param {Function} addDebugInfo - Callback to add debug messages to UI
   */
  static async processMkvExtractions(files, onFileUpdate, onSubtitleExtracted, addDebugInfo = null) {
    const mkvFiles = files.filter(file => file.hasMkvSubtitleExtraction);
    
    for (const mkvFile of mkvFiles) {
      try {
        // Update status to detecting and notify UI immediately
        onFileUpdate(mkvFile.fullPath, { mkvExtractionStatus: 'detecting' });
        
        console.log(`🎯 Starting MKV subtitle detection for: ${mkvFile.name}`);
        console.log(`🔍 Analyzing MKV file header to detect embedded subtitle streams...`);
        
        // Detect subtitle streams using the MKV subtitle extractor
        const detectedStreams = await mkvSubtitleExtractor.detectSubtitleStreams(mkvFile.file);
        
        if (detectedStreams.length === 0) {
          console.log(`📝 No subtitle streams found in MKV file: ${mkvFile.name}`);
          onFileUpdate(mkvFile.fullPath, { mkvExtractionStatus: 'no_streams' });
          continue;
        }

        console.log(`🎉 Successfully detected ${detectedStreams.length} subtitle stream(s) in ${mkvFile.name}`);
        console.log(`🎯 Auto-extracting all ${detectedStreams.length} subtitle streams...`);
        
        // Also add to debug panel
        if (addDebugInfo) {
          addDebugInfo(`🎉 Detected ${detectedStreams.length} subtitle streams in MKV file`);
          addDebugInfo(`🎯 Starting auto-extraction of all ${detectedStreams.length} streams...`);
        }

        // Update status to extracting
        onFileUpdate(mkvFile.fullPath, { 
          mkvExtractionStatus: 'extracting_all',
          detectedStreams: detectedStreams,
          streamCount: detectedStreams.length,
          extractedCount: 0
        });

        // Extract all detected streams automatically
        let extractedCount = 0;
        const languageCounts = {}; // Track how many subtitles per language to avoid duplicates
        
        for (let i = 0; i < detectedStreams.length; i++) {
          const stream = detectedStreams[i];
          try {
            console.log(`🔧 Extracting stream ${i + 1}/${detectedStreams.length}: ${stream.title}`);
            if (addDebugInfo) {
              addDebugInfo(`🔧 Extracting stream ${i + 1}/${detectedStreams.length}: ${stream.language} (index ${stream.streamIndex})`);
            }
            
            const extractedSubtitle = await mkvSubtitleExtractor.extractSingleStream(
              stream.id, 
              stream.streamIndex, 
              stream.language, 
              stream.originalFileName
            );

            if (extractedSubtitle && extractedSubtitle !== null) {
              const subtitleFile = extractedSubtitle.file;
              
              // Check for empty subtitle files (0 bytes) - double check in case MKV extractor didn't catch it
              if (subtitleFile.size === 0 || extractedSubtitle.size === 0) {
                console.warn(`⚠️ Extracted subtitle has 0 bytes: ${subtitleFile.name} (stream ${stream.streamIndex})`);
                if (addDebugInfo) {
                  addDebugInfo(`⚠️ Skipped empty subtitle: ${subtitleFile.name} (0 bytes)`);
                }
                // Skip this empty subtitle and continue with next stream
                continue;
              }
              
              // Create subtitle file path in the same directory as the MKV file
              // Use MKV base name + language + extension for proper pairing
              const mkvBaseName = mkvFile.name.replace(/\.[^/.]+$/, ''); // Remove .mkv extension
              const langCode = extractedSubtitle.language !== 'unknown' ? extractedSubtitle.language : 'und';
              
              // Handle multiple subtitles with same language by adding a suffix
              if (!languageCounts[langCode]) {
                languageCounts[langCode] = 0;
              }
              languageCounts[langCode]++;
              
              const langSuffix = languageCounts[langCode] === 1 ? langCode : `${langCode}_${languageCounts[langCode]}`;
              const subtitleName = `${mkvBaseName}.${langSuffix}.srt`;
              
              const basePath = mkvFile.fullPath.includes('/') ? 
                mkvFile.fullPath.substring(0, mkvFile.fullPath.lastIndexOf('/') + 1) : '';
              const subtitlePath = basePath + subtitleName;

              // Create subtitle file object that will pair with the MKV file
              const subtitleObj = {
                name: subtitleName,
                fullPath: subtitlePath,
                size: subtitleFile.size,
                type: subtitleFile.type,
                file: new File([subtitleFile], subtitleName, { type: subtitleFile.type }), // Rename the file
                isVideo: false,
                isSubtitle: true,
                movieHash: null,
                detectedLanguage: null, // Will be detected later
                recognized: true,
                extractedFromMkv: true, // Mark as extracted from MKV
                originalMkvFile: mkvFile.name,
                streamIndex: extractedSubtitle.streamIndex,
                language: extractedSubtitle.language,
                pairedWithMkv: true // Mark as auto-paired with MKV
              };

              // Add the extracted subtitle to the file list
              onSubtitleExtracted(subtitleObj);
              extractedCount++;
              
              console.log(`✅ Extracted and paired: ${subtitleFile.name} (${extractedSubtitle.language})`);
              if (addDebugInfo) {
                addDebugInfo(`✅ Extracted: ${subtitleName} (${extractedSubtitle.language})`);
              }
              
              // Update progress
              onFileUpdate(mkvFile.fullPath, { 
                mkvExtractionStatus: 'extracting_all',
                extractedCount: extractedCount,
                streamCount: detectedStreams.length
              });
            } else {
              // extractedSubtitle is null (empty subtitle detected by MKV extractor)
              console.warn(`⚠️ Skipping empty subtitle from stream ${stream.streamIndex} (${stream.language})`);
              if (addDebugInfo) {
                addDebugInfo(`⚠️ Skipped empty subtitle: stream ${stream.streamIndex} (0 bytes)`);
              }
            }
          } catch (extractError) {
            console.warn(`⚠️ Failed to extract stream ${stream.streamIndex}: ${extractError.message}`);
            // Continue with next stream
          }
        }

        // Update final status
        onFileUpdate(mkvFile.fullPath, { 
          mkvExtractionStatus: 'completed',
          detectedStreams: detectedStreams,
          streamCount: detectedStreams.length,
          extractedCount: extractedCount
        });

        console.log(`🎉 Auto-extraction completed: ${extractedCount}/${detectedStreams.length} subtitles extracted and paired with ${mkvFile.name}`);
        if (addDebugInfo) {
          addDebugInfo(`🎉 Auto-extraction completed: ${extractedCount}/${detectedStreams.length} subtitles extracted and paired`);
        }

        // Cleanup notification (individual extractions now handle their own cleanup)
        try {
          await mkvSubtitleExtractor.cleanupFiles();
          console.log(`🧹 All extractions completed for ${mkvFile.name} with automatic cleanup`);
        } catch (cleanupError) {
          console.warn(`⚠️ Cleanup notification failed: ${cleanupError.message}`);
        }

      } catch (error) {
        console.error(`❌ Failed to extract subtitles from MKV file ${mkvFile.name}:`, error);
        onFileUpdate(mkvFile.fullPath, { mkvExtractionStatus: 'error', mkvExtractionError: error.message });
        
        // Try to cleanup even on error
        try {
          await mkvSubtitleExtractor.cleanupFiles();
        } catch (cleanupError) {
          // Ignore cleanup errors during error handling
        }
      }
    }
  }

  /**
   * Extract subtitles from MKV file asynchronously (legacy method)
   */
  static async _extractMkvSubtitles(mkvFile, mkvPath, output) {
    try {
      console.log(`🎯 Starting MKV subtitle extraction for: ${mkvFile.name}`);
      
      // Extract subtitles using the MKV subtitle extractor
      const extractedSubtitles = await mkvSubtitleExtractor.extractSubtitles(mkvFile);
      
      if (extractedSubtitles.length === 0) {
        console.log(`📝 No subtitles found in MKV file: ${mkvFile.name}`);
        return;
      }

      // Process each extracted subtitle
      for (const subtitleData of extractedSubtitles) {
        const subtitleFile = subtitleData.file;
        const basePath = mkvPath.replace(/\/[^/]*$/, '/'); // Get directory path
        const subtitlePath = basePath + subtitleFile.name;

        // Create subtitle file object in the same format as other files
        const subtitleObj = {
          name: subtitleFile.name,
          fullPath: subtitlePath,
          size: subtitleFile.size,
          type: subtitleFile.type,
          file: subtitleFile,
          isVideo: false,
          isSubtitle: true,
          movieHash: null,
          detectedLanguage: null, // Will be detected later
          recognized: true,
          extractedFromMkv: true, // Mark as extracted from MKV
          originalMkvFile: mkvFile.name,
          streamIndex: subtitleData.streamIndex,
          language: subtitleData.language
        };

        output.push(subtitleObj);
        console.log(`✅ Extracted subtitle: ${subtitleFile.name} (${subtitleData.language})`);
      }

      console.log(`🎉 Successfully extracted ${extractedSubtitles.length} subtitle(s) from ${mkvFile.name}`);

    } catch (error) {
      console.error(`❌ Failed to extract subtitles from MKV file ${mkvFile.name}:`, error);
      // Don't throw error - extraction failure shouldn't prevent file processing
    }
  }

  /**
   * Check browser capabilities for file handling
   */
  static getBrowserCapabilities() {
    const userAgent = navigator.userAgent;
    const isFirefox = userAgent.includes('Firefox');
    const isChrome = userAgent.includes('Chrome') && !userAgent.includes('Edg');
    const isEdge = userAgent.includes('Edg');
    const isBrave = userAgent.includes('Brave') || (userAgent.includes('Chrome') && !userAgent.includes('Edg') && !window.chrome?.webstore);
    const isSafari = userAgent.includes('Safari') && !userAgent.includes('Chrome');
    
    let browser = 'Unknown';
    if (isFirefox) browser = 'Firefox';
    else if (isBrave) browser = 'Brave';
    else if (isEdge) browser = 'Edge';
    else if (isChrome) browser = 'Chrome';
    else if (isSafari) browser = 'Safari';
    
    const hasFileSystemAPI = 'getAsFileSystemHandle' in DataTransferItem.prototype;
    const hasWebkitGetAsEntry = 'webkitGetAsEntry' in DataTransferItem.prototype;
    
    return {
      browser,
      hasFileSystemAPI,
      hasWebkitGetAsEntry,
      supportsDirectories: hasFileSystemAPI || hasWebkitGetAsEntry
    };
  }
}

