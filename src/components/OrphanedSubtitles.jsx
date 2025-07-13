import React from 'react';
import { MovieDisplay } from './MovieDisplay.jsx';

export const OrphanedSubtitles = ({
  orphanedSubtitles,
  movieGuesses,
  featuresByImdbId,
  featuresLoading,
  combinedLanguages,
  subtitleLanguages,
  openDropdowns,
  dropdownSearch,
  onSubtitleLanguageChange,
  onToggleDropdown,
  onDropdownSearch,
  onSubtitlePreview,
  getSubtitleLanguage,
  getLanguageOptionsForSubtitle,
  uploadStates,
  onToggleUpload,
  getUploadEnabled,
  onMovieChange,
  guessItData,
  getGuessItProcessingStatus,
  getFormattedTags,
  fetchFeaturesByImdbId,
  uploadResults,
  colors,
  isDark
}) => {
  // Default to light theme colors if not provided
  const themeColors = colors || {
    cardBackground: '#fff',
    background: '#f4f4f4',
    border: '#ccc',
    text: '#000',
    textSecondary: '#454545',
    textMuted: '#808080',
    link: '#2878C0',
    linkHover: '#185DA0',
    success: '#9EC068',
    error: '#dc3545',
    warning: '#ffc107'
  };

  if (!orphanedSubtitles || orphanedSubtitles.length === 0) {
    return null;
  }

  // Calculate master checkbox state for all orphaned subtitles
  const getMasterCheckboxState = () => {
    const enabledCount = orphanedSubtitles.filter(subtitle => getUploadEnabled(subtitle.fullPath)).length;
    
    if (enabledCount === 0) {
      return { checked: false, indeterminate: false };
    } else if (enabledCount === orphanedSubtitles.length) {
      return { checked: true, indeterminate: false };
    } else {
      return { checked: false, indeterminate: true };
    }
  };

  // Handle master checkbox toggle
  const handleMasterToggle = (enabled) => {
    orphanedSubtitles.forEach(subtitle => {
      onToggleUpload(subtitle.fullPath, enabled);
    });
  };

  const masterCheckboxState = getMasterCheckboxState();

  return (
    <div className="rounded-lg p-4 mb-6 shadow-sm" 
         style={{
           backgroundColor: themeColors.cardBackground,
           border: `1px solid ${themeColors.border}`
         }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2" style={{color: themeColors.text}}>
          <span>📝</span>
          <span>Orphaned Subtitles ({orphanedSubtitles.length})</span>
          <span className="text-xs px-2 py-1 rounded" 
                style={{
                  backgroundColor: themeColors.warning + '20',
                  color: themeColors.warning
                }}>
            No matching video file
          </span>
        </h3>
        
        {/* Master checkbox for all orphaned subtitles */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={masterCheckboxState.checked}
            ref={(input) => {
              if (input) input.indeterminate = masterCheckboxState.indeterminate;
            }}
            onChange={(e) => handleMasterToggle(e.target.checked)}
            className="rounded"
            style={{
              accentColor: themeColors.link
            }}
          />
          <span className="text-sm font-medium" style={{color: themeColors.text}}>
            {masterCheckboxState.indeterminate ? 'Partial' : 
             masterCheckboxState.checked ? 'All Selected' : 'None Selected'}
          </span>
        </label>
      </div>
      
      <div className="space-y-4">
        {orphanedSubtitles.map((subtitle) => {
          const movieData = movieGuesses?.[subtitle.fullPath];
          const subtitleName = subtitle.name || subtitle.fullPath.split('/').pop();
          
          return (
            <div key={subtitle.fullPath} 
                 className="rounded-lg p-4 border"
                 style={{
                   backgroundColor: themeColors.background,
                   borderColor: themeColors.border
                 }}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-medium text-sm" style={{color: themeColors.text}}>
                    {subtitleName}
                  </h4>
                  <div className="text-xs mt-1" style={{color: themeColors.textMuted}}>
                    {subtitle.fullPath}
                  </div>
                </div>
                
                {/* Upload Toggle */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={getUploadEnabled(subtitle.fullPath)}
                    onChange={(e) => onToggleUpload(subtitle.fullPath, e.target.checked)}
                    className="rounded"
                    style={{
                      accentColor: themeColors.link
                    }}
                  />
                  <span className="text-sm" style={{color: themeColors.textSecondary}}>
                    Upload
                  </span>
                </label>
              </div>

              {/* Movie Display for orphaned subtitle */}
              <MovieDisplay
                videoPath={subtitle.fullPath}
                movieGuesses={movieGuesses || {}}
                featuresByImdbId={featuresByImdbId || {}}
                featuresLoading={featuresLoading || {}}
                guessItData={guessItData || {}}
                movieUpdateLoading={false}
                onOpenMovieSearch={() => {}} // No movie search for orphaned subtitles
                fetchFeaturesByImdbId={fetchFeaturesByImdbId}
                associatedSubtitles={[subtitle.fullPath]}
                getUploadEnabled={getUploadEnabled}
                onToggleUpload={onToggleUpload}
                colors={themeColors}
                isDark={isDark}
                hideSelectAllCheckbox={true} // Hide the "All Selected" checkbox for orphaned subtitles
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};