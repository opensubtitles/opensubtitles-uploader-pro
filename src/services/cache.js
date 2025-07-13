import { CACHE_KEYS, DEFAULT_SETTINGS } from '../utils/constants.js';

/**
 * Cache management service for OpenSubtitles data
 */
export class CacheService {
  /**
   * Check if cache is valid for a given key
   */
  static isCacheValid(cacheKey) {
    try {
      const expiryTime = localStorage.getItem(cacheKey + '_expiry');
      if (!expiryTime) return false;
      
      const now = new Date().getTime();
      const expiry = parseInt(expiryTime, 10);
      
      return now < expiry;
    } catch (error) {
      console.error('Error checking cache validity:', error);
      return false;
    }
  }

  /**
   * Load data from cache if valid
   */
  static loadFromCache(cacheKey) {
    try {
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData && this.isCacheValid(cacheKey)) {
        return JSON.parse(cachedData);
      }
    } catch (error) {
      console.error(`Error loading from cache (${cacheKey}):`, error);
    }
    return null;
  }

  /**
   * Save data to cache with expiration
   */
  static saveToCache(cacheKey, data, cacheControlHeader = null) {
    try {
      let maxAge = DEFAULT_SETTINGS.CACHE_DURATION;
      
      if (cacheControlHeader) {
        const maxAgeMatch = cacheControlHeader.match(/max-age=(\d+)/);
        if (maxAgeMatch) {
          maxAge = parseInt(maxAgeMatch[1], 10);
        }
      }
      
      const expiryTime = new Date().getTime() + (maxAge * 1000);
      
      localStorage.setItem(cacheKey, JSON.stringify(data));
      localStorage.setItem(cacheKey + '_expiry', expiryTime.toString());
      
      return { success: true, expiryTime: maxAge };
    } catch (error) {
      console.error(`Error saving to cache (${cacheKey}):`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Save data to cache with custom expiration duration
   */
  static saveToCacheWithDuration(cacheKey, data, durationInSeconds) {
    try {
      const expiryTime = new Date().getTime() + (durationInSeconds * 1000);
      
      localStorage.setItem(cacheKey, JSON.stringify(data));
      localStorage.setItem(cacheKey + '_expiry', expiryTime.toString());
      
      return { success: true, expiryTime: durationInSeconds };
    } catch (error) {
      console.error(`Error saving to cache (${cacheKey}):`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clear specific cache
   */
  static clearCache(cacheKey) {
    try {
      localStorage.removeItem(cacheKey);
      localStorage.removeItem(cacheKey + '_expiry');
      return true;
    } catch (error) {
      console.error(`Error clearing cache (${cacheKey}):`, error);
      return false;
    }
  }

  /**
   * Get cache size information
   */
  static getCacheSize() {
    try {
      let totalSize = 0;
      let itemCount = 0;
      const cacheItems = [];

      // Check all localStorage items for OpenSubtitles cache
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          // Check if it's an OpenSubtitles cache key
          const isOSCache = Object.values(CACHE_KEYS).some(cacheKey => key.startsWith(cacheKey)) ||
                           key.includes('opensubtitles') ||
                           key.includes('guessit') ||
                           key.includes('movieguess') ||
                           key.includes('language_detection') ||
                           key.includes('features_') ||
                           key.endsWith('_expiry');
          
          if (isOSCache) {
            const value = localStorage.getItem(key);
            const itemSize = (key.length + (value?.length || 0)) * 2; // UTF-16 chars = 2 bytes each
            totalSize += itemSize;
            itemCount++;
            
            if (!key.endsWith('_expiry')) {
              cacheItems.push({
                key,
                size: itemSize,
                isExpired: !this.isCacheValid(key)
              });
            }
          }
        }
      }

      return {
        totalSize,
        itemCount,
        cacheItems,
        formattedSize: this.formatBytes(totalSize)
      };
    } catch (error) {
      console.error('Error calculating cache size:', error);
      return {
        totalSize: 0,
        itemCount: 0,
        cacheItems: [],
        formattedSize: '0 B'
      };
    }
  }

  /**
   * Format bytes to human readable string
   */
  static formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Clear all OpenSubtitles related cache
   */
  static clearAllCache() {
    try {
      Object.values(CACHE_KEYS).forEach(key => {
        if (key.endsWith('_expiry')) return; // Skip expiry keys, they'll be cleared with main keys
        this.clearCache(key);
      });
      
      // Clear all GuessIt cache entries (they have dynamic keys)
      this.clearGuessItCache();
      
      // Clear all Movie Guess cache entries (they have dynamic keys)
      this.clearMovieGuessCache();
      
      // Clear all Language Detection cache entries (they have dynamic keys)
      this.clearLanguageDetectionCache();
      
      // Clear all Features cache entries (they have dynamic keys)
      this.clearFeaturesCache();
      
      return true;
    } catch (error) {
      console.error('Error clearing all cache:', error);
      return false;
    }
  }

  /**
   * Clear all GuessIt cache entries
   */
  static clearGuessItCache() {
    try {
      const guessItPrefix = CACHE_KEYS.GUESSIT_CACHE;
      const keysToRemove = [];
      
      // Find all localStorage keys that start with GuessIt cache prefix
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(guessItPrefix)) {
          keysToRemove.push(key);
        }
      }
      
      // Remove all found keys
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        localStorage.removeItem(key + '_expiry');
      });
      
      console.log(`Cleared ${keysToRemove.length} GuessIt cache entries`);
      return true;
    } catch (error) {
      console.error('Error clearing GuessIt cache:', error);
      return false;
    }
  }

  /**
   * Clear all Movie Guess cache entries
   */
  static clearMovieGuessCache() {
    try {
      const movieGuessPrefix = CACHE_KEYS.MOVIE_GUESS_CACHE;
      const keysToRemove = [];
      
      // Find all localStorage keys that start with Movie Guess cache prefix
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(movieGuessPrefix)) {
          keysToRemove.push(key);
        }
      }
      
      // Remove all found keys
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        localStorage.removeItem(key + '_expiry');
      });
      
      console.log(`Cleared ${keysToRemove.length} Movie Guess cache entries`);
      return true;
    } catch (error) {
      console.error('Error clearing Movie Guess cache:', error);
      return false;
    }
  }

  /**
   * Clear all Language Detection cache entries
   */
  static clearLanguageDetectionCache() {
    try {
      const languageDetectionPrefix = CACHE_KEYS.LANGUAGE_DETECTION_CACHE;
      const keysToRemove = [];
      
      // Find all localStorage keys that start with Language Detection cache prefix
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(languageDetectionPrefix)) {
          keysToRemove.push(key);
        }
      }
      
      // Remove all found keys
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        localStorage.removeItem(key + '_expiry');
      });
      
      console.log(`Cleared ${keysToRemove.length} Language Detection cache entries`);
      return true;
    } catch (error) {
      console.error('Error clearing Language Detection cache:', error);
      return false;
    }
  }

  /**
   * Clear all Features cache entries
   */
  static clearFeaturesCache() {
    try {
      const featuresPrefix = CACHE_KEYS.FEATURES_CACHE;
      const keysToRemove = [];
      
      // Find all localStorage keys that start with Features cache prefix
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(featuresPrefix)) {
          keysToRemove.push(key);
        }
      }
      
      // Remove all found keys
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        localStorage.removeItem(key + '_expiry');
      });
      
      console.log(`Cleared ${keysToRemove.length} Features cache entries`);
      return true;
    } catch (error) {
      console.error('Error clearing Features cache:', error);
      return false;
    }
  }

  /**
   * Get cache info for debugging
   */
  static getCacheInfo() {
    const info = {};
    
    Object.entries(CACHE_KEYS).forEach(([name, key]) => {
      if (key.endsWith('_expiry')) return;
      
      const hasData = localStorage.getItem(key) !== null;
      const isValid = this.isCacheValid(key);
      const expiryTime = localStorage.getItem(key + '_expiry');
      
      info[name] = {
        hasData,
        isValid,
        expiryTime: expiryTime ? new Date(parseInt(expiryTime, 10)).toISOString() : null
      };
    });
    
    // Add GuessIt cache stats
    const guessItPrefix = CACHE_KEYS.GUESSIT_CACHE;
    let guessItCount = 0;
    let validGuessItCount = 0;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(guessItPrefix) && !key.endsWith('_expiry')) {
        guessItCount++;
        if (this.isCacheValid(key)) {
          validGuessItCount++;
        }
      }
    }
    
    info.GUESSIT_ENTRIES = {
      totalEntries: guessItCount,
      validEntries: validGuessItCount,
      cacheDuration: '72 hours'
    };
    
    // Add Movie Guess cache stats
    const movieGuessPrefix = CACHE_KEYS.MOVIE_GUESS_CACHE;
    let movieGuessCount = 0;
    let validMovieGuessCount = 0;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(movieGuessPrefix) && !key.endsWith('_expiry')) {
        movieGuessCount++;
        if (this.isCacheValid(key)) {
          validMovieGuessCount++;
        }
      }
    }
    
    info.MOVIE_GUESS_ENTRIES = {
      totalEntries: movieGuessCount,
      validEntries: validMovieGuessCount,
      cacheDuration: '72 hours'
    };
    
    // Add Language Detection cache stats
    const languageDetectionPrefix = CACHE_KEYS.LANGUAGE_DETECTION_CACHE;
    let languageDetectionCount = 0;
    let validLanguageDetectionCount = 0;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(languageDetectionPrefix) && !key.endsWith('_expiry')) {
        languageDetectionCount++;
        if (this.isCacheValid(key)) {
          validLanguageDetectionCount++;
        }
      }
    }
    
    info.LANGUAGE_DETECTION_ENTRIES = {
      totalEntries: languageDetectionCount,
      validEntries: validLanguageDetectionCount,
      cacheDuration: '72 hours'
    };
    
    // Add Features cache stats
    const featuresPrefix = CACHE_KEYS.FEATURES_CACHE;
    let featuresCount = 0;
    let validFeaturesCount = 0;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(featuresPrefix) && !key.endsWith('_expiry')) {
        featuresCount++;
        if (this.isCacheValid(key)) {
          validFeaturesCount++;
        }
      }
    }
    
    info.FEATURES_ENTRIES = {
      totalEntries: featuresCount,
      validEntries: validFeaturesCount,
      cacheDuration: '72 hours'
    };
    
    return info;
  }
}

