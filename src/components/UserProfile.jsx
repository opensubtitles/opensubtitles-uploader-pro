import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import LoginDialog from './LoginDialog.jsx';

/**
 * User profile component showing login status and providing logout functionality
 */
const UserProfile = () => {
  const { 
    isAuthenticated, 
    user, 
    loading, 
    error, 
    logout, 
    isAnonymous, 
    getUserPreferredLanguages,
    clearError
  } = useAuth();

  // Debug logging
  React.useEffect(() => {
    console.log('🔐 UserProfile - Auth state changed:');
    console.log('🔐 isAuthenticated:', isAuthenticated);
    console.log('🔐 user:', user);
    console.log('🔐 loading:', loading);
    console.log('🔐 error:', error);
    console.log('🔐 isAnonymous():', isAnonymous ? isAnonymous() : 'N/A');
  }, [isAuthenticated, user, loading, error, isAnonymous]);
  
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Handle logout
  const handleLogout = async () => {
    setShowUserMenu(false);
    await logout();
  };

  // Handle login dialog
  const handleLoginClick = () => {
    clearError();
    setShowLoginDialog(true);
  };

  // Get user display name
  const getUserDisplayName = () => {
    if (!user) return 'Loading...';
    if (isAnonymous()) return 'Anonymous User';
    return user.UserNickName || 'User';
  };

  // Get user rank
  const getUserRank = () => {
    if (!user || isAnonymous()) return 'Guest';
    return user.UserRank || 'User';
  };

  // Get user stats
  const getUserStats = () => {
    if (!user || isAnonymous()) return null;
    
    return {
      uploads: user.UserUploadCnt || 0,
      downloads: user.UserDownloadCnt || 0,
      rank: user.UserRank || 'User'
    };
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
        <span className="text-sm text-gray-600 dark:text-gray-400">Loading...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center space-x-2" title={error}>
        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <span className="text-sm text-red-600 dark:text-red-400">
          Auth Error: {error.length > 30 ? error.substring(0, 30) + '...' : error}
        </span>
        <button 
          onClick={() => {
            console.log('🔐 Full error details:', error);
            clearError();
          }}
          className="text-xs text-red-500 hover:text-red-700 underline"
        >
          Debug
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      {!isAuthenticated ? (
        /* Login Link for Non-Authenticated Users */
        <button
          onClick={handleLoginClick}
          className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border-2 border-blue-600"
        >
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
          <span className="text-sm font-medium text-blue-600">Login</span>
        </button>
      ) : (
        /* User Profile Button for Authenticated Users */
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          {/* User Avatar */}
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
            {isAnonymous() ? (
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            ) : (
              <span className="text-white font-medium text-sm">
                {getUserDisplayName().substring(0, 1).toUpperCase()}
              </span>
            )}
          </div>

          {/* User Info */}
          <div className="hidden sm:block text-left">
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {getUserDisplayName()}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {getUserRank()}
            </div>
          </div>

          {/* Dropdown Arrow */}
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}

      {/* User Menu Dropdown */}
      {showUserMenu && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                {isAnonymous() ? (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                ) : (
                  <span className="text-white font-medium">
                    {getUserDisplayName().substring(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-white">
                  {getUserDisplayName()}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {getUserRank()}
                </div>
              </div>
            </div>
          </div>

          <div className="p-2">
            {/* User Stats (if not anonymous) */}
            {!isAnonymous() && getUserStats() && (
              <div className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex justify-between">
                  <span>Uploads:</span>
                  <span>{getUserStats().uploads}</span>
                </div>
                <div className="flex justify-between">
                  <span>Downloads:</span>
                  <span>{getUserStats().downloads}</span>
                </div>
              </div>
            )}

            {/* Preferred Languages */}
            {getUserPreferredLanguages().length > 0 && (
              <div className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="font-medium mb-1">Preferred Languages:</div>
                <div className="text-xs">
                  {getUserPreferredLanguages().join(', ').toUpperCase()}
                </div>
              </div>
            )}

            {/* Anonymous User Notice */}
            {isAnonymous() && (
              <div className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2">
                  <div className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                    Anonymous Session
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-300">
                    Login with your account for full features and personal statistics.
                  </div>
                </div>
              </div>
            )}

            {/* Menu Items */}
            <div className="border-t border-gray-200 dark:border-gray-700 mt-2 pt-2">
              {isAnonymous() ? (
                <button
                  onClick={handleLoginClick}
                  className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Login with Account
                </button>
              ) : (
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center px-3 py-2 text-sm text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Login Dialog */}
      <LoginDialog
        isOpen={showLoginDialog}
        onClose={() => setShowLoginDialog(false)}
      />

      {/* Click Outside Handler */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </div>
  );
};

export default UserProfile;