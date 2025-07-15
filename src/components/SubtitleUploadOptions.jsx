import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getBestMovieDetectionName } from '../utils/fileUtils.js';

export const SubtitleUploadOptions = ({
  subtitlePath,
  uploadOptions = {},
  onUpdateOptions,
  colors,
  isDark,
  subtitleFile, // Add subtitleFile prop to get file info
  pairedVideoFile, // Add pairedVideoFile prop for matched pairs
  onLocalStateChange // Add callback to expose local state changes
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasSetReleaseName, setHasSetReleaseName] = useState(false);
  const [hasSetForeignParts, setHasSetForeignParts] = useState(false);
  const [hasSetHighDefinition, setHasSetHighDefinition] = useState(false);
  const [hasSetHearingImpaired, setHasSetHearingImpaired] = useState(false);
  const [hasSetAutoTranslation, setHasSetAutoTranslation] = useState(false);
  const [subtitleContent, setSubtitleContent] = useState(null);
  const [localHdValue, setLocalHdValue] = useState(null);
  const [localForeignPartsValue, setLocalForeignPartsValue] = useState(null);
  const [localHearingImpairedValue, setLocalHearingImpairedValue] = useState(null);
  const [localAutoTranslationValue, setLocalAutoTranslationValue] = useState(null);
  
  // Refs to track if we've already processed auto-detection for this file
  const processedForeignPartsRef = useRef(false);
  const processedHdRef = useRef(false);
  const processedHearingImpairedRef = useRef(false);
  
  // Reset processing flags when subtitle path changes
  useEffect(() => {
    processedForeignPartsRef.current = false;
    processedHdRef.current = false;
    processedHearingImpairedRef.current = false;
  }, [subtitlePath]);

  // Enhanced detection function that checks all file path elements
  const checkFeatureFromPath = (filePath, featureType) => {
    if (!filePath) return false;
    
    // Split path into all components (directory parts + filename)
    const pathParts = filePath.split('/').filter(part => part.length > 0);
    
    // Check each part of the path
    for (const part of pathParts) {
      if (featureType === 'foreign' && checkForeignPartsFromString(part)) {
        return true;
      }
      if (featureType === 'hd' && checkHighDefinitionFromString(part)) {
        return true;
      }
      if (featureType === 'hearingimpaired' && checkHearingImpairedFromString(part)) {
        return true;
      }
    }
    
    return false;
  };

  // Check if string indicates foreign parts only
  const checkForeignPartsFromString = (str) => {
    if (!str) return false;
    // Enhanced regex with bracket notation and more patterns
    const foreignPartsRegex = /\[?forced\]?|foreign[.\s_-]?parts?|\[?partial\]?|alien[.\s_-]?language|native[.\s_-]?only|parts[.\s_-]?only|non[.\s_-]*english[.\s_-]?parts?|language[.\s_-]?only|\[?commentary\]?/i;
    return foreignPartsRegex.test(str);
  };

  // Check if string indicates high definition
  const checkHighDefinitionFromString = (str) => {
    if (!str) return false;
    // Enhanced regex with bracket notation and more patterns
    const hdRegex = /\[?720p\]?|\[?1080p\]?|\[?1440p\]?|\[?2160p\]?|\[?4K\]?|\[?8K\]?|\[?HDR\]?|Blu[\s._-]?Ray|BR[\s._-]?Rip|BD[\s._-]?(Rip|5|9)|HD[\s._-]?DVD|WEB[\s._-]?(DL|Rip)|WEB[\s._-]?HD|\[?WEBDL\]?|\[?WEBRip\]?/i;
    return hdRegex.test(str);
  };

  // Check if string indicates hearing impaired
  const checkHearingImpairedFromString = (str) => {
    if (!str) return false;
    const hiRegex = /sdh|hi[_-]|[_-]hi/i;
    return hiRegex.test(str);
  };

  // Check if subtitle content indicates automatic translation
  const checkAutoTranslationFromContent = (content) => {
    if (!content) return false;
    // Regex pattern for automatic translation indicators
    const autoTranslationRegex = /<Aj>.*<\/I>|N'-t|{\\ An8}/i;
    return autoTranslationRegex.test(content);
  };

  // Load subtitle content for analysis
  useEffect(() => {
    if (subtitleFile && !subtitleContent && !hasSetAutoTranslation) {
      const loadSubtitleContent = async () => {
        try {
          // Read the subtitle file content
          const file = subtitleFile.file || subtitleFile;
          if (file && typeof file.text === 'function') {
            const content = await file.text();
            setSubtitleContent(content);
          } else if (file && file.content) {
            setSubtitleContent(file.content);
          }
        } catch (error) {
          console.error('Error reading subtitle file:', error);
        }
      };
      
      loadSubtitleContent();
    }
  }, [subtitleFile, subtitleContent, hasSetAutoTranslation]);

  // Pre-fill foreign parts checkbox based on full file path analysis
  useEffect(() => {
    if ((subtitleFile || pairedVideoFile) && !hasSetForeignParts && !processedForeignPartsRef.current) {
      let shouldBeForeignParts = false;
      
      // Check subtitle file path first (higher priority for foreign parts)
      if (subtitleFile && subtitleFile.fullPath) {
        shouldBeForeignParts = checkFeatureFromPath(subtitleFile.fullPath, 'foreign');
      }
      
      // If not found in subtitle, check video file path
      if (!shouldBeForeignParts && pairedVideoFile && pairedVideoFile.fullPath) {
        shouldBeForeignParts = checkFeatureFromPath(pairedVideoFile.fullPath, 'foreign');
      }
      
      if (shouldBeForeignParts) {
        setLocalForeignPartsValue('1');
        setTimeout(() => handleFieldChange('foreignpartsonly', '1'), 0);
        setHasSetForeignParts(true);
        processedForeignPartsRef.current = true;
      }
    }
  }, [subtitleFile?.fullPath, pairedVideoFile?.fullPath, hasSetForeignParts]);

  // Pre-fill high definition checkbox based on full file path analysis
  useEffect(() => {
    if (!hasSetHighDefinition && (subtitleFile || pairedVideoFile) && !processedHdRef.current) {
      let shouldBeHighDefinition = false;
      
      // Check video file path first (higher priority for HD)
      if (pairedVideoFile && pairedVideoFile.fullPath) {
        shouldBeHighDefinition = checkFeatureFromPath(pairedVideoFile.fullPath, 'hd');
      }
      
      // If not found in video, check subtitle file path
      if (!shouldBeHighDefinition && subtitleFile && subtitleFile.fullPath) {
        shouldBeHighDefinition = checkFeatureFromPath(subtitleFile.fullPath, 'hd');
      }
      
      if (shouldBeHighDefinition) {
        setLocalHdValue('1');
        setTimeout(() => handleFieldChange('highdefinition', '1'), 0);
        setHasSetHighDefinition(true);
        processedHdRef.current = true;
      }
    }
  }, [subtitleFile?.fullPath, pairedVideoFile?.fullPath, hasSetHighDefinition]);

  // Pre-fill hearing impaired checkbox based on full file path analysis
  useEffect(() => {
    if (!hasSetHearingImpaired && (subtitleFile || pairedVideoFile) && !processedHearingImpairedRef.current) {
      let shouldBeHearingImpaired = false;
      
      // Check video file path first (higher priority for HI)
      if (pairedVideoFile && pairedVideoFile.fullPath) {
        shouldBeHearingImpaired = checkFeatureFromPath(pairedVideoFile.fullPath, 'hearingimpaired');
      }
      
      // If not found in video, check subtitle file path
      if (!shouldBeHearingImpaired && subtitleFile && subtitleFile.fullPath) {
        shouldBeHearingImpaired = checkFeatureFromPath(subtitleFile.fullPath, 'hearingimpaired');
      }
      
      if (shouldBeHearingImpaired) {
        setLocalHearingImpairedValue('1');
        setTimeout(() => handleFieldChange('hearingimpaired', '1'), 0);
        setHasSetHearingImpaired(true);
        processedHearingImpairedRef.current = true;
      }
    }
  }, [subtitleFile?.fullPath, pairedVideoFile?.fullPath, hasSetHearingImpaired]);

  // Pre-fill automatic translation checkbox based on subtitle content
  useEffect(() => {
    if (subtitleContent && !hasSetAutoTranslation) {
      const shouldBeAutoTranslation = checkAutoTranslationFromContent(subtitleContent);
      
      if (shouldBeAutoTranslation) {
        setLocalAutoTranslationValue('1');
        setTimeout(() => handleFieldChange('automatictranslation', '1'), 0);
        setHasSetAutoTranslation(true);
      }
    }
  }, [subtitleContent, hasSetAutoTranslation]);

  // Pre-fill release name on component mount
  useEffect(() => {
    // Only set release name if this component instance hasn't set it yet
    if ((subtitleFile || pairedVideoFile) && !hasSetReleaseName) {
      let detectionName;
      
      if (pairedVideoFile) {
        // For matched pairs, use video file name directly (has precedence)
        detectionName = pairedVideoFile.name;
      } else {
        // For orphaned subtitles, use smart detection (directory-based for generic names)
        detectionName = getBestMovieDetectionName(subtitleFile);
      }
      
      // Remove file extension if it exists (only common video/subtitle extensions)
      const releaseNameWithoutExtension = detectionName.replace(/\.(mp4|mkv|avi|mov|wmv|flv|webm|m4v|3gp|srt|ass|ssa|vtt|sub|idx|sup)$/i, '');
      
      // Only set if we have a meaningful name (not empty)
      if (releaseNameWithoutExtension.trim()) {
        setTimeout(() => handleFieldChange('moviereleasename', releaseNameWithoutExtension), 0);
        setHasSetReleaseName(true); // Mark that this component instance has set the release name
      }
    }
  }, [subtitleFile, pairedVideoFile, hasSetReleaseName]);

  const handleFieldChange = useCallback((field, value) => {
    const newOptions = {
      ...uploadOptions,
      [field]: value
    };
    
    if (typeof onUpdateOptions === 'function') {
      onUpdateOptions(subtitlePath, newOptions);
    } else {
      console.error('onUpdateOptions is not a function:', onUpdateOptions);
    }
    
    // Update local state for immediate UI feedback
    if (field === 'highdefinition') {
      setLocalHdValue(value);
    } else if (field === 'foreignpartsonly') {
      setLocalForeignPartsValue(value);
    } else if (field === 'hearingimpaired') {
      setLocalHearingImpairedValue(value);
    } else if (field === 'automatictranslation') {
      setLocalAutoTranslationValue(value);
    }
    
    // If user manually changes release name, reset the flag so it can be recalculated if needed
    if (field === 'moviereleasename' && value !== uploadOptions.moviereleasename) {
      setHasSetReleaseName(false);
    }
    
    // If user manually changes foreign parts, reset the flag so it can be recalculated if needed
    if (field === 'foreignpartsonly' && value !== uploadOptions.foreignpartsonly) {
      setHasSetForeignParts(false);
    }
    
    // If user manually changes high definition, mark it as manually set to prevent auto-detection
    if (field === 'highdefinition' && value !== uploadOptions.highdefinition) {
      setHasSetHighDefinition(true);
    }
    
    // If user manually changes hearing impaired, mark it as manually set to prevent auto-detection
    if (field === 'hearingimpaired' && value !== uploadOptions.hearingimpaired) {
      setHasSetHearingImpaired(true);
    }
    
    // If user manually changes automatic translation, reset the flag so it can be recalculated if needed
    if (field === 'automatictranslation' && value !== uploadOptions.automatictranslation) {
      setHasSetAutoTranslation(false);
    }
  }, [uploadOptions, subtitlePath]);

  const currentOptions = uploadOptions || {};
  
  // Debug logging for currentOptions
  
  // Watch for changes in uploadOptions prop
  useEffect(() => {
    // Props changed - no logging needed
  }, [uploadOptions]);

  // Notify parent component of local state changes
  useEffect(() => {
    if (onLocalStateChange) {
      onLocalStateChange(subtitlePath, {
        localHdValue,
        localForeignPartsValue,
        localHearingImpairedValue,
        localAutoTranslationValue
      });
    }
  }, [localHdValue, localForeignPartsValue, localHearingImpairedValue, localAutoTranslationValue, subtitlePath]);


  return (
    <div className="mt-2" data-interactive>
      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-xs px-2 py-1 rounded border transition-colors"
        style={{
          color: colors.textSecondary,
          borderColor: colors.border,
          backgroundColor: isExpanded ? colors.background : 'transparent'
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = colors.background;
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = isExpanded ? colors.background : 'transparent';
        }}
      >
        <span>{isExpanded ? '⚙️' : '⚙️'}</span>
        <span>Upload Options</span>
        <span className="text-xs">{isExpanded ? '▲' : '▼'}</span>
      </button>

      {/* Expanded Options */}
      {isExpanded && (
        <div className="mt-2 p-3 rounded border space-y-2" 
             style={{
               backgroundColor: isDark ? '#2a2a2a' : '#f8f9fa',
               borderColor: colors.border
             }}>
          
          {/* Author Comment - First and multiline */}
          <div className="flex items-start gap-2">
            <span className="text-xs w-6 mt-1" title="Comment from subtitle author">💬</span>
            <textarea
              value={currentOptions.subauthorcomment || ''}
              onChange={(e) => handleFieldChange('subauthorcomment', e.target.value)}
              placeholder="Comment from subtitle author (can be multiple lines)"
              rows={2}
              className="flex-1 px-2 py-1 text-xs rounded border resize-none"
              style={{
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
                color: colors.text,
                minHeight: '2.5rem',
                maxHeight: '8rem',
                overflow: 'hidden'
              }}
              onInput={(e) => {
                // Auto-resize textarea based on content
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
              }}
            />
          </div>

          {/* Release Name */}
          <div className="flex items-center gap-2">
            <span className="text-xs w-6" title="Movie Release Name">📦</span>
            <input
              type="text"
              value={currentOptions.moviereleasename || ''}
              onChange={(e) => handleFieldChange('moviereleasename', e.target.value)}
              placeholder="Release name (e.g., Movie.2023.1080p.BluRay.x264-GROUP)"
              className="flex-1 px-2 py-1 text-xs rounded border"
              style={{
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
                color: colors.text
              }}
            />
          </div>

          {/* Translator */}
          <div className="flex items-center gap-2">
            <span className="text-xs w-6" title="Subtitle Translator">🌐</span>
            <input
              type="text"
              value={currentOptions.subtranslator || ''}
              onChange={(e) => handleFieldChange('subtranslator', e.target.value)}
              placeholder="Who translated the subtitles"
              className="flex-1 px-2 py-1 text-xs rounded border"
              style={{
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
                color: colors.text
              }}
            />
          </div>

          {/* Checkboxes Row 1 */}
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={currentOptions.hearingimpaired === '1' || localHearingImpairedValue === '1'}
                onChange={(e) => handleFieldChange('hearingimpaired', e.target.checked ? '1' : '0')}
                className="w-3 h-3"
                style={{ accentColor: colors.link }}
              />
              <span className="text-xs" title="Hearing Impaired">🦻</span>
              <span className="text-xs" style={{ color: colors.textSecondary }}>
                Hearing Impaired
              </span>
            </label>

            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={currentOptions.highdefinition === '1' || localHdValue === '1'}
                onChange={(e) => handleFieldChange('highdefinition', e.target.checked ? '1' : '0')}
                className="w-3 h-3"
                style={{ accentColor: colors.link }}
              />
              <span className="text-xs" title="High Definition">📺</span>
              <span className="text-xs" style={{ color: colors.textSecondary }}>
                High Definition
              </span>
            </label>
          </div>

          {/* Checkboxes Row 2 */}
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={currentOptions.automatictranslation === '1' || localAutoTranslationValue === '1'}
                onChange={(e) => handleFieldChange('automatictranslation', e.target.checked ? '1' : '0')}
                className="w-3 h-3"
                style={{ accentColor: colors.link }}
              />
              <span className="text-xs" title="Automatic Translation">🤖</span>
              <span className="text-xs" style={{ color: colors.textSecondary }}>
                Auto Translation
              </span>
            </label>

            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={currentOptions.foreignpartsonly === '1' || localForeignPartsValue === '1'}
                onChange={(e) => handleFieldChange('foreignpartsonly', e.target.checked ? '1' : '0')}
                className="w-3 h-3"
                style={{ accentColor: colors.link }}
              />
              <span className="text-xs" title="Foreign Parts Only">🎭</span>
              <span className="text-xs" style={{ color: colors.textSecondary }}>
                Foreign Parts Only
              </span>
            </label>
          </div>

        </div>
      )}
    </div>
  );
};