import React, { useState, useEffect } from 'react';

export const ConfigOverlay = ({ isOpen, onClose, config, onConfigChange, colors, isDark }) => {
  const [localConfig, setLocalConfig] = useState(config);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleChange = (key, value) => {
    const newConfig = { ...localConfig, [key]: value };
    setLocalConfig(newConfig);
    onConfigChange(newConfig);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div 
        className="relative w-full max-w-md mx-4 rounded-xl shadow-2xl border-2 max-h-[90vh] overflow-y-auto"
        style={{
          backgroundColor: colors.cardBackground,
          borderColor: colors.border,
          boxShadow: `0 25px 50px -12px ${colors.shadow}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between p-6 border-b"
          style={{ borderBottomColor: colors.border }}
        >
          <div className="flex items-center gap-3">
            <div className="text-2xl">⚙️</div>
            <h2 className="text-xl font-semibold" style={{ color: colors.text }}>
              Configuration
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full transition-colors hover:bg-opacity-10"
            style={{ 
              color: colors.textSecondary,
              ':hover': { backgroundColor: colors.text }
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = colors.text + '10';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
            }}
            title="Close"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Upload Options Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">📤</span>
              <h3 className="text-lg font-medium" style={{ color: colors.text }}>
                Upload Options
              </h3>
            </div>
            
            <div className="pl-7 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium" style={{ color: colors.text }}>
                    Default Expanded State
                  </label>
                  <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                    Set whether upload options are expanded by default
                  </p>
                </div>
                <div className="ml-4">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localConfig.uploadOptionsExpanded}
                      onChange={(e) => handleChange('uploadOptionsExpanded', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div 
                      className="w-11 h-6 rounded-full peer transition-colors duration-200 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"
                      style={{
                        backgroundColor: localConfig.uploadOptionsExpanded ? colors.success : colors.border,
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Future sections can be added here */}
          <div className="border-t pt-4" style={{ borderTopColor: colors.border }}>
            <div className="flex items-center gap-2 text-sm" style={{ color: colors.textSecondary }}>
              <span>🔮</span>
              <span>More configuration options coming soon...</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div 
          className="flex items-center justify-between p-6 border-t"
          style={{ borderTopColor: colors.border }}
        >
          <div className="text-xs" style={{ color: colors.textSecondary }}>
            Settings are saved automatically
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg transition-colors text-sm font-medium"
            style={{
              backgroundColor: colors.success,
              color: 'white',
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = colors.successHover || colors.primary;
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = colors.success;
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};