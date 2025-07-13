import React from 'react';
import { VIDEO_EXTENSIONS, SUBTITLE_EXTENSIONS } from '../utils/constants.js';

export const DropZone = ({ 
  isDragOver, 
  onDrop, 
  onDragOver, 
  onDragLeave, 
  browserCapabilities,
  hasFiles,
  onClearFiles,
  colors,
  isDark
}) => {

  // Default to light theme colors if not provided
  const themeColors = colors || {
    cardBackground: '#fff',
    border: '#ccc',
    success: '#9EC068',
    text: '#000',
    textSecondary: '#454545'
  };

  const hoverBg = isDark ? '#3a3a3a' : '#DCF2B8';
  const normalBg = themeColors.cardBackground;

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-12 mb-6 text-center transition-all duration-300 shadow-sm`}
      style={{
        borderColor: isDragOver ? themeColors.success : themeColors.border,
        backgroundColor: isDragOver ? hoverBg : normalBg,
        transform: isDragOver ? 'scale(1.02)' : 'scale(1)',
        color: themeColors.text
      }}
      onMouseEnter={(e) => {
        if (!isDragOver) {
          e.target.style.borderColor = themeColors.success;
          e.target.style.backgroundColor = hoverBg;
        }
      }}
      onMouseLeave={(e) => {
        if (!isDragOver) {
          e.target.style.borderColor = themeColors.border;
          e.target.style.backgroundColor = normalBg;
        }
      }}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragEnter={onDragOver}
      onDragLeave={onDragLeave}
    >
      <div className="space-y-4">
        <h3 className="text-2xl font-semibold" style={{color: themeColors.text || '#000'}}>
          Drop your media files or folders here
        </h3>
        <p style={{color: themeColors.textSecondary || '#454545'}}>
          Supports recursive folder scanning for video files ({VIDEO_EXTENSIONS.slice(0, 5).join(', ')}, etc.) 
          and subtitle files ({SUBTITLE_EXTENSIONS.slice(0, 5).join(', ')}, etc.)
        </p>
        <p className="text-sm font-medium" style={{color: themeColors.link || '#185DA0'}}>
          📁 Drag entire movie folders - automatically finds and pairs video files with subtitles
        </p>
        <div className="flex justify-center space-x-8 mt-6">
          <div className="text-center">
            <div className="text-2xl mb-1">🎬</div>
            <div className="text-xs" style={{color: themeColors.textMuted || '#808080'}}>Video Files</div>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-1">📝</div>
            <div className="text-xs" style={{color: themeColors.textMuted || '#808080'}}>Subtitles</div>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-1">📁</div>
            <div className="text-xs" style={{color: themeColors.textMuted || '#808080'}}>Folders</div>
          </div>
        </div>
      </div>
      
      {hasFiles && (
        <button
          onClick={onClearFiles}
          className="absolute top-4 right-4 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors shadow-sm"
          style={{
            backgroundColor: themeColors.link || '#2878C0'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = themeColors.linkHover || '#185DA0';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = themeColors.link || '#2878C0';
          }}
        >
          Clear All
        </button>
      )}
    </div>
  );
};

