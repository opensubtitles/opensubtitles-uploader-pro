import { useState, useCallback, useEffect, useRef } from 'react';
import { FileProcessingService } from '../services/fileProcessing.js';
import { pairVideoAndSubtitleFiles } from '../utils/fileUtils.js';

/**
 * Custom hook for file handling functionality
 */
export const useFileHandling = (addDebugInfo) => {
  const [files, setFiles] = useState([]);
  
  const [pairedFiles, setPairedFiles] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [browserCapabilities] = useState(() => FileProcessingService.getBrowserCapabilities());
  const lastProcessedFiles = useRef('');

  // Auto-update pairs when files change
  useEffect(() => {
    // Create a unique signature for the current files to prevent duplicate processing
    // Include movieHash and detectedLanguage so pairs update when these are calculated
    const currentFilesSignature = files.map(f => 
      f.fullPath + f.size + (f.movieHash || 'null') + (f.detectedLanguage ? JSON.stringify(f.detectedLanguage) : 'null')
    ).join('|');
    
    // Skip if we've already processed these exact files
    if (lastProcessedFiles.current === currentFilesSignature) {
      return;
    }
    
    lastProcessedFiles.current = currentFilesSignature;
    
    const newPairs = pairVideoAndSubtitleFiles(files);
    setPairedFiles(newPairs);
  }, [files, addDebugInfo]);

  // Handle file drop
  const handleDrop = useCallback(async (event) => {
    event.preventDefault();
    setIsDragOver(false);
    
    addDebugInfo("Drop event triggered");
    
    try {
      const collectedFiles = await FileProcessingService.processDroppedItems(event);
      
      addDebugInfo(`Collected ${collectedFiles.length} valid media files`);
      
      if (collectedFiles.length > 0) {
        setFiles(collectedFiles);
        addDebugInfo(`Set ${collectedFiles.length} files`);
      } else {
        addDebugInfo("No valid media files found");
        throw new Error("No video or subtitle files found in the dropped items.");
      }
    } catch (error) {
      addDebugInfo(`Error processing dropped items: ${error.message}`);
      throw error;
    }
  }, [addDebugInfo]);

  // Handle drag over
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  // Handle drag leave
  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  // Clear all files
  const clearFiles = useCallback(() => {
    setFiles([]);
    addDebugInfo("Cleared all files");
  }, [addDebugInfo]);

  // Update file data with better state management
  const updateFile = useCallback((fullPath, updates) => {
    setFiles(prevFiles => {
      return prevFiles.map(file => {
        if (file.fullPath === fullPath) {
          return { ...file, ...updates };
        }
        return file;
      });
    });
  }, []);

  // Update files in batch
  const updateFiles = useCallback((updates) => {
    setFiles(prevFiles => 
      prevFiles.map(file => {
        const update = updates.find(u => u.fullPath === file.fullPath);
        return update ? { ...file, ...update.data } : file;
      })
    );
  }, []);

  return {
    files,
    pairedFiles,
    isDragOver,
    browserCapabilities,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    clearFiles,
    updateFile,
    updateFiles,
    setFiles // Keep for edge cases, but prefer updateFile
  };
};