import { XmlRpcService } from './api/xmlrpc.js';
import { SessionManager } from './sessionManager.js';

/**
 * User session service for OpenSubtitles authentication
 */
export class UserService {
  
  /**
   * Get session ID from stored session, cookie, or empty fallback
   * Uses secure session storage instead of URL parameter
   * @returns {string} - Session ID or empty string
   */
  static getSessionId() {
    // First priority: Check for stored session ID (from URL capture)
    const storedSessionId = SessionManager.getStoredSessionId();
    if (storedSessionId) {
      console.log(`UserService: Using stored session ID: ${storedSessionId.substring(0, 8)}...`);
      return storedSessionId;
    }
    
    // Second priority: Get PHPSESSID cookie value
    const cookies = document.cookie.split(';');
    const phpSessionCookie = cookies.find(cookie => 
      cookie.trim().startsWith('PHPSESSID=')
    );
    
    if (phpSessionCookie) {
      const sessionId = phpSessionCookie.split('=')[1].trim();
      console.log(`UserService: Using PHPSESSID: ${sessionId}`);
      return sessionId;
    }
    
    // Third priority: Try remember_sid cookie (not httpOnly)
    const rememberSidCookie = cookies.find(cookie => 
      cookie.trim().startsWith('remember_sid=')
    );
    
    if (rememberSidCookie) {
      const sessionId = rememberSidCookie.split('=')[1].trim();
      console.log(`UserService: Using remember_sid: ${sessionId}`);
      return sessionId;
    }
    
    // Fallback: empty token (no logging for anonymous users)
    return '';
  }
  
  /**
   * Get user info using XML-RPC GetUserInfo
   * @param {string} sessionId - Session ID (unused now, using token from XmlRpcService)
   * @param {Function} addDebugInfo - Debug callback (optional)
   * @returns {Promise<Object>} - User info object
   */
  static async getUserInfo(sessionId, addDebugInfo = null) {
    try {
      if (addDebugInfo) {
        addDebugInfo(`👤 Fetching user info via XML-RPC GetUserInfo`);
      }
      
      const userData = await XmlRpcService.getUserInfo();
      
      if (userData === null) {
        // User is not logged in (401 response handled gracefully)
        if (addDebugInfo) {
          addDebugInfo(`👤 User is not logged in`);
        }
        return null;
      }
      
      if (addDebugInfo) {
        addDebugInfo(`✅ User info loaded: ${userData?.UserNickName || 'Unknown'}`);
      }
      
      return userData;
      
    } catch (error) {
      if (addDebugInfo) {
        addDebugInfo(`❌ Failed to get user info via XML-RPC: ${error.message}`);
      }
      throw error;
    }
  }
  
  /**
   * Extract username from XML-RPC GetUserInfo response
   * @param {Object} userInfo - User info response from XML-RPC GetUserInfo
   * @returns {string} - Username or 'Anonymous'
   */
  static getUsername(userInfo) {
    return userInfo?.UserNickName || 'Anonymous';
  }
  
  /**
   * Check if user is logged in
   * @param {Object} userInfo - User info response from XML-RPC GetUserInfo
   * @returns {boolean} - True if user is logged in
   */
  static isLoggedIn(userInfo) {
    return !!(userInfo?.UserNickName && userInfo?.IDUser);
  }
  
  /**
   * Get user's preferred languages
   * @param {Object} userInfo - User info response from XML-RPC GetUserInfo
   * @returns {string} - Comma-separated language codes
   */
  static getPreferredLanguages(userInfo) {
    return userInfo?.UserPreferedLanguages || '';
  }
  
  /**
   * Get user's rank/role
   * @param {Object} userInfo - User info response from XML-RPC GetUserInfo
   * @returns {string} - User rank
   */
  static getUserRank(userInfo) {
    return userInfo?.UserRank || '';
  }
  
  /**
   * Get user's upload count
   * @param {Object} userInfo - User info response from XML-RPC GetUserInfo
   * @returns {number} - Upload count
   */
  static getUploadCount(userInfo) {
    return parseInt(userInfo?.UploadCnt) || 0;
  }
  
  /**
   * Get user's download count
   * @param {Object} userInfo - User info response from XML-RPC GetUserInfo
   * @returns {number} - Download count
   */
  static getDownloadCount(userInfo) {
    return parseInt(userInfo?.DownloadCnt) || 0;
  }
}