import React, { useState } from 'react';

export const SubtitleUploadOptions = ({
  subtitlePath,
  uploadOptions = {},
  onUpdateOptions,
  colors,
  isDark
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleFieldChange = (field, value) => {
    const newOptions = {
      ...uploadOptions,
      [field]: value
    };
    onUpdateOptions(subtitlePath, newOptions);
  };

  const currentOptions = uploadOptions || {};

  return (
    <div className="mt-2">
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
                checked={currentOptions.hearingimpaired === '1'}
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
                checked={currentOptions.highdefinition === '1'}
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
                checked={currentOptions.automatictranslation === '1'}
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
                checked={currentOptions.foreignpartsonly === '1'}
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

          {/* Summary */}
          {(currentOptions.moviereleasename || currentOptions.subauthorcomment || currentOptions.subtranslator || 
            currentOptions.hearingimpaired === '1' || currentOptions.highdefinition === '1' || 
            currentOptions.automatictranslation === '1' || currentOptions.foreignpartsonly === '1') && (
            <div className="pt-2 mt-2 border-t text-xs" style={{ borderColor: colors.border, color: colors.textMuted }}>
              <div className="flex flex-wrap gap-1">
                {currentOptions.hearingimpaired === '1' && <span className="px-1 rounded" style={{ backgroundColor: colors.info + '20', color: colors.info }}>🦻 HI</span>}
                {currentOptions.highdefinition === '1' && <span className="px-1 rounded" style={{ backgroundColor: colors.success + '20', color: colors.success }}>📺 HD</span>}
                {currentOptions.automatictranslation === '1' && <span className="px-1 rounded" style={{ backgroundColor: colors.warning + '20', color: colors.warning }}>🤖 Auto</span>}
                {currentOptions.foreignpartsonly === '1' && <span className="px-1 rounded" style={{ backgroundColor: colors.link + '20', color: colors.link }}>🎭 Foreign</span>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};