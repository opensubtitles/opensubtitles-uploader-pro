import React from 'react';
import { MovieDisplay } from './MovieDisplay.jsx';
import { SubtitleUploadOptions } from './SubtitleUploadOptions.jsx';

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
  uploadOptions,
  onUpdateUploadOptions,
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

  // Movie search state
  const [openMovieSearch, setOpenMovieSearch] = React.useState(null);
  const [movieSearchQuery, setMovieSearchQuery] = React.useState('');
  const [movieSearchResults, setMovieSearchResults] = React.useState([]);
  const [movieSearchLoading, setMovieSearchLoading] = React.useState(false);
  const [movieUpdateLoading, setMovieUpdateLoading] = React.useState({});

  // Clear search state when closing
  const closeMovieSearch = () => {
    setOpenMovieSearch(null);
    setMovieSearchQuery('');
    setMovieSearchResults([]);
  };

  // Handle movie search input (similar to MatchedPairs)
  const handleMovieSearch = (query) => {
    setMovieSearchQuery(query);
  };

  // Utility function to extract IMDB ID from various input formats
  const extractImdbId = (input) => {
    if (!input) return null;
    
    // Remove whitespace
    const trimmed = input.trim();
    
    // Match full IMDB URLs: https://www.imdb.com/title/tt1133589/
    const urlMatch = trimmed.match(/imdb\.com\/title\/(tt\d+)/i);
    if (urlMatch) {
      return urlMatch[1];
    }
    
    // Match tt + number format: tt1133589
    const ttMatch = trimmed.match(/^(tt\d+)$/i);
    if (ttMatch) {
      return ttMatch[1];
    }
    
    // Match just numbers (assuming IMDB ID without tt prefix): 1133589
    const numberMatch = trimmed.match(/^(\d{7,})$/);
    if (numberMatch) {
      return `tt${numberMatch[1]}`;
    }
    
    return null;
  };

  // Check if input looks like an IMDB ID
  const isImdbInput = (input) => {
    return extractImdbId(input) !== null;
  };

  // Debounced movie search
  React.useEffect(() => {
    if (!movieSearchQuery.trim()) {
      setMovieSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setMovieSearchLoading(true);
      try {
        const query = movieSearchQuery.trim();
        const imdbId = extractImdbId(query);
        
        // If it's an IMDB ID input, search using the IMDB ID directly
        if (imdbId) {
          const response = await fetch(`https://www.opensubtitles.org/libs/suggest_imdb.php?m=${imdbId}`);
          const results = await response.json();
          setMovieSearchResults(results || []);
        } else {
          // Regular text search
          const response = await fetch(`https://www.opensubtitles.org/libs/suggest_imdb.php?m=${encodeURIComponent(query)}`);
          const results = await response.json();
          setMovieSearchResults(results || []);
        }
      } catch (error) {
        console.error('Movie search error:', error);
        setMovieSearchResults([]);
      } finally {
        setMovieSearchLoading(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [movieSearchQuery]);

  // Close search when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('[data-movie-search]')) {
        closeMovieSearch();
      }
    };

    if (openMovieSearch) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openMovieSearch]);

  // Handle movie selection from search results
  const handleMovieSelect = async (subtitle, movieResult) => {
    try {
      setMovieUpdateLoading(prev => ({ ...prev, [subtitle.fullPath]: true }));
      
      // Transform the movie data to expected format (like MatchedPairs does)
      const newMovieGuess = {
        imdbid: movieResult.id,
        title: movieResult.name,
        year: movieResult.year,
        kind: movieResult.kind,
        reason: 'User selected'
      };
      
      // Call the onMovieChange callback with the transformed movie data
      if (onMovieChange) {
        await onMovieChange(subtitle.fullPath, newMovieGuess);
      }
      
      closeMovieSearch();
    } catch (error) {
      console.error('Error updating movie:', error);
    } finally {
      setMovieUpdateLoading(prev => ({ ...prev, [subtitle.fullPath]: false }));
    }
  };

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
                movieUpdateLoading={movieUpdateLoading}
                onOpenMovieSearch={(subtitlePath) => setOpenMovieSearch(openMovieSearch === subtitlePath ? null : subtitlePath)}
                fetchFeaturesByImdbId={fetchFeaturesByImdbId}
                associatedSubtitles={[subtitle.fullPath]}
                getUploadEnabled={getUploadEnabled}
                onToggleUpload={onToggleUpload}
                colors={themeColors}
                isDark={isDark}
                hideSelectAllCheckbox={true} // Hide the "All Selected" checkbox for orphaned subtitles
                getGuessItProcessingStatus={getGuessItProcessingStatus}
                getFormattedTags={getFormattedTags}
              />
              
              {/* Upload Options */}
              <SubtitleUploadOptions
                subtitlePath={subtitle.fullPath}
                uploadOptions={uploadOptions?.[subtitle.fullPath] || {}}
                onUpdateOptions={onUpdateUploadOptions}
                colors={themeColors}
                isDark={isDark}
              />
              
              {/* Movie Search Interface for orphaned subtitles */}
              {openMovieSearch === subtitle.fullPath && (
                <div className="mt-3 p-3 rounded-lg" 
                     style={{
                       backgroundColor: isDark ? '#3a3a3a' : '#f8f9fa',
                       border: `1px solid ${themeColors.border}`
                     }}
                     data-movie-search>
                  <div className="text-sm mb-2" style={{color: themeColors.text}}>
                    Search by movie title, IMDB ID, or IMDB URL:
                    <div className="text-xs mt-1" style={{color: themeColors.textSecondary}}>
                      Examples: "Matrix", "tt0133093", "https://www.imdb.com/title/tt0133093/"
                    </div>
                  </div>
                  
                  <div className="relative">
                    <input
                      type="text"
                      value={movieSearchQuery}
                      onChange={(e) => handleMovieSearch(e.target.value)}
                      placeholder="Enter movie title, IMDB ID, or IMDB URL..."
                      className="w-full px-3 py-2 rounded border pr-20"
                      style={{
                        backgroundColor: themeColors.cardBackground,
                        borderColor: themeColors.border,
                        color: themeColors.text
                      }}
                      autoFocus
                    />
                    
                    {/* Visual indicator for IMDB input */}
                    {isImdbInput(movieSearchQuery) && (
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                        <span className="text-xs px-2 py-1 rounded" 
                              style={{
                                color: themeColors.success, 
                                backgroundColor: isDark ? '#1a3315' : '#f0f9e8', 
                                border: `1px solid ${themeColors.success}`
                              }}>
                          IMDB ID: {extractImdbId(movieSearchQuery)}
                        </span>
                      </div>
                    )}
                    
                    {/* Loading indicator */}
                    {movieSearchLoading && movieSearchQuery.trim() && (
                      <div className="absolute top-full left-0 right-0 mt-1 rounded shadow-lg z-20 p-3"
                           style={{
                             backgroundColor: themeColors.cardBackground,
                             border: `1px solid ${themeColors.border}`
                           }}>
                        <div className="flex items-center gap-2 text-sm" style={{color: themeColors.textSecondary}}>
                          <div className="w-4 h-4 border rounded-full animate-spin" style={{borderColor: themeColors.link, borderTopColor: 'transparent'}}></div>
                          <span>
                            {isImdbInput(movieSearchQuery) 
                              ? `Looking up IMDB ID: ${extractImdbId(movieSearchQuery)}...`
                              : 'Searching movies...'
                            }
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {/* No results message */}
                    {!movieSearchLoading && movieSearchQuery.trim() && movieSearchResults.length === 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 rounded shadow-lg z-20 p-3"
                           style={{
                             backgroundColor: themeColors.cardBackground,
                             border: `1px solid ${themeColors.border}`
                           }}>
                        <div className="text-sm" style={{color: themeColors.textSecondary}}>
                          {isImdbInput(movieSearchQuery) 
                            ? `No movie found for IMDB ID: ${extractImdbId(movieSearchQuery)}`
                            : `No movies found for "${movieSearchQuery}"`
                          }
                        </div>
                      </div>
                    )}
                    
                    {/* Search Results Dropdown */}
                    {movieSearchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 rounded shadow-lg z-20 max-h-64 overflow-y-auto"
                           style={{
                             backgroundColor: themeColors.cardBackground,
                             border: `1px solid ${themeColors.border}`
                           }}>
                        {movieSearchResults.map((movie) => (
                          <button
                            key={movie.id}
                            onClick={() => handleMovieSelect(subtitle, movie)}
                            className="w-full text-left px-3 py-2 flex items-center gap-3 last:border-b-0"
                            style={{
                              backgroundColor: 'transparent',
                              borderBottom: `1px solid ${themeColors.border}`
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = isDark ? '#444444' : '#f8f9fa'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                            disabled={movieUpdateLoading[subtitle.fullPath]}
                          >
                            {movie.pic && (
                              <img
                                src={movie.pic}
                                alt={movie.name}
                                className="w-8 h-12 object-cover rounded"
                                style={{border: `1px solid ${themeColors.border}`}}
                                onError={(e) => e.target.style.display = 'none'}
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate" style={{color: themeColors.text}}>
                                {movie.name} ({movie.year})
                              </div>
                              <div className="text-xs capitalize flex items-center gap-2" style={{color: themeColors.textSecondary}}>
                                <span>{movie.kind}</span>
                                <span>•</span>
                                <span>IMDb:</span>
                                <a 
                                  href={`https://www.imdb.com/title/tt${movie.id}/`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="underline"
                                  style={{color: themeColors.link}}
                                  onMouseEnter={(e) => e.target.style.color = themeColors.linkHover}
                                  onMouseLeave={(e) => e.target.style.color = themeColors.link}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {movie.id}
                                </a>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};