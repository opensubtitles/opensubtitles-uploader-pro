import React from 'react';
import { useMovieSearch } from '../hooks/useMovieSearch.js';

export const MovieSearch = ({ 
  isOpen, 
  onMovieChange, 
  onClose, 
  itemPath, 
  movieUpdateLoading,
  themeColors, 
  isDark 
}) => {
  const {
    movieSearchQuery,
    movieSearchResults,
    movieSearchLoading,
    handleMovieSearch,
    handleMovieSelect,
    extractImdbId,
    isImdbInput
  } = useMovieSearch(onMovieChange);

  if (!isOpen) return null;

  return (
    <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: themeColors.cardBackground, border: `1px solid ${themeColors.border}` }} data-movie-search>
      <div className="text-sm mb-2" style={{ color: themeColors.text }}>
        Search by movie title, IMDB ID, or IMDB URL:
      </div>
      <input
        type="text"
        placeholder="Movie title, IMDB ID (tt0133093), or IMDB URL..."
        value={movieSearchQuery}
        onChange={(e) => handleMovieSearch(e.target.value)}
        className="w-full px-3 py-2 text-sm rounded border focus:outline-none focus:ring-2 transition-colors"
        style={{
          backgroundColor: themeColors.background,
          borderColor: themeColors.border,
          color: themeColors.text,
          focusRingColor: themeColors.primary
        }}
        onFocus={(e) => {
          e.target.style.borderColor = themeColors.primary;
          e.target.style.boxShadow = `0 0 0 2px ${themeColors.primary}20`;
        }}
        onBlur={(e) => {
          e.target.style.borderColor = themeColors.border;
          e.target.style.boxShadow = 'none';
        }}
        autoFocus
      />
      
      {movieSearchLoading && (
        <div className="mt-2 text-sm flex items-center gap-2" style={{ color: themeColors.textMuted }}>
          <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"></div>
          Searching...
        </div>
      )}
      
      {movieSearchResults.length > 0 && (
        <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
          {movieSearchResults.map((movie, index) => (
            <button
              key={movie.id || index}
              onClick={() => handleMovieSelect(itemPath, movie)}
              disabled={movieUpdateLoading?.[itemPath]}
              className="w-full text-left p-2 rounded text-sm border transition-colors hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: themeColors.background,
                borderColor: themeColors.border,
                color: themeColors.text
              }}
              onMouseEnter={(e) => {
                if (!movieUpdateLoading?.[itemPath]) {
                  e.target.style.backgroundColor = isDark ? '#444444' : '#f8f9fa';
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = themeColors.background;
              }}
            >
              <div className="flex items-center gap-2">
                {movieUpdateLoading?.[itemPath] ? (
                  <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"></div>
                ) : (
                  <span>🎬</span>
                )}
                <div className="flex-1">
                  <div className="font-medium">
                    {movie.name || movie.title || 'Unknown Title'}
                    {(movie.year) && ` (${movie.year})`}
                  </div>
                  <div className="text-xs" style={{ color: themeColors.textMuted }}>
                    {movie.kind && `${movie.kind} • `}
                    IMDb: {movie.id || movie.imdbid || 'N/A'}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
      
      {movieSearchQuery && !movieSearchLoading && movieSearchResults.length === 0 && (
        <div className="mt-2 text-sm text-center py-4" style={{ color: themeColors.textMuted }}>
          No movies found. Try a different search term.
        </div>
      )}
      
      <div className="mt-2 text-xs" style={{ color: themeColors.textSecondary }}>
        Examples: "The Matrix", "tt0133093", "https://www.imdb.com/title/tt0133093/"
      </div>
    </div>
  );
};