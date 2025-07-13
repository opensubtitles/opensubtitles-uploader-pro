import React, { useState, useEffect } from 'react';
import { AdBlockerDetection } from '../utils/adBlockerDetection.js';

export const AdBlockerWarning = () => {
  const [showWarning, setShowWarning] = useState(false);
  const [blockerInfo, setBlockerInfo] = useState(null);
  const [isChecking, setIsChecking] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const checkAdBlocker = async () => {
      try {
        // Quick Brave detection first
        const isBrave = navigator.userAgent.includes('Brave') || 
                       (navigator.brave && await navigator.brave.isBrave().catch(() => false));
        
        if (isBrave) {
          setBlockerInfo({ isBlocked: true, blockerType: 'Brave Shield' });
          setShowWarning(true);
          setIsChecking(false);
          return;
        }

        // Full detection for other browsers
        const result = await AdBlockerDetection.detectAdBlocker();
        setBlockerInfo(result);
        setShowWarning(result.isBlocked);
      } catch (error) {
        console.warn('Ad blocker detection error:', error);
        // If detection fails but we're in Brave, show warning anyway
        if (navigator.userAgent.includes('Brave')) {
          setBlockerInfo({ isBlocked: true, blockerType: 'Brave Shield' });
          setShowWarning(true);
        }
      } finally {
        setIsChecking(false);
      }
    };

    // Check immediately for Brave, with a fallback delay
    checkAdBlocker();
  }, []);

  if (!showWarning || dismissed || isChecking) {
    return null;
  }

  const instructions = AdBlockerDetection.getDisableInstructions(blockerInfo.blockerType);

  const isBraveShield = blockerInfo.blockerType === 'Brave Shield';

  return (
    <div className={`fixed top-0 left-0 right-0 ${isBraveShield ? 'bg-orange-600' : 'bg-red-600'} text-white px-4 py-3 shadow-lg z-50`}>
      <div className="max-w-4xl mx-auto flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <span className="text-2xl">{instructions.icon}</span>
          <div>
            <h3 className="font-bold text-lg mb-1">
              {isBraveShield ? '🛡️ Brave Shield Active' : `${blockerInfo.blockerType} Detected`}
            </h3>
            <p className={`${isBraveShield ? 'text-orange-100' : 'text-red-100'} mb-2 font-medium`}>
              {isBraveShield 
                ? "⚠️ IMPORTANT: Brave Shield is blocking OpenSubtitles API requests. The uploader will not work until you disable it for this site."
                : `The OpenSubtitles uploader requires API access to function properly. Your ${blockerInfo.blockerType || 'ad blocker'} is blocking necessary requests.`
              }
            </p>
            <div className={`text-sm ${isBraveShield ? 'text-orange-100' : 'text-red-100'}`}>
              <p className="font-semibold mb-1">{instructions.title}:</p>
              <ul className="list-none space-y-1">
                {instructions.steps.map((step, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-2">▶</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
              {isBraveShield && (
                <p className="mt-2 font-semibold text-orange-200">
                  💡 Tip: You can also add "uploader.opensubtitles.org" to your Brave Shield exceptions.
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 ml-4">
          <button
            onClick={() => window.location.reload()}
            className={`${isBraveShield ? 'bg-orange-700 hover:bg-orange-800' : 'bg-red-700 hover:bg-red-800'} text-white px-3 py-1 rounded text-sm font-medium transition-colors`}
            title="Refresh page after disabling blocker"
          >
            🔄 Refresh
          </button>
          <button
            onClick={() => setDismissed(true)}
            className={`${isBraveShield ? 'bg-orange-700 hover:bg-orange-800' : 'bg-red-700 hover:bg-red-800'} text-white px-3 py-1 rounded text-sm font-medium transition-colors`}
            title="Dismiss this warning"
          >
            ✕ Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdBlockerWarning;