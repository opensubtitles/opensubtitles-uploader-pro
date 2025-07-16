import React from 'react';
import { useTheme } from '../contexts/ThemeContext.jsx';
import { getThemeStyles } from '../utils/themeUtils.js';

/**
 * Component to display video metadata (FPS, duration, file size, etc.)
 * Shows in a clean, compact format with loading and error states
 */
export const VideoMetadataDisplay = ({ 
  filePath, 
  metadata, 
  isLoading, 
  error,
  showDetailed = false 
}) => {
  const { colors, isDark } = useTheme();
  const styles = getThemeStyles(colors);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm" style={{ color: colors.text }}>
        <div className="w-3 h-3 border border-blue-300 border-t-transparent rounded-full animate-spin"></div>
        <span>Extracting video metadata...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm" style={{ color: colors.error }}>
        <span>⚠️</span>
        <span>Metadata extraction failed: {error}</span>
      </div>
    );
  }

  if (!metadata) {
    return null;
  }

  const {
    fps,
    durationFormatted,
    width,
    height,
    resolution,
    videoCodec,
    audioCodec,
    bitrate,
    filesize
  } = metadata;

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format bitrate
  const formatBitrate = (bps) => {
    if (!bps) return 'unknown';
    const kbps = Math.round(bps / 1000);
    return `${kbps} kbps`;
  };

  return (
    <div className="space-y-2">
      {/* Main metadata row - always shown */}
      <div className="flex items-center gap-4 text-sm" style={{ color: colors.text }}>
        {durationFormatted && durationFormatted !== 'unknown' && (
          <div className="flex items-center gap-1">
            <span>⏱️</span>
            <span className="font-medium">{durationFormatted}</span>
          </div>
        )}
        
        {fps && (
          <div className="flex items-center gap-1">
            <span>📽️</span>
            <span className="font-medium">{fps} FPS</span>
          </div>
        )}
        
        {resolution && resolution !== 'unknown' && (
          <div className="flex items-center gap-1">
            <span>📺</span>
            <span className="font-medium">{resolution}</span>
          </div>
        )}
        
        {filesize && (
          <div className="flex items-center gap-1">
            <span>📁</span>
            <span className="font-medium">{formatFileSize(filesize)}</span>
          </div>
        )}
      </div>

      {/* Detailed metadata - shown when expanded */}
      {showDetailed && (
        <div className="grid grid-cols-2 gap-2 text-xs p-3 rounded-lg" 
             style={{ 
               backgroundColor: isDark ? '#1a1a1a' : '#f8f9fa',
               border: `1px solid ${colors.border}`
             }}>
          <div className="space-y-1">
            <div className="font-semibold" style={{ color: colors.text }}>Video Info</div>
            <div style={{ color: colors.textSecondary }}>
              <div>Codec: {videoCodec}</div>
              <div>Resolution: {width}x{height}</div>
              <div>FPS: {fps}</div>
              {bitrate && (
                <div>Bitrate: {formatBitrate(bitrate)}</div>
              )}
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="font-semibold" style={{ color: colors.text }}>Audio Info</div>
            <div style={{ color: colors.textSecondary }}>
              <div>Codec: {audioCodec}</div>
              <div>Sample Rate: {metadata.sampleRate} Hz</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};