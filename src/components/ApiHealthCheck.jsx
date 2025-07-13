import React, { useState, useEffect, useRef } from 'react';
import { OPENSUBTITLES_COM_API_KEY, getApiHeaders } from '../utils/constants.js';

export const ApiHealthCheck = ({ onApiBlocked }) => {
  const [isChecking, setIsChecking] = useState(true);
  const [apiStatus, setApiStatus] = useState('checking');
  const [browserInfo, setBrowserInfo] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const hasRunRef = useRef(false);
  const onApiBlockedRef = useRef(onApiBlocked);

  // Update the ref when onApiBlocked changes
  useEffect(() => {
    onApiBlockedRef.current = onApiBlocked;
  }, [onApiBlocked]);

  useEffect(() => {
    // Prevent multiple runs
    if (hasRunRef.current) return;
    hasRunRef.current = true;

    // Detect browser first
    const detectBrowser = () => {
      const ua = navigator.userAgent;
      let browser = 'Unknown';
      let isBlocking = false;
      
      if (ua.includes('Brave')) {
        browser = 'Brave';
        isBlocking = true;
      } else if (ua.includes('Chrome')) {
        browser = 'Chrome';
      } else if (ua.includes('Firefox')) {
        browser = 'Firefox';
      } else if (ua.includes('Safari')) {
        browser = 'Safari';
      } else if (ua.includes('Edge')) {
        browser = 'Edge';
      }
      
      setBrowserInfo({ browser, isBlocking, userAgent: ua });
    };

    const checkApiHealth = async () => {
      detectBrowser();
      
      // Detect Brave but don't return early - still run network tests
      const isBrave = navigator.userAgent.includes('Brave') || 
                     (navigator.brave && await navigator.brave.isBrave().catch(() => false));
      
      // Use exact same test logic as /adblock page
      const testUrls = [
        { 
          name: 'OpenSubtitles API', 
          url: 'https://api.opensubtitles.com/api/v1/utilities/fasttext/language/supported',
          headers: OPENSUBTITLES_COM_API_KEY ? {
            'Api-Key': OPENSUBTITLES_COM_API_KEY,
            'User-Agent': 'OpenSubtitles Uploader PRO',
            'X-User-Agent': 'OpenSubtitles Uploader PRO'
          } : {
            'User-Agent': 'OpenSubtitles Uploader PRO',
            'X-User-Agent': 'OpenSubtitles Uploader PRO'
          }
        },
        { 
          name: 'Ad Block Test', 
          url: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',
          headers: {}
        }
      ];

      let apiBlocked = false;
      let adBlocked = false;

      for (let i = 0; i < testUrls.length; i++) {
        const test = testUrls[i];
        
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          const response = await fetch(test.url, {
            method: 'HEAD',
            signal: controller.signal,
            headers: test.headers,
            mode: 'cors'
          });
          
          clearTimeout(timeoutId);
          
          // Same success logic as /adblock page
          if (!response.ok) {
            if (i === 0) apiBlocked = true; // OpenSubtitles API test
            if (i === 1) adBlocked = true; // Ad test
          }
          
        } catch (error) {
          // Same error handling as /adblock page
          if (error.name === 'AbortError') {
            if (i === 0) apiBlocked = true;
            if (i === 1) adBlocked = true;
          } else if (error.message.includes('CORS')) {
            // CORS errors only affect the API test
            if (i === 0) apiBlocked = true;
          } else if (error.message.includes('network') || error.message.includes('Failed to fetch')) {
            if (i === 0) apiBlocked = true;
            if (i === 1) adBlocked = true;
          } else {
            // Default: any other error affects both
            if (i === 0) apiBlocked = true;
            if (i === 1) adBlocked = true;
          }
        }
      }

      // Set final status based on test results - same logic as /adblock page
      if (!OPENSUBTITLES_COM_API_KEY) {
        setApiStatus('no-key');
      } else if (apiBlocked || adBlocked) {
        setApiStatus('blocked');
        if (onApiBlockedRef.current) {
          if (isBrave && (apiBlocked || adBlocked)) {
            onApiBlockedRef.current('Brave Shield');
          } else {
            onApiBlockedRef.current(apiBlocked ? 'api-blocked' : 'ad-blocked');
          }
        }
      } else {
        setApiStatus('healthy');
      }
      
      setIsChecking(false);
    };

    checkApiHealth();
  }, []); // Empty dependency array - only run once

  if (isChecking) {
    return (
      <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-3 py-2 rounded shadow-lg text-sm">
        🔍 Checking API connection...
      </div>
    );
  }

  if (apiStatus === 'healthy' || dismissed) {
    return null; // Don't show anything if API is working or dismissed
  }

  const getStatusMessage = () => {
    switch (apiStatus) {
      case 'no-key':
        return {
          icon: '🔑',
          title: 'API Key Missing',
          message: 'OpenSubtitles API key is not configured. Please check your .env file.',
          color: 'bg-red-600',
          isFullWidth: false
        };
      case 'invalid-key':
        return {
          icon: '🚫',
          title: 'Invalid API Key',
          message: 'The OpenSubtitles API key is invalid. Please check your configuration.',
          color: 'bg-red-600',
          isFullWidth: false
        };
      case 'blocked':
        return {
          icon: '🛡️',
          title: browserInfo?.browser === 'Brave' ? 'Brave Shield Active' : 'Ad Blocker Detected',
          message: browserInfo?.browser === 'Brave' 
            ? 'IMPORTANT: Brave Shield is blocking OpenSubtitles API requests. The uploader will not work until you disable it for this site.'
            : 'Ad blockers like uBlock Origin, Adblock Plus are blocking necessary API requests.',
          color: browserInfo?.browser === 'Brave' ? 'bg-orange-600' : 'bg-red-600',
          isFullWidth: true
        };
      case 'timeout':
        return {
          icon: '⏱️',
          title: 'Connection Timeout',
          message: 'API requests are timing out. This is usually caused by ad blockers or network issues.',
          color: 'bg-orange-600',
          isFullWidth: true
        };
      case 'network-error':
        return {
          icon: '🌐',
          title: 'Network Error',
          message: 'Unable to connect to OpenSubtitles API. This is usually caused by ad blockers (uBlock Origin, Adblock Plus, etc.). Please disable them for this site.',
          color: 'bg-red-600',
          isFullWidth: true
        };
      default:
        return {
          icon: '❌',
          title: 'API Error',
          message: 'There was an error connecting to the OpenSubtitles API.',
          color: 'bg-red-600',
          isFullWidth: false
        };
    }
  };

  const status = getStatusMessage();
  const isBraveShield = browserInfo?.browser === 'Brave' && (apiStatus === 'blocked' || apiStatus === 'timeout' || apiStatus === 'network-error');

  // Show full-width banner for blocking issues, compact notification for other errors
  if (status.isFullWidth) {
    const getDisableInstructions = () => {
      if (isBraveShield) {
        return [
          'Click the Brave Shield icon (🛡️) in the address bar',
          'Turn off "Shields" for uploader.opensubtitles.org',
          'Refresh the page'
        ];
      } else {
        return [
          'For uBlock Origin: Click the extension icon → click the big power button to disable for this site',
          'For Adblock Plus: Click the extension icon → toggle "Enabled on this site" to OFF',
          'For other blockers: Look for a shield/block icon in your browser toolbar',
          'Alternative: Add "uploader.opensubtitles.org" to your blocker\'s whitelist',
          'Test in incognito/private mode (extensions are usually disabled there)'
        ];
      }
    };

    return (
      <div className={`fixed top-0 left-0 right-0 ${status.color} text-white px-4 py-3 shadow-lg z-50`}>
        <div className="max-w-4xl mx-auto flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <span className="text-2xl">{status.icon}</span>
            <div>
              <h3 className="font-bold text-lg mb-1">
                {isBraveShield ? '🛡️ ' : ''}{status.title}
              </h3>
              <p className={`${isBraveShield ? 'text-orange-100' : 'text-red-100'} mb-2 font-medium`}>
                {isBraveShield ? '⚠️ ' : ''}{status.message}
              </p>
              <div className={`text-sm ${isBraveShield ? 'text-orange-100' : 'text-red-100'}`}>
                <p className="font-semibold mb-1">{isBraveShield ? 'Disable Brave Shield' : 'Disable Ad Blocker'}:</p>
                <ul className="list-none space-y-1">
                  {getDisableInstructions().map((step, index) => (
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
            <a
              href="/#/adblock"
              className={`${isBraveShield ? 'bg-orange-700 hover:bg-orange-800' : 'bg-red-700 hover:bg-red-800'} text-white px-3 py-1 rounded text-sm font-medium transition-colors`}
            >
              🛡️ Test
            </a>
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
  }

  // Compact notification for non-blocking errors
  return (
    <div className={`fixed bottom-4 right-4 ${status.color} text-white px-4 py-3 rounded-lg shadow-lg max-w-sm text-sm`}>
      <div className="flex items-center space-x-2">
        <span className="text-lg">{status.icon}</span>
        <div>
          <div className="font-semibold">{status.title}</div>
          <div className="text-xs opacity-90">{status.message}</div>
        </div>
      </div>
    </div>
  );
};

export default ApiHealthCheck;