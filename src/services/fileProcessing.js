import { isMediaFile, isVideoFile, isSubtitleFile } from '../utils/fileUtils.js';
import { ZipProcessingService } from './zipProcessing.js';

/**
 * File processing service for handling drag and drop files
 */
export class FileProcessingService {
  /**
   * Process a single file or directory entry
   */
  static async processFileHandle(item, output, path = '') {
    try {
      let file;
      let entry;
      
      // Handle different item types
      if (item instanceof File) {
        file = item;
      } else if (item.webkitGetAsEntry) {
        entry = item.webkitGetAsEntry();
        
        if (entry && entry.isDirectory) {
          await this.traverseWebkitEntry(entry, path + entry.name + "/", output);
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
      }
      
    } catch (error) {
      console.error(`Error processing file: ${error.message}`);
    }
  }

  /**
   * Recursive directory traversal for webkit entries
   */
  static traverseWebkitEntry(entry, path, output) {
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
                await this.traverseWebkitEntry(subEntry, path + entry.name + "/", output);
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
  static async processDroppedItems(event) {
    const collectedFiles = [];
    
    try {
      const items = Array.from(event.dataTransfer.items || []);
      const files = Array.from(event.dataTransfer.files || []);
      
      // Process items (preferred for directory support)
      if (items.length > 0) {
        for (const item of items) {
          if (item.kind === 'file') {
            await this.processFileHandle(item, collectedFiles);
          }
        }
      } else if (files.length > 0) {
        for (const file of files) {
          await this.processFileHandle(file, collectedFiles);
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

