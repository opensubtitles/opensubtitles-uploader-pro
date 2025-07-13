import { OPENSUBTITLES_COM_API_KEY, API_ENDPOINTS, DEFAULT_SETTINGS, getApiHeaders, USER_AGENT } from '../../utils/constants.js';
import { CacheService } from '../cache.js';
import { CACHE_KEYS } from '../../utils/constants.js';
import { retryAsync } from '../../utils/retryUtils.js';
import { delayedFetch } from '../../utils/networkUtils.js';
import CryptoJS from 'crypto-js';

/**
 * OpenSubtitles REST API service
 */
export class OpenSubtitlesApiService {
  // Request deduplication - prevent multiple simultaneous identical requests
  static activeRequests = new Map();
  
  // Rate limiting - track request timestamps
  static requestTimes = new Map();
  
  // Request monitoring - track all API calls for debugging
  static requestCount = 0;
  static requestLog = [];
  
  /**
   * Log API request for debugging
   */
  static logRequest(endpoint, method = 'GET') {
    this.requestCount++;
    const logEntry = {
      count: this.requestCount,
      timestamp: new Date().toISOString(),
      endpoint,
      method
    };
    
    this.requestLog.push(logEntry);
    
    // Keep only last 100 requests
    if (this.requestLog.length > 100) {
      this.requestLog = this.requestLog.slice(-100);
    }
    
    console.log(`API Request #${this.requestCount}: ${method} ${endpoint}`);
    
    // Warning if too many requests
    if (this.requestCount > 50) {
      console.warn(`⚠️ High API usage detected! ${this.requestCount} requests made. Recent requests:`, 
        this.requestLog.slice(-10));
    }
  }
  /**
   * Rate limiting helper
   */
  static checkRateLimit(endpoint, minDelay = 1000) {
    const now = Date.now();
    const lastRequest = this.requestTimes.get(endpoint);
    
    if (lastRequest && (now - lastRequest) < minDelay) {
      throw new Error(`Rate limit: Too many requests to ${endpoint}. Please wait ${minDelay}ms between requests.`);
    }
    
    this.requestTimes.set(endpoint, now);
  }
  
  /**
   * Request deduplication helper
   */
  static async deduplicateRequest(key, requestFn) {
    // If this exact request is already in progress, wait for it
    if (this.activeRequests.has(key)) {
      console.log(`Deduplicating request: ${key}`);
      return await this.activeRequests.get(key);
    }
    
    // Start new request and store promise
    const promise = requestFn();
    this.activeRequests.set(key, promise);
    
    try {
      const result = await promise;
      this.activeRequests.delete(key);
      return result;
    } catch (error) {
      this.activeRequests.delete(key);
      throw error;
    }
  }

  /**
   * Get supported languages for language detection
   */
  static async getSupportedLanguages() {
    const requestKey = 'getSupportedLanguages';
    
    return this.deduplicateRequest(requestKey, async () => {
      try {
        // Check cache first
        const cached = CacheService.loadFromCache(CACHE_KEYS.LANGUAGES);
        if (cached) {
          return { data: cached, fromCache: true };
        }

        // Rate limiting
        this.checkRateLimit(API_ENDPOINTS.SUPPORTED_LANGUAGES, 5000); // 5 seconds between calls
        
        // Log request
        this.logRequest(API_ENDPOINTS.SUPPORTED_LANGUAGES, 'GET');

        const response = await delayedFetch(API_ENDPOINTS.SUPPORTED_LANGUAGES, {
          method: 'GET',
          headers: getApiHeaders('application/json', {
            'Api-Key': OPENSUBTITLES_COM_API_KEY
          }),
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        const languageMap = {
          'default': { flag: '🌐', name: 'Default' }
        };

        if (data.languages && Array.isArray(data.languages)) {
          data.languages.forEach(lang => {
            const code = lang.language_code || lang.iso639_1 || lang.code;
            const name = lang.language_name || lang.name;
            const flag = lang.flag || lang.emoji_flag || '';
            const originalName = lang.language_name_original || lang.original_name || lang.name_original || '';
            const iso639_3 = lang.iso639_3 || lang.iso6393 || '';
            
            if (code && name && flag) {
              languageMap[code.toLowerCase()] = {
                flag,
                name,
                originalName,
                iso639_3
              };
            }
          });
        }

        // Save to cache
        const cacheControl = response.headers.get('cache-control');
        CacheService.saveToCache(CACHE_KEYS.LANGUAGES, languageMap, cacheControl);

        return { data: languageMap, fromCache: false };
      } catch (error) {
        console.error('Error fetching supported languages:', error);
        throw error;
      }
    });
  }

  /**
   * Calculate MD5 hash of file content for caching
   * @param {File} file - The file to hash
   * @returns {Promise<string>} - MD5 hash of the file content
   */
  static async calculateFileHash(file) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const wordArray = CryptoJS.lib.WordArray.create(uint8Array);
      const hash = CryptoJS.MD5(wordArray).toString().toLowerCase();
      return hash;
    } catch (error) {
      console.error('Error calculating file hash:', error);
      throw error;
    }
  }

  /**
   * Generate cache key for language detection
   * @param {string} fileHash - MD5 hash of the file content
   * @returns {string} - Cache key
   */
  static generateLanguageDetectionCacheKey(fileHash) {
    return `${CACHE_KEYS.LANGUAGE_DETECTION_CACHE}_${fileHash}`;
  }

  /**
   * Load language detection data from cache
   * @param {string} fileHash - MD5 hash of the file content
   * @returns {Object|null} - Cached data or null
   */
  static loadLanguageDetectionFromCache(fileHash) {
    const cacheKey = this.generateLanguageDetectionCacheKey(fileHash);
    return CacheService.loadFromCache(cacheKey);
  }

  /**
   * Save language detection data to cache
   * @param {string} fileHash - MD5 hash of the file content
   * @param {Object} data - The language detection response data
   * @returns {Object} - Cache save result
   */
  static saveLanguageDetectionToCache(fileHash, data) {
    const cacheKey = this.generateLanguageDetectionCacheKey(fileHash);
    return CacheService.saveToCacheWithDuration(cacheKey, data, DEFAULT_SETTINGS.LANGUAGE_DETECTION_CACHE_DURATION);
  }

  /**
   * Detect language of a subtitle file (without cache)
   */
  static async detectLanguageUncached(subtitleFile) {
    try {
      // Read first chunk of the file
      const chunk = subtitleFile.file.slice(0, 5120); // 5KB
      const text = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(chunk, 'utf-8');
      });

      // Create blob for API
      const textBlob = new Blob([text], { type: 'text/plain' });
      const formData = new FormData();
      formData.append('text_file', textBlob, subtitleFile.name);

      const response = await delayedFetch(API_ENDPOINTS.LANGUAGE_DETECTION, {
        method: 'POST',
        headers: {
          'Api-Key': OPENSUBTITLES_COM_API_KEY,
          'User-Agent': USER_AGENT,
          'X-User-Agent': USER_AGENT,
        },
        body: formData,
      }, DEFAULT_SETTINGS.LANGUAGE_DETECTION_DELAY);

      if (!response.ok) {
        throw new Error(`Language detection failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.data && result.data.languages && result.data.languages.length > 0) {
        // Sort by confidence and filter languages above threshold
        const allLanguages = result.data.languages
          .sort((a, b) => b.confidence - a.confidence)
          .filter(lang => lang.confidence > 0.05);
        
        const topLanguage = allLanguages[0];
        
        return {
          language_code: topLanguage.language_code,
          language_name: topLanguage.language_name,
          confidence: topLanguage.confidence,
          all_languages: allLanguages,
          file_type: result.data.file_type,
          file_kind: result.data.file_kind,
          filename: result.data.filename,
          text_sample: text.substring(0, 100) + (text.length > 100 ? '...' : '')
        };
      }
      
      return null;
    } catch (error) {
      console.error(`Language detection failed for ${subtitleFile.name}:`, error);
      throw error;
    }
  }

  /**
   * Detect language of a subtitle file with caching
   * @param {Object} subtitleFile - Subtitle file object
   * @param {Function} addDebugInfo - Debug callback (optional)
   * @returns {Promise<Object>} - Language detection result
   */
  static async detectLanguage(subtitleFile, addDebugInfo = null) {
    try {
      // Calculate MD5 hash of the file content
      const fileHash = await this.calculateFileHash(subtitleFile.file);
      
      if (addDebugInfo) {
        addDebugInfo(`🔍 Language detection for ${subtitleFile.name} (MD5: ${fileHash.substring(0, 8)}...)`);
      }
      
      // Check cache first
      const cachedData = this.loadLanguageDetectionFromCache(fileHash);
      if (cachedData) {
        console.log(`Language Detection cache hit for: ${subtitleFile.name} (${fileHash})`);
        if (addDebugInfo) {
          addDebugInfo(`🎯 Language Detection cache HIT for ${subtitleFile.name} (no API call needed)`);
        }
        return cachedData;
      }

      // Cache miss, make API call
      console.log(`Language Detection cache miss for: ${subtitleFile.name} (${fileHash}), making API call`);
      if (addDebugInfo) {
        addDebugInfo(`❌ Language Detection cache MISS for ${subtitleFile.name}, making API call`);
      }
      
      const data = await this.detectLanguageUncached(subtitleFile);
      
      // Save to cache (including null results to avoid repeated failed lookups)
      this.saveLanguageDetectionToCache(fileHash, data);
      if (addDebugInfo) {
        addDebugInfo(`💾 Language Detection result cached for ${subtitleFile.name} (72 hours)`);
      }
      
      return data;
    } catch (error) {
      console.error(`Language detection with caching failed for ${subtitleFile.name}:`, error);
      throw error;
    }
  }

  /**
   * Generate cache key for features API
   * @param {string} imdbId - The IMDb ID parameter
   * @returns {string} - Cache key
   */
  static generateFeaturesCacheKey(imdbId) {
    return `${CACHE_KEYS.FEATURES_CACHE}_imdb_id_${imdbId}`;
  }

  /**
   * Load features data from cache
   * @param {string} imdbId - The IMDb ID to check cache for
   * @returns {Object|null} - Cached data or null
   */
  static loadFeaturesFromCache(imdbId) {
    const cacheKey = this.generateFeaturesCacheKey(imdbId);
    return CacheService.loadFromCache(cacheKey);
  }

  /**
   * Save features data to cache
   * @param {string} imdbId - The IMDb ID to save cache for
   * @param {Object} data - The features response data
   * @returns {Object} - Cache save result
   */
  static saveFeaturesToCache(imdbId, data) {
    const cacheKey = this.generateFeaturesCacheKey(imdbId);
    return CacheService.saveToCacheWithDuration(cacheKey, data, DEFAULT_SETTINGS.FEATURES_CACHE_DURATION);
  }

  /**
   * Get features by IMDb ID (without cache)
   */
  static async getFeaturesUncached(imdbId) {
    try {
      const response = await delayedFetch(
        `${API_ENDPOINTS.FEATURES}?imdb_id=${imdbId}`,
        {
          headers: getApiHeaders('application/json', {
            'Api-Key': OPENSUBTITLES_COM_API_KEY
          }),
        },
        DEFAULT_SETTINGS.FEATURES_FETCH_DELAY
      );

      if (!response.ok) {
        throw new Error(`Features API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Features API fetch error for imdb_id ${imdbId}:`, error);
      throw error;
    }
  }

  /**
   * Get features by IMDb ID with caching
   * @param {string} imdbId - The IMDb ID to fetch features for
   * @param {Function} addDebugInfo - Debug callback (optional)
   * @returns {Promise<Object>} - Features data
   */
  static async getFeaturesByImdbId(imdbId, addDebugInfo = null) {
    const requestKey = `getFeatures_${imdbId}`;
    
    return this.deduplicateRequest(requestKey, async () => {
      try {
        if (addDebugInfo) {
          addDebugInfo(`🔍 Features lookup for IMDb ID: ${imdbId}`);
        }
        
        // Check cache first
        const cachedData = this.loadFeaturesFromCache(imdbId);
        if (cachedData) {
          console.log(`Features cache hit for IMDb ID: ${imdbId}`);
          if (addDebugInfo) {
            addDebugInfo(`🎯 Features cache HIT for IMDb ID ${imdbId} (no API call needed)`);
          }
          return cachedData;
        }

        // Cache miss, make API call with rate limiting
        console.log(`Features cache miss for IMDb ID: ${imdbId}, making API call`);
        if (addDebugInfo) {
          addDebugInfo(`❌ Features cache MISS for IMDb ID ${imdbId}, making API call`);
        }
        
        // Rate limiting
        this.checkRateLimit(`features_${imdbId}`, 2000); // 2 seconds between calls for same movie
        
        const data = await this.getFeaturesUncached(imdbId);
        
        // Save to cache (including null results to avoid repeated failed lookups)
        this.saveFeaturesToCache(imdbId, data);
        if (addDebugInfo) {
          addDebugInfo(`💾 Features result cached for IMDb ID ${imdbId} (72 hours)`);
        }
        
        return data;
      } catch (error) {
        console.error(`Features fetch with caching failed for IMDb ID ${imdbId}:`, error);
        throw error;
      }
    });
  }

  /**
   * Detect language of a subtitle file with retry logic
   */
  static async detectLanguageWithRetry(subtitleFile, addDebugInfo = null) {
    try {
      // Calculate MD5 hash of the file content for cache check
      const fileHash = await this.calculateFileHash(subtitleFile.file);
      
      // Check cache first
      const cachedData = this.loadLanguageDetectionFromCache(fileHash);
      if (cachedData) {
        if (addDebugInfo) {
          addDebugInfo(`🎯 Language Detection cache HIT for ${subtitleFile.name} (no API call needed)`);
        }
        return cachedData;
      }

      // Cache miss, use retry logic
      if (addDebugInfo) {
        addDebugInfo(`❌ Language Detection cache MISS for ${subtitleFile.name}, making API call with retry`);
      }

      return retryAsync(
        () => this.detectLanguageUncached(subtitleFile),
        3, // max attempts
        DEFAULT_SETTINGS.LANGUAGE_DETECTION_DELAY, // use setting
        (attempt, maxAttempts) => {
          if (addDebugInfo) {
            if (attempt > 1) {
              addDebugInfo(`Language detection attempt ${attempt}/${maxAttempts} for ${subtitleFile.name}`);
            }
          }
        }
      ).then(data => {
        // Save successful result to cache
        this.saveLanguageDetectionToCache(fileHash, data);
        if (addDebugInfo) {
          addDebugInfo(`💾 Language Detection result cached for ${subtitleFile.name} (72 hours)`);
        }
        return data;
      });
    } catch (error) {
      console.error(`Language detection with retry failed for ${subtitleFile.name}:`, error);
      throw error;
    }
  }
}