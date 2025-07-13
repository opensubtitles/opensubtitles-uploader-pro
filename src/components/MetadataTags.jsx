import React from 'react';
import { GuessItService } from '../services/guessItService.js';

export const MetadataTags = ({ 
  guessItData, 
  filePath, 
  getGuessItProcessingStatus,
  getFormattedTags,
  compact = false, // Optional prop for compact display
  isDark = false // Add isDark prop
}) => {
  const status = getGuessItProcessingStatus(filePath);
  const tags = getFormattedTags(filePath);

  // Show loading state
  if (status.isProcessing || guessItData[filePath] === 'processing') {
    return (
      <div className="flex items-center gap-2 mt-2">
        <div className="w-3 h-3 border rounded-full animate-spin" style={{borderColor: '#2878C0', borderTopColor: 'transparent'}}></div>
        <span className="text-xs" style={{color: '#2878C0'}}>Extracting metadata...</span>
      </div>
    );
  }

  // Show error state
  if (status.hasFailed || guessItData[filePath] === 'error') {
    return (
      <div className="flex items-center gap-2 mt-2">
        <span className="text-xs" style={{color: '#808080'}}>❌ Metadata extraction failed</span>
      </div>
    );
  }

  // Show no data state
  if (guessItData[filePath] === 'no-data') {
    return (
      <div className="flex items-center gap-2 mt-2">
        <span className="text-xs" style={{color: '#2878C0'}}>⚠️ No metadata available</span>
      </div>
    );
  }

  // Show tags if we have data
  if (tags.length > 0) {
    // Filter out title and year for compact mode (already shown elsewhere)
    const displayTags = compact 
      ? tags.filter(tag => !['title', 'year'].includes(tag.key))
      : tags;

    // Limit number of tags in compact mode
    const finalTags = compact && displayTags.length > 8 
      ? displayTags.slice(0, 8) 
      : displayTags;

    return (
      <div className="mt-2">
        <div className="flex flex-wrap gap-1">
          {finalTags.map((tag) => {
            const tagStyles = GuessItService.getTagColorStyles(tag.color, isDark);
            
            
            // Defensive fallback in case tagStyles is undefined
            const safeStyles = tagStyles || {
              backgroundColor: isDark ? 'rgba(75, 85, 99, 0.5)' : '#e5e7eb',
              color: isDark ? '#d1d5db' : '#000000',
              borderColor: isDark ? '#4b5563' : '#9ca3af'
            };
            
            return (
              <span
                key={tag.key}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border transition-all hover:scale-105"
                style={{
                  backgroundColor: safeStyles.backgroundColor,
                  color: safeStyles.color,
                  borderColor: safeStyles.borderColor,
                  // Force important to override any CSS conflicts
                  ...safeStyles
                }}
                title={`${tag.label}: ${tag.value}`}
              >
                <span className="font-semibold">{tag.label}:</span>
                <span className="ml-1 truncate max-w-24">{tag.value}</span>
              </span>
            );
          })}
          {compact && displayTags.length > 8 && (
            <span
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border"
              style={{
                backgroundColor: isDark ? 'rgba(75, 85, 99, 0.5)' : '#f9fafb',
                color: isDark ? '#d1d5db' : '#6b7280',
                borderColor: isDark ? '#4b5563' : '#d1d5db'
              }}
              title={`${displayTags.length - 8} more properties available`}
            >
              +{displayTags.length - 8} more
            </span>
          )}
        </div>
      </div>
    );
  }

  return null;
};