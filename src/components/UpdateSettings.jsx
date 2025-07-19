import React from 'react';
import { useAppUpdate } from '../hooks/useAppUpdate.js';
import { useTheme } from '../contexts/ThemeContext.jsx';

/**
 * Update settings component for configuration panel
 */
const UpdateSettings = () => {
  const { isDark } = useTheme();
  const {
    isStandalone,
    updateAvailable,
    updateInfo,
    isChecking,
    isInstalling,
    error,
    lastChecked,
    autoCheckEnabled,
    currentVersion,
    checkForUpdates,
    installUpdate,
    restartApp,
    startAutoUpdates,
    stopAutoUpdates,
    clearUpdateCache,
    getLastCheckedFormatted
  } = useAppUpdate();

  // Don't render anything when not in standalone mode (browser)
  if (!isStandalone) {
    return null;
  }

  const handleCheckForUpdates = async () => {
    await checkForUpdates(true); // Force check
  };

  const handleInstallUpdate = async () => {
    const result = await installUpdate();
    if (result.success) {
      console.log('✅ Update installed successfully');
    }
  };

  const handleToggleAutoUpdates = () => {
    if (autoCheckEnabled) {
      stopAutoUpdates();
    } else {
      startAutoUpdates();
    }
  };

  return (
    <div className={`p-4 rounded-lg border ${
      isDark 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-gray-50 border-gray-200'
    }`}>
      <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        Auto-Update Settings
      </h3>

      {/* Current Version */}
      <div className="mb-4">
        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          Current Version
        </label>
        <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          {currentVersion}
        </div>
      </div>

      {/* Auto-Update Toggle */}
      <div className="mb-4">
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={autoCheckEnabled}
            onChange={handleToggleAutoUpdates}
            className="sr-only"
          />
          <div className={`relative w-10 h-6 rounded-full transition-colors ${
            autoCheckEnabled 
              ? 'bg-blue-600' 
              : isDark ? 'bg-gray-600' : 'bg-gray-300'
          }`}>
            <div className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform ${
              autoCheckEnabled ? 'transform translate-x-4' : ''
            }`}></div>
          </div>
          <span className={`ml-3 text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Automatic update checks (every hour)
          </span>
        </label>
      </div>

      {/* Last Checked */}
      <div className="mb-4">
        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          Last Checked
        </label>
        <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          {getLastCheckedFormatted()}
        </div>
      </div>

      {/* Update Status */}
      {updateAvailable && (
        <div className={`mb-4 p-3 rounded-lg ${
          isDark 
            ? 'bg-blue-900/30 border border-blue-700' 
            : 'bg-blue-50 border border-blue-200'
        }`}>
          <div className={`font-medium text-sm mb-1 ${isDark ? 'text-blue-200' : 'text-blue-800'}`}>
            Update Available: {updateInfo?.manifest?.version}
          </div>
          {updateInfo?.body && (
            <div className={`text-xs ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
              {updateInfo.body.slice(0, 150)}...
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className={`mb-4 p-3 rounded-lg ${
          isDark 
            ? 'bg-red-900/30 border border-red-700' 
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className={`font-medium text-sm mb-1 ${isDark ? 'text-red-200' : 'text-red-800'}`}>
            Update Error
          </div>
          <div className={`text-xs ${isDark ? 'text-red-300' : 'text-red-700'}`}>
            {error}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleCheckForUpdates}
          disabled={isChecking}
          className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
            isChecking
              ? isDark ? 'bg-gray-600 text-gray-400' : 'bg-gray-300 text-gray-500'
              : isDark 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isChecking ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 inline" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Checking...
            </>
          ) : (
            'Check for Updates'
          )}
        </button>

        {updateAvailable && !isInstalling && (
          <button
            onClick={handleInstallUpdate}
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              isDark 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            Install Update
          </button>
        )}

        {isInstalling && (
          <button
            onClick={restartApp}
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              isDark 
                ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                : 'bg-orange-600 hover:bg-orange-700 text-white'
            }`}
          >
            Restart App
          </button>
        )}

        <button
          onClick={clearUpdateCache}
          className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
            isDark 
              ? 'bg-gray-600 hover:bg-gray-700 text-white' 
              : 'bg-gray-400 hover:bg-gray-500 text-white'
          }`}
        >
          Clear Cache
        </button>
      </div>

      {/* Info Text */}
      <div className={`mt-4 text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
        Updates are checked automatically every hour when enabled. 
        Manual checks will always fetch the latest information.
      </div>
    </div>
  );
};

export default UpdateSettings;