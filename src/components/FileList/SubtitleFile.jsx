import React from 'react';
import { formatFileSize } from '../../utils/fileUtils.js';

export const SubtitleFile = ({ 
  subtitle,
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
  uploadEnabled = true, // New prop for upload status
  onToggleUpload, // New prop for upload toggle callback
  uploadResults, // New prop for upload results
  hashCheckResults, // New prop for CheckSubHash results
  colors,
  isDark
}) => {
  const getFilteredLanguageOptions = (searchTerm = '') => {
    const options = getLanguageOptionsForSubtitle(subtitle);
    if (!searchTerm) return options;
    
    return options.filter(lang => 
      lang.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lang.iso639?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  return (
    <div 
      className={`rounded-lg p-3 border transition-all cursor-pointer shadow-sm ${
        uploadEnabled 
          ? 'hover:shadow-md' 
          : 'opacity-75 hover:opacity-90'
      }`}
      style={{
        backgroundColor: colors?.cardBackground || '#fff',
        borderColor: uploadEnabled ? (colors?.success || '#9EC068') : (colors?.border || '#ccc'),
        borderLeft: uploadEnabled ? `4px solid ${colors?.success || '#9EC068'}` : `4px solid ${colors?.border || '#ccc'}`
      }}
      onClick={(e) => {
        // Prevent toggle when clicking on interactive elements
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.tagName === 'SELECT' || e.target.tagName === 'A' || e.target.closest('button, a, select, input')) {
          return;
        }
        onToggleUpload && onToggleUpload(subtitle.fullPath, !uploadEnabled);
      }}
    >
      <div className="flex items-center gap-3" style={{color: colors?.textSecondary || '#454545'}}>
        <span className="text-xl">💬</span>
        
        {/* Upload Toggle Checkbox */}
        <div className="flex items-center">
          <label className="flex items-center cursor-pointer group">
            <input
              type="checkbox"
              checked={uploadEnabled}
              onChange={(e) => onToggleUpload && onToggleUpload(subtitle.fullPath, e.target.checked)}
              className="w-4 h-4 rounded focus:ring-2"
              style={{
                accentColor: colors?.success || '#9EC068',
                backgroundColor: colors?.cardBackground || '#fff',
                borderColor: colors?.border || '#ccc'
              }}
            />
            <span className={`ml-2 text-xs font-medium transition-colors`}
              style={{
                color: uploadEnabled ? (colors?.success || '#9EC068') : (colors?.textMuted || '#808080')
              }}>
              {uploadEnabled ? 'Upload' : 'Skip'}
            </span>
          </label>
        </div>
        
        <div className="flex-1">
          <div className={`font-medium transition-colors`}
            style={{
              color: uploadEnabled ? (colors?.text || '#000') : (colors?.textMuted || '#808080')
            }}>
            {subtitle.name}
          </div>
          <div className={`text-sm flex items-center gap-4 mt-1 transition-colors`}
            style={{
              color: uploadEnabled ? (colors?.textSecondary || '#454545') : (colors?.textMuted || '#808080')
            }}>
            <span>📏 {formatFileSize(subtitle.size)}</span>
            
            {/* File Type/Kind */}
            <span className="flex items-center gap-1">
              <span>📄</span>
              <span>
                {subtitle.detectedLanguage && 
                 typeof subtitle.detectedLanguage === 'object' && 
                 subtitle.detectedLanguage.file_kind
                  ? subtitle.detectedLanguage.file_kind
                  : 'Subtitle File'}
              </span>
            </span>
            
            {/* Detected Language Status */}
            {subtitle.detectedLanguage === 'detecting' && (
              <span className="flex items-center gap-1" style={{color: '#2878C0'}}>
                <div className="w-3 h-3 border rounded-full animate-spin" style={{borderColor: '#2878C0', borderTopColor: 'transparent'}}></div>
                <span>Detecting...</span>
              </span>
            )}
            
            {subtitle.detectedLanguage && typeof subtitle.detectedLanguage === 'string' && 
             !['detecting', 'error'].includes(subtitle.detectedLanguage) && (
              <span className="flex items-center gap-1" style={{color: '#808080'}}>
                <span>❌</span>
                <span>{subtitle.detectedLanguage}</span>
              </span>
            )}

            {/* Preview Button */}
            <button
              onClick={() => onSubtitlePreview(subtitle)}
              className={`text-xs underline transition-colors`}
              style={{
                color: uploadEnabled ? (colors?.link || '#185DA0') : (colors?.textMuted || '#808080')
              }}
              onMouseEnter={(e) => {
                e.target.style.color = uploadEnabled ? (colors?.linkHover || '#132979') : (colors?.textSecondary || '#454545');
              }}
              onMouseLeave={(e) => {
                e.target.style.color = uploadEnabled ? (colors?.link || '#185DA0') : (colors?.textMuted || '#808080');
              }}
            >
              Preview
            </button>
          </div>
          
          {/* Language Selection Dropdown - Only show if upload is enabled */}
          {uploadEnabled && (
            <div className="mt-2">
              <select
                value={getSubtitleLanguage(subtitle)}
                onChange={(e) => onSubtitleLanguageChange(subtitle.fullPath, e.target.value)}
                className="rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 min-w-[200px]"
                style={{
                  backgroundColor: isDark ? '#374151' : (colors?.inputBackground || '#f4f4f4'),
                  color: isDark ? '#f9fafb' : (colors?.text || '#454545'),
                  border: `1px solid ${colors?.border || '#ccc'}`,
                  focusRingColor: colors?.success || '#9EC068'
                }}
              >
                <option value="" style={{
                  backgroundColor: isDark ? '#374151' : '#fff',
                  color: isDark ? '#f9fafb' : '#454545'
                }}>Select upload language...</option>
                {getLanguageOptionsForSubtitle(subtitle).map((lang) => (
                  <option key={lang.code} value={lang.code} style={{
                    backgroundColor: isDark ? '#374151' : '#fff',
                    color: isDark ? '#f9fafb' : '#454545'
                  }}>
                    {lang.flag} {lang.displayName} ({lang.iso639?.toUpperCase()})
                    {lang.isDetected ? ` - ${(lang.confidence * 100).toFixed(1)}%` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Upload result status */}
          {uploadResults && uploadResults[subtitle.fullPath] && (
            <div className="mt-2">
              {(() => {
                const result = uploadResults[subtitle.fullPath];
                
                // Check for error responses first (anything that's not "200 OK")
                if (result.status && result.status !== '200 OK') {
                  return (
                    <div className="text-sm">
                      <span className="text-red-400">❌ Upload failed:</span>
                      <div className="text-red-300 text-xs mt-1 whitespace-pre-wrap">
                        {result.status}
                      </div>
                    </div>
                  );
                }
                
                // Check for successful new upload (from UploadSubtitles after alreadyindb=0)
                if (result.status === '200 OK' && result.data && !result.alreadyindb) {
                  // This is a successful new upload response
                  const isDirectUrl = typeof result.data === 'string' && result.data.includes('opensubtitles.org');
                  return (
                    <div className="text-sm">
                      <span className="text-green-400">🎉 Successfully Uploaded as NEW!</span>
                      {isDirectUrl && (
                        <>
                          <span className="text-gray-400"> - </span>
                          <button
                            className="text-blue-300 hover:text-blue-200 underline bg-transparent border-none cursor-pointer p-0 font-semibold inline"
                            title="View newly uploaded subtitle on OpenSubtitles.org"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              window.open(result.data, '_blank', 'noopener,noreferrer');
                            }}
                          >
                            View New Subtitle
                          </button>
                        </>
                      )}
                    </div>
                  );
                }
                
                // Check for alreadyindb=1 (subtitle already exists - duplicate)
                if (result.alreadyindb === 1 || result.alreadyindb === '1') {
                  // When alreadyindb=1, subtitle already exists in database (duplicate)
                  const subtitleUrl = result.data;
                  
                  return (
                    <div className="text-sm">
                      <span className="text-yellow-400">⚠️ Already in Database</span>
                      {subtitleUrl && (
                        <>
                          <span className="text-gray-400"> - </span>
                          <button
                            className="text-blue-300 hover:text-blue-200 underline bg-transparent border-none cursor-pointer p-0 font-semibold inline"
                            title="View existing subtitle on OpenSubtitles.org"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              window.open(subtitleUrl, '_blank', 'noopener,noreferrer');
                            }}
                          >
                            View Existing Subtitle
                          </button>
                        </>
                      )}
                    </div>
                  );
                } else if (result.alreadyindb === 0 || result.alreadyindb === '0') {
                  // When alreadyindb=0, subtitle is not uploaded yet, show found existing subtitle info
                  const subtitleData = Array.isArray(result.data) ? result.data[0] : null;
                  const subtitleId = subtitleData?.IDSubtitle;
                  
                  return (
                    <div className="text-sm">
                      <span className="text-orange-400">🔄 Found Existing</span>
                      {subtitleId && (
                        <>
                          <span className="text-gray-400"> - </span>
                          <button
                            className="text-blue-300 hover:text-blue-200 underline bg-transparent border-none cursor-pointer p-0 font-semibold inline"
                            title="View existing subtitle on OpenSubtitles.org"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              window.open(`https://www.opensubtitles.org/subtitles/${subtitleId}`, '_blank', 'noopener,noreferrer');
                            }}
                          >
                            View Existing
                          </button>
                        </>
                      )}
                    </div>
                  );
                } else {
                  // For other cases, show generic success
                  return (
                    <div className="text-sm">
                      <span className="text-green-400">✅ Upload Complete</span>
                    </div>
                  );
                }
              })()}
            </div>
          )}

          {/* Disabled state message */}
          {!uploadEnabled && !uploadResults?.[subtitle.fullPath] && (
            <div className="text-xs mt-2">
              {(() => {
                // Check if this subtitle was auto-unselected due to CheckSubHash results
                const hashResult = hashCheckResults?.[subtitle.fullPath];
                if (hashResult && hashResult.status === 'exists' && hashResult.subtitleUrl) {
                  return (
                    <div className="flex items-center gap-2">
                      <span className="italic" style={{color: colors?.textMuted || '#808080'}}>
                        Auto-unselected: Already uploaded
                      </span>
                      <a 
                        href={hashResult.subtitleUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs underline font-medium"
                        style={{
                          color: isDark ? '#60a5fa' : (colors?.link || '#2878C0')
                        }}
                        onClick={(e) => e.stopPropagation()} // Prevent toggle when clicking link
                      >
                        View Existing (ID: {hashResult.subtitleId})
                      </a>
                    </div>
                  );
                } else {
                  return (
                    <div className="italic" style={{color: colors?.textMuted || '#808080'}}>
                      This subtitle will not be uploaded
                    </div>
                  );
                }
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};