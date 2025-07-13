import { useState, useEffect, useCallback, useRef } from 'react';
import { UserService } from '../services/userService.js';

/**
 * Custom hook for managing user session
 */
export const useUserSession = (addDebugInfo) => {
  const [userInfo, setUserInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const hasLoadedRef = useRef(false);

  // Load user info on component mount
  const loadUserInfo = useCallback(async () => {
    // Prevent duplicate calls
    if (hasLoadedRef.current) {
      return;
    }
    hasLoadedRef.current = true;

    try {
      setIsLoading(true);
      setError(null);
      
      const sessionId = UserService.getSessionId();
      if (!sessionId) {
        if (addDebugInfo) {
          addDebugInfo('👤 No session ID found - user not logged in');
        }
        setUserInfo(null);
        return;
      }
      
      const userData = await UserService.getUserInfo(sessionId, addDebugInfo);
      setUserInfo(userData);
      
    } catch (err) {
      setError(err.message);
      setUserInfo(null);
      if (addDebugInfo) {
        addDebugInfo(`👤 Session validation failed: ${err.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, []); // Remove addDebugInfo from dependency array as it's stable

  // Initialize user session on mount
  useEffect(() => {
    loadUserInfo();
  }, [loadUserInfo]);

  // Helper functions
  const getUsername = useCallback(() => {
    return UserService.getUsername(userInfo);
  }, [userInfo]);

  const isLoggedIn = useCallback(() => {
    return UserService.isLoggedIn(userInfo);
  }, [userInfo]);

  const getUserRank = useCallback(() => {
    return UserService.getUserRank(userInfo);
  }, [userInfo]);

  const getPreferredLanguages = useCallback(() => {
    return UserService.getPreferredLanguages(userInfo);
  }, [userInfo]);

  // Refresh function that resets the flag
  const refreshUserInfo = useCallback(async () => {
    hasLoadedRef.current = false;
    await loadUserInfo();
  }, [loadUserInfo]);

  return {
    userInfo,
    isLoading,
    error,
    getUsername,
    isLoggedIn,
    getUserRank,
    getPreferredLanguages,
    refreshUserInfo
  };
};