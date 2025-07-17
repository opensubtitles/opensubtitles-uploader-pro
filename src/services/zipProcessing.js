import JSZip from 'jszip';
import { VIDEO_EXTENSIONS, SUBTITLE_EXTENSIONS } from '../utils/constants.js';

/**
 * ZIP Processing Service
 * Handles extraction and processing of ZIP files
 */
export class ZipProcessingService {
  
  // Maximum ZIP file size in bytes (100 MB)
  static MAX_ZIP_SIZE = 100 * 1024 * 1024;
  
  /**
   * Check if a file is a ZIP file
   * @param {File} file - The file to check
   * @returns {boolean} - True if the file is a ZIP file
   */
  static isZipFile(file) {
    return file.name.toLowerCase().endsWith('.zip') || 
           file.type === 'application/zip' ||
           file.type === 'application/x-zip-compressed';
  }

  /**
   * Validate ZIP file size
   * @param {File} file - The ZIP file to validate
   * @returns {object} - Object with isValid boolean and error message
   */
  static validateZipSize(file) {
    if (file.size > this.MAX_ZIP_SIZE) {
      const maxSizeMB = (this.MAX_ZIP_SIZE / 1024 / 1024).toFixed(0);
      const fileSizeMB = (file.size / 1024 / 1024).toFixed(1);
      return {
        isValid: false,
        error: `ZIP file "${file.name}" is too large (${fileSizeMB} MB). Maximum allowed size is ${maxSizeMB} MB.`
      };
    }
    return { isValid: true, error: null };
  }

  /**
   * Check if a filename is a valid media file
   * @param {string} filename - The filename to check
   * @returns {object} - Object with isVideo, isSubtitle, and isValid properties
   */
  static isValidMediaFile(filename) {
    const lowerName = filename.toLowerCase();
    
    // Skip system files and hidden files
    if (filename.startsWith('.') || filename.includes('__MACOSX') || filename.includes('.DS_Store')) {
      return { isVideo: false, isSubtitle: false, isValid: false };
    }
    
    const isVideo = VIDEO_EXTENSIONS.some(ext => lowerName.endsWith(ext.toLowerCase()));
    const isSubtitle = SUBTITLE_EXTENSIONS.some(ext => lowerName.endsWith(ext.toLowerCase()));
    
    return {
      isVideo,
      isSubtitle,
      isValid: isVideo || isSubtitle
    };
  }

  /**
   * Extract and process a ZIP file
   * @param {File} zipFile - The ZIP file to process
   * @param {Function} progressCallback - Callback for progress updates (optional)
   * @returns {Promise<Array>} - Array of processed file objects
   */
  static async processZipFile(zipFile, progressCallback = null) {
    try {
      // Validate ZIP file size
      const sizeValidation = this.validateZipSize(zipFile);
      if (!sizeValidation.isValid) {
        throw new Error(sizeValidation.error);
      }

      // Load the ZIP file
      const zip = new JSZip();
      const zipData = await zip.loadAsync(zipFile);
      
      const processedFiles = [];
      const totalFiles = Object.keys(zipData.files).length;
      let processedCount = 0;
      
      // Process each file in the ZIP
      for (const [filename, zipEntry] of Object.entries(zipData.files)) {
        processedCount++;
        
        // Update progress if callback provided
        if (progressCallback) {
          progressCallback({
            current: processedCount,
            total: totalFiles,
            filename: filename,
            stage: 'extracting'
          });
        }
        
        // Skip directories
        if (zipEntry.dir) {
          continue;
        }
        
        // Check if it's a valid media file
        const fileType = this.isValidMediaFile(filename);
        if (!fileType.isValid) {
          continue;
        }
        
        try {
          // Extract the file as a blob
          const fileData = await zipEntry.async('blob');
          
          // Create a File object from the blob
          const extractedFile = new File([fileData], filename, {
            type: this.getMimeType(filename),
            lastModified: zipEntry.date ? zipEntry.date.getTime() : Date.now()
          });
          
          // Create processed file object matching the expected structure
          const processedFile = {
            file: extractedFile,
            fullPath: filename,
            name: filename,
            size: extractedFile.size,
            type: extractedFile.type,
            lastModified: extractedFile.lastModified,
            isVideo: fileType.isVideo,
            isSubtitle: fileType.isSubtitle,
            extractedFrom: zipFile.name // Track which ZIP this came from
          };
          
          processedFiles.push(processedFile);
          
        } catch (fileError) {
          console.warn(`Error extracting file ${filename} from ZIP:`, fileError);
          continue;
        }
      }
      
      if (progressCallback) {
        progressCallback({
          current: totalFiles,
          total: totalFiles,
          filename: '',
          stage: 'complete'
        });
      }
      
      return processedFiles;
      
    } catch (error) {
      console.error('Error processing ZIP file:', error);
      throw new Error(`Failed to process ZIP file ${zipFile.name}: ${error.message}`);
    }
  }

  /**
   * Process multiple ZIP files
   * @param {Array<File>} zipFiles - Array of ZIP files to process
   * @param {Function} progressCallback - Callback for progress updates (optional)
   * @returns {Promise<Array>} - Array of all processed file objects
   */
  static async processMultipleZipFiles(zipFiles, progressCallback = null) {
    const allProcessedFiles = [];
    
    for (let i = 0; i < zipFiles.length; i++) {
      const zipFile = zipFiles[i];
      
      try {
        const processedFiles = await this.processZipFile(zipFile, (fileProgress) => {
          if (progressCallback) {
            progressCallback({
              zipIndex: i,
              totalZips: zipFiles.length,
              zipName: zipFile.name,
              fileProgress: fileProgress
            });
          }
        });
        
        allProcessedFiles.push(...processedFiles);
        
      } catch (error) {
        console.error(`Error processing ZIP file ${zipFile.name}:`, error);
        // Continue processing other ZIP files even if one fails
      }
    }
    
    return allProcessedFiles;
  }

  /**
   * Get MIME type for a filename
   * @param {string} filename - The filename
   * @returns {string} - MIME type
   */
  static getMimeType(filename) {
    const lowerName = filename.toLowerCase();
    
    // Video MIME types
    if (lowerName.endsWith('.mp4')) return 'video/mp4';
    if (lowerName.endsWith('.mkv')) return 'video/x-matroska';
    if (lowerName.endsWith('.avi')) return 'video/x-msvideo';
    if (lowerName.endsWith('.mov')) return 'video/quicktime';
    if (lowerName.endsWith('.webm')) return 'video/webm';
    if (lowerName.endsWith('.flv')) return 'video/x-flv';
    if (lowerName.endsWith('.wmv')) return 'video/x-ms-wmv';
    if (lowerName.endsWith('.mpeg') || lowerName.endsWith('.mpg')) return 'video/mpeg';
    
    // Subtitle MIME types
    if (lowerName.endsWith('.srt')) return 'text/srt';
    if (lowerName.endsWith('.vtt')) return 'text/vtt';
    if (lowerName.endsWith('.ass') || lowerName.endsWith('.ssa')) return 'text/x-ass';
    if (lowerName.endsWith('.sub')) return 'text/x-subtitle';
    if (lowerName.endsWith('.txt')) return 'text/plain';
    
    // Default
    return 'application/octet-stream';
  }

  /**
   * Get summary statistics for ZIP processing
   * @param {Array} processedFiles - Array of processed files
   * @returns {object} - Statistics object
   */
  static getProcessingStats(processedFiles) {
    const stats = {
      totalFiles: processedFiles.length,
      videoFiles: 0,
      subtitleFiles: 0,
      zipSources: new Set(),
      filesByZip: {}
    };
    
    processedFiles.forEach(file => {
      if (file.isVideo) stats.videoFiles++;
      if (file.isSubtitle) stats.subtitleFiles++;
      
      if (file.extractedFrom) {
        stats.zipSources.add(file.extractedFrom);
        
        if (!stats.filesByZip[file.extractedFrom]) {
          stats.filesByZip[file.extractedFrom] = { videos: 0, subtitles: 0 };
        }
        
        if (file.isVideo) stats.filesByZip[file.extractedFrom].videos++;
        if (file.isSubtitle) stats.filesByZip[file.extractedFrom].subtitles++;
      }
    });
    
    stats.zipSources = Array.from(stats.zipSources);
    
    return stats;
  }
}