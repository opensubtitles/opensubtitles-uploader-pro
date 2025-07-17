/**
 * Session ID management service
 * Handles secure session ID storage and URL cleanup
 */

const SESSION_STORAGE_KEY = 'opensubtitles_session_id';
const SESSION_EXPIRY_KEY = 'opensubtitles_session_expiry';

export class SessionManager {
  /**
   * Capture session ID from URL parameter and store it securely
   * Then redirect to clean URL without session ID
   */
  static initializeSession() {
    const urlParams = new URLSearchParams(window.location.search);
    const sidParam = urlParams.get('sid');
    
    if (sidParam) {
      console.log('SessionManager: Capturing session ID from URL and redirecting to clean URL');
      
      // Store the session ID securely
      this.storeSessionId(sidParam);
      
      // Remove sid parameter from URL and redirect
      urlParams.delete('sid');
      const cleanUrl = window.location.pathname + 
        (urlParams.toString() ? '?' + urlParams.toString() : '');
      
      // Use replaceState to avoid adding to browser history
      window.history.replaceState({}, document.title, cleanUrl);
      
      return sidParam;
    }
    
    return null;
  }
  
  /**
   * Store session ID in localStorage with expiry
   * @param {string} sessionId - The session ID to store
   */
  static storeSessionId(sessionId) {
    try {
      // Store session ID
      localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
      
      // Set expiry time (24 hours from now)
      const expiryTime = Date.now() + (24 * 60 * 60 * 1000);
      localStorage.setItem(SESSION_EXPIRY_KEY, expiryTime.toString());
      
      console.log('SessionManager: Session ID stored securely');
    } catch (error) {
      console.error('SessionManager: Failed to store session ID:', error);
    }
  }
  
  /**
   * Retrieve stored session ID if valid
   * @returns {string|null} - The session ID or null if not available/expired
   */
  static getStoredSessionId() {
    try {
      const sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
      const expiryTime = localStorage.getItem(SESSION_EXPIRY_KEY);
      
      if (!sessionId || !expiryTime) {
        return null;
      }
      
      // Check if session has expired
      if (Date.now() > parseInt(expiryTime)) {
        console.log('SessionManager: Stored session ID has expired');
        this.clearStoredSession();
        return null;
      }
      
      return sessionId;
    } catch (error) {
      console.error('SessionManager: Failed to retrieve session ID:', error);
      return null;
    }
  }
  
  /**
   * Clear stored session data
   */
  static clearStoredSession() {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem(SESSION_EXPIRY_KEY);
      console.log('SessionManager: Stored session cleared');
    } catch (error) {
      console.error('SessionManager: Failed to clear session:', error);
    }
  }
  
  /**
   * Check if session is valid and not expired
   * @returns {boolean} - True if session is valid
   */
  static isSessionValid() {
    const sessionId = this.getStoredSessionId();
    return sessionId !== null;
  }
  
  /**
   * Get session info for debugging
   * @returns {Object} - Session information
   */
  static getSessionInfo() {
    const sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
    const expiryTime = localStorage.getItem(SESSION_EXPIRY_KEY);
    
    return {
      hasSessionId: !!sessionId,
      sessionId: sessionId ? `${sessionId.substring(0, 8)}...` : null, // Truncated for security
      expiryTime: expiryTime ? new Date(parseInt(expiryTime)).toLocaleString() : null,
      isValid: this.isSessionValid(),
      timeUntilExpiry: expiryTime ? Math.max(0, parseInt(expiryTime) - Date.now()) : 0
    };
  }
}