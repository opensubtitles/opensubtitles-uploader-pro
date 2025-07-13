import React from 'react';
import { areTitlesSimilar } from '../utils/fileUtils.js';

export const MovieDisplay = ({
  videoPath,
  movieGuesses,
  featuresByImdbId,
  featuresLoading,
  guessItData,
  movieUpdateLoading,
  onOpenMovieSearch,
  fetchFeaturesByImdbId, // New prop for fetching episode-specific features
  associatedSubtitles, // Array of subtitle file paths for this movie
  getUploadEnabled, // Function to check if subtitle is enabled for upload
  onToggleUpload, // Function to toggle subtitle upload status
  colors, // Theme colors
  isDark, // Dark mode flag
  hideSelectAllCheckbox = false // Hide the "All Selected" checkbox
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
  // Calculate checkbox state for all associated subtitles
  const getMovieCheckboxState = () => {
    if (!associatedSubtitles || associatedSubtitles.length === 0) {
      return { checked: false, indeterminate: false };
    }
    
    const enabledCount = associatedSubtitles.filter(subtitle => getUploadEnabled && getUploadEnabled(subtitle)).length;
    
    if (enabledCount === 0) {
      return { checked: false, indeterminate: false };
    } else if (enabledCount === associatedSubtitles.length) {
      return { checked: true, indeterminate: false };
    } else {
      return { checked: false, indeterminate: true };
    }
  };

  // Handle movie checkbox change
  const handleMovieCheckboxChange = (checked) => {
    if (!associatedSubtitles || !onToggleUpload) return;
    
    // Toggle all associated subtitles to the new state
    associatedSubtitles.forEach(subtitle => {
      onToggleUpload(subtitle, checked);
    });
  };

  // Find specific episode in features data based on GuessIt season/episode info
  const findEpisodeMatch = (featuresData, guessItData) => {
    if (!featuresData?.data?.[0]?.attributes?.seasons || !guessItData) {
      return null;
    }

    const attributes = featuresData.data[0].attributes;
    
    // Check if this is a TV show and we have episode info from GuessIt
    if (attributes.feature_type !== 'Tvshow' || !guessItData.season || !guessItData.episode) {
      return null;
    }

    const seasonNumber = parseInt(guessItData.season);
    const episodeNumber = parseInt(guessItData.episode);

    if (isNaN(seasonNumber) || isNaN(episodeNumber)) {
      return null;
    }

    // Find the matching season
    const season = attributes.seasons.find(s => s.season_number === seasonNumber);
    if (!season?.episodes) {
      return null;
    }

    // Find the matching episode
    const episode = season.episodes.find(e => e.episode_number === episodeNumber);
    if (!episode) {
      return null;
    }

    // Return episode-specific movie data
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
  };

  // Get the best movie data (episode-specific if available, otherwise main show)
  const getBestMovieData = () => {
    const movieData = movieGuesses?.[videoPath];
    const featuresData = movieData?.imdbid ? featuresByImdbId?.[movieData.imdbid] : null;
    const guessItVideoData = guessItData?.[videoPath];

    // Try to find episode match if we have GuessIt data
    if (movieData && featuresData && guessItVideoData && typeof guessItVideoData === 'object') {
      const episodeMatch = findEpisodeMatch(featuresData, guessItVideoData);
      if (episodeMatch) {
        return episodeMatch;
      }
    }

    // Fall back to original movie data
    return movieData;
  };

  const movieData = movieGuesses?.[videoPath];
  const bestMovieData = getBestMovieData();
  const originalMovieData = movieData;
  const featuresData = originalMovieData?.imdbid ? featuresByImdbId?.[originalMovieData.imdbid] : null;
  
  // Get episode-specific features data if available
  const episodeFeaturesData = bestMovieData?.kind === 'episode' && bestMovieData.imdbid 
    ? featuresByImdbId?.[bestMovieData.imdbid] 
    : null;

  // Effect to fetch episode-specific features when episode IMDb ID is available
  React.useEffect(() => {
    if (bestMovieData?.kind === 'episode' && bestMovieData.imdbid && fetchFeaturesByImdbId && !episodeFeaturesData) {
      fetchFeaturesByImdbId(bestMovieData.imdbid);
    }
  }, [bestMovieData?.imdbid, bestMovieData?.kind, fetchFeaturesByImdbId]);

  if (!movieData) {
    return null;
  }

  if (movieData === 'guessing') {
    return (
      <span className="flex items-center gap-1">
        <div className="w-3 h-3 border border-blue-300 border-t-transparent rounded-full animate-spin"></div>
        <span>Identifying movie...</span>
      </span>
    );
  }

  if (movieData === 'error') {
    return (
      <div className="space-y-2" id={`movie-${videoPath.replace(/[^a-zA-Z0-9]/g, '-')}`}>
        <div className="rounded-lg p-3" 
             style={{
               backgroundColor: isDark ? '#3d1a1a' : '#fef2f2',
               border: `1px solid ${themeColors.error}`
             }}>
          <span className="flex items-center gap-1" style={{color: themeColors.error}}>
            <span>❌</span>
            <span className="font-semibold">Movie identification failed</span>
          </span>
          <div className="text-xs mt-1" style={{color: themeColors.error}}>
            Unable to identify this video automatically
          </div>
        </div>
      </div>
    );
  }

  if (movieData === 'no-match') {
    return (
      <div className="space-y-2" id={`movie-${videoPath.replace(/[^a-zA-Z0-9]/g, '-')}`}>
        <div className="rounded-lg p-3" 
             style={{
               backgroundColor: isDark ? '#3d1a1a' : '#fef2f2',
               border: `1px solid ${themeColors.error}`
             }}>
          <span className="flex items-center gap-1" style={{color: themeColors.error}}>
            <span>🚫</span>
            <span className="font-semibold">No movie match found</span>
            <button
              onClick={() => onOpenMovieSearch(videoPath)}
              className="ml-2 text-xs px-2 py-1 rounded border transition-colors"
              style={{
                color: themeColors.link,
                borderColor: themeColors.link
              }}
              onMouseEnter={(e) => {
                e.target.style.color = themeColors.linkHover;
                e.target.style.borderColor = themeColors.linkHover;
              }}
              onMouseLeave={(e) => {
                e.target.style.color = themeColors.link;
                e.target.style.borderColor = themeColors.link;
              }}
              title="Search for movie manually"
            >
              🔍 Search Movie
            </button>
          </span>
          <div className="text-xs mt-1" style={{color: themeColors.error}}>
            This video needs manual movie identification for upload
          </div>
        </div>
      </div>
    );
  }

  if (typeof bestMovieData === 'object' && bestMovieData && !movieUpdateLoading[videoPath]) {
    // Check if we have a valid IMDb ID for upload
    const uploadImdbId = bestMovieData?.kind === 'episode' && bestMovieData.imdbid 
      ? bestMovieData.imdbid 
      : originalMovieData.imdbid;
    
    const hasValidImdbId = !!uploadImdbId;
    
    // Check features loading and error states
    const isMainFeaturesLoading = originalMovieData?.imdbid && featuresLoading?.[originalMovieData.imdbid];
    const isEpisodeFeaturesLoading = bestMovieData?.imdbid && featuresLoading?.[bestMovieData.imdbid];
    const isFeaturesLoading = isMainFeaturesLoading || isEpisodeFeaturesLoading;
    
    const mainFeaturesHasError = originalMovieData?.imdbid && featuresByImdbId?.[originalMovieData.imdbid]?.error;
    const episodeFeaturesHasError = bestMovieData?.imdbid && featuresByImdbId?.[bestMovieData.imdbid]?.error;
    
    return (
      <div 
        className="rounded p-4 border mt-2"
        style={{
          backgroundColor: themeColors.cardBackground,
          borderColor: hasValidImdbId ? themeColors.border : themeColors.error,
          borderLeft: hasValidImdbId ? `3px solid ${themeColors.link}` : `3px solid ${themeColors.error}`
        }}
        id={`movie-${videoPath.replace(/[^a-zA-Z0-9]/g, '-')}`}
      >
        <div className="flex gap-4">
          {/* Movie Poster */}
          {bestMovieData.imdbid && (
            <div className="flex-shrink-0">
              <div className="relative w-16 h-24 rounded border border-gray-300 bg-gray-100 overflow-hidden">
                {/* Loading placeholder - always show initially */}
                <div className="absolute inset-0 flex items-center justify-center bg-gray-200 animate-pulse">
                  <div className="text-gray-500 text-xs text-center">
                    <div className="w-8 h-8 mx-auto mb-1 bg-gray-300 rounded flex items-center justify-center">
                      🎬
                    </div>
                    Loading...
                  </div>
                </div>
                
                {/* Actual image - prefer episode poster, fallback to series poster */}
                {(() => {
                  // Use episode poster if available, otherwise use series poster
                  const posterData = episodeFeaturesData?.data?.[0]?.attributes?.img_url ? episodeFeaturesData : featuresData;
                  const imgUrl = posterData?.data?.[0]?.attributes?.img_url;
                  
                  if (imgUrl) {
                    return (
                      <img
                        src={(() => {
                          // Check if img_url contains "no-poster" and use fallback
                          if (imgUrl.includes('no-poster')) {
                            return 'https://static.opensubtitles.org/gfx/empty_cover.jpg';
                          }
                          
                          // Use original URL, add domain if relative
                          return imgUrl.startsWith('http') 
                            ? imgUrl
                            : `https://www.opensubtitles.com${imgUrl}`;
                        })()}
                        alt={`${bestMovieData.title} Poster`}
                        className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-300"
                        onError={(e) => {
                          console.log('Image failed to load:', e.target.src);
                          // Keep the placeholder visible on error
                          e.target.style.display = 'none';
                        }}
                        onLoad={(e) => {
                          console.log('Image loaded successfully:', e.target.src);
                          // Fade in the image and hide placeholder
                          e.target.style.opacity = '1';
                          if (e.target.previousElementSibling) {
                            e.target.previousElementSibling.style.display = 'none';
                          }
                        }}
                      />
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
          )}
          
          {/* Movie Information */}
          <div className="flex-1 min-w-0">
            {/* Title */}
            <div className="font-semibold text-base mb-2" style={{color: themeColors.text}}>
              <div className="flex items-center gap-2">
                {/* Problem Icon or Type Icon */}
                {!hasValidImdbId ? (
                  <span 
                    title="No IMDb ID available for upload"
                    style={{color: themeColors.error}}
                  >
                    🚫
                  </span>
                ) : (
                  <span 
                    title={featuresData?.data?.[0]?.attributes?.feature_type ? 
                      featuresData.data[0].attributes.feature_type.replace('_', ' ') : 
                      (bestMovieData.kind || 'movie').replace('_', ' ')
                    }
                  >
                    {(featuresData?.data?.[0]?.attributes?.feature_type === 'tv_series' || 
                      featuresData?.data?.[0]?.attributes?.feature_type === 'episode' ||
                      bestMovieData.kind === 'tv series' ||
                      bestMovieData.kind === 'episode') ? '📺' : '🎬'}
                  </span>
                )}
                
                {/* Main Title - shows episode-specific title with parent_title + original_title when available */}
                <span>
                  {(() => {
                    // If we have episode-specific features data, use parent_title + original_title
                    if (episodeFeaturesData?.data?.[0]?.attributes) {
                      const episodeAttrs = episodeFeaturesData.data[0].attributes;
                      const parentTitle = episodeAttrs.parent_title;
                      const originalTitle = episodeAttrs.original_title;
                      const seasonEpisode = `S${episodeAttrs.season_number?.toString().padStart(2, '0') || '??'}E${episodeAttrs.episode_number?.toString().padStart(2, '0') || '??'}`;
                      return `${parentTitle} - ${seasonEpisode} - ${originalTitle}`;
                    }
                    // Otherwise use the bestMovieData title
                    const mainTitle = bestMovieData.title;
                    return mainTitle;
                  })()}
                  {bestMovieData.year && ` (${bestMovieData.year})`}
                </span>
                
                {/* Change Movie Button */}
                <button
                  onClick={() => onOpenMovieSearch(videoPath)}
                  className="ml-2 text-xs px-2 py-1 rounded border transition-colors"
                  style={{
                    color: themeColors.textSecondary,
                    borderColor: themeColors.border
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.color = themeColors.link;
                    e.target.style.borderColor = themeColors.link;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.color = themeColors.textSecondary;
                    e.target.style.borderColor = themeColors.border;
                  }}
                  title="Change movie identification"
                  disabled={movieUpdateLoading[videoPath]}
                >
                  ✏️ Change
                </button>

                {/* Movie Checkbox - Select/Deselect All Subtitles */}
                {associatedSubtitles && associatedSubtitles.length > 0 && !hideSelectAllCheckbox && (
                  <div className="ml-auto flex items-center">
                    <label className="flex items-center cursor-pointer group" title="Select/deselect all subtitles for this movie">
                      <input
                        type="checkbox"
                        checked={getMovieCheckboxState().checked}
                        ref={(el) => {
                          if (el) {
                            el.indeterminate = getMovieCheckboxState().indeterminate;
                          }
                        }}
                        onChange={(e) => handleMovieCheckboxChange(e.target.checked)}
                        className="w-4 h-4 rounded focus:ring-2"
                        style={{
                          accentColor: themeColors.link,
                          backgroundColor: themeColors.cardBackground,
                          borderColor: themeColors.border
                        }}
                      />
                      <span className="ml-2 text-xs font-medium" style={{color: themeColors.link}}>
                        {(() => {
                          const state = getMovieCheckboxState();
                          if (state.indeterminate) return 'Partial';
                          if (state.checked) return 'All Selected';
                          return 'None Selected';
                        })()}
                      </span>
                    </label>
                  </div>
                )}
              </div>
              
              {/* Alternative Title (show original title if different from main title) */}
              {(() => {
                const mainTitle = bestMovieData.title;
                const originalTitle = featuresData?.data?.[0]?.attributes?.original_title;
                const englishTitle = featuresData?.data?.[0]?.attributes?.title;
                
                // Show original title if it's different from the main title
                const showOriginal = originalTitle && mainTitle && !areTitlesSimilar(originalTitle, mainTitle);
                
                return showOriginal && (
                  <div className="text-sm font-normal mt-1" style={{color: themeColors.textSecondary}}>
                    {originalTitle}
                  </div>
                );
              })()}
            </div>
            
            {/* Features Loading State */}
            {isFeaturesLoading && (
              <div className="flex items-center gap-2 text-sm mb-2" style={{color: themeColors.textSecondary}}>
                <div className="w-3 h-3 border rounded-full animate-spin" style={{borderColor: themeColors.link, borderTopColor: 'transparent'}}></div>
                <span>Loading features...</span>
              </div>
            )}
            
            {/* Features Error State */}
            {(mainFeaturesHasError || episodeFeaturesHasError) && (
              <div className="rounded-lg p-2 mb-2" 
                   style={{
                     backgroundColor: isDark ? '#4a3a00' : '#fffbf0',
                     border: `1px solid ${themeColors.warning}`
                   }}>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2" style={{color: themeColors.warning}}>
                    <span>⚠️</span>
                    <span>Warning: Could not load movie features</span>
                  </div>
                  <button
                    onClick={() => {
                      // Retry fetching features for both main movie and episode if needed
                      if (mainFeaturesHasError && originalMovieData.imdbid) {
                        fetchFeaturesByImdbId(originalMovieData.imdbid);
                      }
                      if (episodeFeaturesHasError && bestMovieData.imdbid && bestMovieData.imdbid !== originalMovieData.imdbid) {
                        fetchFeaturesByImdbId(bestMovieData.imdbid);
                      }
                    }}
                    disabled={isFeaturesLoading}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors"
                    style={{
                      backgroundColor: isFeaturesLoading ? (isDark ? '#666' : '#ccc') : themeColors.warning,
                      color: isFeaturesLoading ? (isDark ? '#999' : '#666') : (isDark ? '#000' : '#fff'),
                      cursor: isFeaturesLoading ? 'not-allowed' : 'pointer',
                      opacity: isFeaturesLoading ? '0.7' : '1'
                    }}
                    onMouseEnter={(e) => {
                      if (!isFeaturesLoading) {
                        e.target.style.opacity = '0.8';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isFeaturesLoading) {
                        e.target.style.opacity = '1';
                      }
                    }}
                    title={isFeaturesLoading ? "Loading features..." : "Retry loading movie features"}
                  >
                    {isFeaturesLoading ? (
                      <>
                        <div className="w-3 h-3 rounded-full animate-spin" style={{
                          borderTop: '2px solid transparent',
                          borderRight: `2px solid ${isDark ? '#999' : '#666'}`,
                          borderBottom: `2px solid ${isDark ? '#999' : '#666'}`,
                          borderLeft: `2px solid ${isDark ? '#999' : '#666'}`
                        }}></div>
                        <span>Loading</span>
                      </>
                    ) : (
                      <>
                        <span>🔄</span>
                        <span>Retry</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="text-xs mt-1" style={{color: themeColors.warning}}>
                  {mainFeaturesHasError && `Main features: ${featuresByImdbId[originalMovieData.imdbid]?.error}`}
                  {episodeFeaturesHasError && `Episode features: ${featuresByImdbId[bestMovieData.imdbid]?.error}`}
                </div>
              </div>
            )}
            
            {/* Movie Identification Source */}
            {bestMovieData?.reason && bestMovieData.reason.includes('Directory match') && (
              <div className="rounded-lg p-2 mb-2" 
                   style={{
                     backgroundColor: isDark ? '#1a2332' : '#f0f8ff',
                     border: `1px solid ${themeColors.link}`
                   }}>
                <div className="flex items-center gap-2 text-sm" style={{color: themeColors.linkHover}}>
                  <span>📁</span>
                  <span>Identified from directory name</span>
                </div>
                <div className="text-xs mt-1" style={{color: themeColors.link}}>
                  {bestMovieData.reason}
                </div>
              </div>
            )}
            
            {/* Features API Details */}
            {featuresData?.data?.[0]?.attributes ? (
              <div className="space-y-1 text-xs">
                {/* Show Episode IMDb first (for upload) if available, otherwise TV IMDb */}
                {bestMovieData.kind === 'episode' && bestMovieData.imdbid ? (
                  <>
                    {/* Episode IMDb - Primary for upload */}
                    <div>
                      <span className="font-semibold" style={{color: themeColors.success}}>🎯 Upload IMDb:</span>{" "}
                      <a 
                        href={`https://www.imdb.com/title/tt${bestMovieData.imdbid}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline font-mono font-bold"
                      style={{color: themeColors.success}}
                      onMouseEnter={(e) => e.target.style.color = themeColors.success}
                      onMouseLeave={(e) => e.target.style.color = themeColors.success}
                      >
                        {bestMovieData.imdbid}
                      </a>
                      <span className="text-xs ml-2" style={{color: themeColors.success}}>(Episode)</span>
                    </div>
                    
                    {/* TV Series IMDb - Reference */}
                    <div>
                      <span style={{color: themeColors.link}}>TV Series:</span>{" "}
                      <a 
                        href={`https://www.imdb.com/title/tt${originalMovieData.imdbid}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline font-mono"
                        style={{color: themeColors.linkHover}}
                        onMouseEnter={(e) => e.target.style.color = themeColors.link}
                        onMouseLeave={(e) => e.target.style.color = themeColors.linkHover}
                      >
                        {originalMovieData.imdbid}
                      </a>
                    </div>
                  </>
                ) : (
                  /* Main content IMDb - Primary for upload */
                  <div>
                    <span className="font-semibold" style={{color: '#28a745'}}>🎯 Upload IMDb:</span>{" "}
                    <a 
                      href={`https://www.imdb.com/title/tt${originalMovieData.imdbid}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline font-mono font-bold"
                      style={{color: themeColors.success}}
                      onMouseEnter={(e) => e.target.style.color = themeColors.success}
                      onMouseLeave={(e) => e.target.style.color = themeColors.success}
                    >
                      {originalMovieData.imdbid}
                    </a>
                    <span className="text-xs ml-2" style={{color: '#28a745'}}>
                      ({(() => {
                        const featureType = featuresData?.data?.[0]?.attributes?.feature_type;
                        if (featureType) {
                          // Convert feature_type to display format
                          switch (featureType.toLowerCase()) {
                            case 'movie': return 'Movie';
                            case 'tvshow':
                            case 'tv_series': return 'TV Series';
                            case 'episode': return 'Episode';
                            default: return featureType.replace('_', ' ');
                          }
                        }
                        // Fallback to bestMovieData kind
                        return bestMovieData.kind === 'tv series' ? 'TV Series' : 'Movie';
                      })()})
                    </span>
                  </div>
                )}
              </div>
            ) : (
              /* Fallback to XML-RPC data only */
              <div className="grid grid-cols-1 gap-2 text-xs">
                {bestMovieData.season && bestMovieData.season > 0 && (
                  <div>
                    <span style={{color: themeColors.link}}>Season:</span>{" "}
                    <span style={{color: themeColors.text}}>{bestMovieData.season}</span>
                  </div>
                )}
                {bestMovieData.episode && bestMovieData.episode > 0 && (
                  <div>
                    <span style={{color: themeColors.link}}>Episode:</span>{" "}
                    <span style={{color: themeColors.text}}>{bestMovieData.episode}</span>
                  </div>
                )}
                
                {/* Show Episode IMDb first (for upload) if available, otherwise TV IMDb */}
                {bestMovieData.kind === 'episode' && bestMovieData.imdbid ? (
                  <>
                    {/* Episode IMDb - Primary for upload */}
                    <div>
                      <span className="font-semibold" style={{color: themeColors.success}}>🎯 Upload IMDb:</span>{" "}
                      <a 
                        href={`https://www.imdb.com/title/tt${bestMovieData.imdbid}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline font-mono font-bold"
                      style={{color: themeColors.success}}
                      onMouseEnter={(e) => e.target.style.color = themeColors.success}
                      onMouseLeave={(e) => e.target.style.color = themeColors.success}
                      >
                        {bestMovieData.imdbid}
                      </a>
                      <span className="text-xs ml-2" style={{color: themeColors.success}}>(Episode)</span>
                    </div>
                    
                    {/* TV Series IMDb - Reference */}
                    <div>
                      <span style={{color: themeColors.link}}>TV Series:</span>{" "}
                      <a 
                        href={`https://www.imdb.com/title/tt${originalMovieData.imdbid}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline font-mono"
                        style={{color: themeColors.linkHover}}
                        onMouseEnter={(e) => e.target.style.color = themeColors.link}
                        onMouseLeave={(e) => e.target.style.color = themeColors.linkHover}
                      >
                        {originalMovieData.imdbid}
                      </a>
                    </div>
                  </>
                ) : (
                  /* Main content IMDb - Primary for upload (fallback) */
                  <div>
                    <span className="font-semibold" style={{color: '#28a745'}}>🎯 Upload IMDb:</span>{" "}
                    <a 
                      href={`https://www.imdb.com/title/tt${originalMovieData.imdbid}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline font-mono font-bold"
                      style={{color: themeColors.success}}
                      onMouseEnter={(e) => e.target.style.color = themeColors.success}
                      onMouseLeave={(e) => e.target.style.color = themeColors.success}
                    >
                      {originalMovieData.imdbid}
                    </a>
                    <span className="text-xs ml-2" style={{color: '#28a745'}}>
                      ({bestMovieData.kind === 'tv series' ? 'TV Series' : 'Movie'})
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (movieUpdateLoading[videoPath]) {
    return (
      <span className="flex items-center gap-1" style={{color: themeColors.link}}>
        <div className="w-3 h-3 border rounded-full animate-spin" style={{borderColor: themeColors.link, borderTopColor: 'transparent'}}></div>
        <span>Updating movie information...</span>
      </span>
    );
  }

  return null;
};