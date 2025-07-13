import React, { useState, useEffect } from 'react';
import { CacheService } from '../services/cache.js';

export const DebugPanel = ({ 
  debugMode, 
  debugInfo, 
  languagesLoading, 
  languagesError,
  movieGuesses,
  featuresByImdbId,
  hashCheckResults,
  hashCheckLoading,
  hashCheckProcessed,
  getHashCheckSummary,
  toggleDebugMode,
  clearAllCache,
  colors,
  isDark
}) => {
  const [cacheInfo, setCacheInfo] = useState(null);

  // Update cache info when debug panel opens or cache is cleared
  useEffect(() => {
    const updateCacheInfo = () => {
      setCacheInfo(CacheService.getCacheSize());
    };
    
    updateCacheInfo();
    
    // Update cache info every 5 seconds when debug panel is open
    const interval = setInterval(updateCacheInfo, 5000);
    return () => clearInterval(interval);
  }, []);

  // Default to light theme colors if not provided
  const themeColors = colors || {
    cardBackground: '#fff',
    border: '#ccc',
    text: '#000',
    textSecondary: '#454545',
    textMuted: '#808080',
    link: '#2878C0',
    linkHover: '#185DA0',
    success: '#9EC068',
    error: '#dc3545',
    info: '#17a2b8'
  };
  return (
    <details className="mt-6">
      <summary className="rounded-lg p-3 cursor-pointer text-sm flex items-center justify-between shadow-sm" 
               style={{
                 backgroundColor: themeColors.cardBackground,
                 border: `1px solid ${themeColors.border}`,
                 color: themeColors.textSecondary
               }}>
        <div className="flex items-center gap-2">
          <span>🐛 Debug Information</span>
          {languagesLoading ? (
            <div className="flex items-center gap-2" style={{color: themeColors.link}}>
              <div className="w-3 h-3 rounded-full animate-spin" style={{
                borderTop: `2px solid transparent`,
                borderRight: `2px solid ${themeColors.link}`,
                borderBottom: `2px solid ${themeColors.link}`,
                borderLeft: `2px solid ${themeColors.link}`
              }}></div>
              <span>Loading...</span>
            </div>
          ) : languagesError ? (
            <span style={{color: themeColors.error}}>❌ Error</span>
          ) : null}
        </div>
        <label 
          className="flex items-center gap-2 text-sm cursor-pointer select-none"
          style={{color: themeColors.textSecondary}}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={debugMode}
            onChange={toggleDebugMode}
            className="accent-blue-500"
            style={{accentColor: themeColors.link}}
          />
          Debug mode
        </label>
      </summary>
      
      <div className="rounded-lg p-4 mt-2 shadow-sm" 
           style={{
             backgroundColor: themeColors.cardBackground,
             border: `1px solid ${themeColors.border}`
           }}>
        <div className="rounded p-3 text-xs font-mono max-h-40 overflow-y-auto" 
             style={{
               backgroundColor: isDark ? '#1e1e1e' : '#f4f4f4',
               border: `1px solid ${themeColors.border}`
             }}>
          <div className="mb-2" style={{color: themeColors.textSecondary}}>
            Debug mode: <span style={{color: debugMode ? themeColors.success : themeColors.link, fontWeight: 'bold'}}>
              {debugMode ? "ON" : "OFF"}
            </span>
            <div className="text-xs mt-1" style={{color: themeColors.textMuted}}>
              {debugMode 
                ? "📋 Showing ALL console messages (for users without dev tools access)"
                : "🔧 Showing basic file processing messages"
              }
            </div>
          </div>
          
          {/* Debug data display - hidden from user */}
          {/* 
          {(Object.keys(movieGuesses).length > 0 || Object.keys(featuresByImdbId).length > 0) && (
            <div className="mb-2" style={{color: themeColors.textSecondary}}>
              {Object.keys(movieGuesses).length > 0 && (
                <>
                  <span className="font-bold" style={{color: themeColors.link}}>[DEBUG] movieGuesses:</span>
                  <pre className="whitespace-pre-wrap" style={{margin: 0, fontSize: '10px', color: themeColors.textMuted}}>
                    {JSON.stringify(movieGuesses, null, 2)}
                  </pre>
                </>
              )}
              {Object.keys(featuresByImdbId).length > 0 && (
                <>
                  <span className="font-bold" style={{color: themeColors.link}}>[DEBUG] featuresByImdbId:</span>
                  <pre className="whitespace-pre-wrap" style={{margin: 0, fontSize: '10px', color: themeColors.textMuted}}>
                    {JSON.stringify(featuresByImdbId, null, 2)}
                  </pre>
                </>
              )}
            </div>
          )}
          */}
          
          {/* Debug log messages */}
          {debugInfo.length === 0 ? (
            <div style={{color: themeColors.textMuted}}>
              {debugMode 
                ? "No console messages yet. All browser console output will appear here."
                : "No debug info yet. Try dragging and dropping files."
              }
            </div>
          ) : (
            debugInfo.map((info, idx) => (
              <div key={idx} style={{color: themeColors.textSecondary, lineHeight: '1.3'}}>{info}</div>
            ))
          )}
        </div>
        
        {/* CheckSubHash Results */}
        {hashCheckResults && Object.keys(hashCheckResults).length > 0 && (
          <div className="mt-3 p-3 rounded" 
               style={{
                 backgroundColor: isDark ? '#2a2a2a' : '#f8f9fa',
                 border: `1px solid ${themeColors.border}`
               }}>
            <div className="flex items-center gap-2 mb-2">
              <span style={{color: themeColors.textSecondary, fontWeight: 'bold'}}>
                📝 [CheckSubHash] Subtitle Hash Check Results
              </span>
              {hashCheckLoading && (
                <div className="w-3 h-3 rounded-full animate-spin" style={{
                  borderTop: `2px solid transparent`,
                  borderRight: `2px solid ${themeColors.link}`,
                  borderBottom: `2px solid ${themeColors.link}`,
                  borderLeft: `2px solid ${themeColors.link}`
                }}></div>
              )}
            </div>
            
            {getHashCheckSummary && (
              <div className="mb-2 text-xs" style={{color: themeColors.textMuted}}>
                <span>Summary: </span>
                {(() => {
                  const summary = getHashCheckSummary();
                  return (
                    <span>
                      {summary.total} total, {' '}
                      <span style={{color: themeColors.success}}>{summary.new} new</span>, {' '}
                      <span style={{color: themeColors.error}}>{summary.exists} exists</span>
                      {summary.pending > 0 && <span>, {summary.pending} pending</span>}
                      {summary.error > 0 && <span>, {summary.error} errors</span>}
                    </span>
                  );
                })()}
              </div>
            )}
            
            <div className="text-xs font-mono space-y-1">
              {Object.values(hashCheckResults).map((result, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span style={{color: themeColors.textSecondary}}>
                    {result.filename}
                  </span>
                  <span style={{color: themeColors.textMuted, fontFamily: 'monospace'}}>
                    {result.hash || 'no hash'}
                  </span>
                  <span style={{
                    color: result.status === 'exists' ? themeColors.error : 
                           result.status === 'new' ? themeColors.success :
                           result.status === 'error' ? themeColors.error :
                           themeColors.textMuted
                  }}>
                    {result.status === 'exists' ? 'uploaded' :
                     result.status === 'new' ? 'not uploaded yet' :
                     result.status === 'error' ? 'error' :
                     result.status === 'pending' ? 'checking...' :
                     result.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Cache Info and Clear Cache Button */}
        <div className="mt-3 flex items-center justify-between">
          <div className="text-sm" style={{ color: themeColors.textSecondary }}>
            {cacheInfo && (
              <span>
                📦 Cache: <span style={{ color: themeColors.link, fontWeight: 'bold' }}>
                  {cacheInfo.formattedSize}
                </span>
                {cacheInfo.itemCount > 0 && (
                  <span style={{ color: themeColors.textMuted }}>
                    {' '}({cacheInfo.itemCount} items)
                  </span>
                )}
              </span>
            )}
          </div>
          <button
            onClick={() => {
              clearAllCache();
              // Update cache info immediately after clearing
              setTimeout(() => setCacheInfo(CacheService.getCacheSize()), 100);
            }}
            className="text-white px-4 py-2 rounded-lg transition-colors text-sm"
            style={{
              backgroundColor: themeColors.link
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = themeColors.linkHover;
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = themeColors.link;
            }}
            title="Delete all stored language and XML-RPC cache"
          >
            🗑️ Clear All Cache
          </button>
        </div>
      </div>
    </details>
  );
};