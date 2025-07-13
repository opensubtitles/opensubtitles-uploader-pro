import { API_ENDPOINTS, CACHE_KEYS, DEFAULT_SETTINGS, getApiHeaders } from '../../utils/constants.js';
import { CacheService } from '../cache.js';
import { retryAsync } from '../../utils/retryUtils.js';
import { delayedFetch } from '../../utils/networkUtils.js';

/**
 * OpenSubtitles XML-RPC API service
 */
export class XmlRpcService {
  /**
   * Get authentication token from URL sid parameter, PHPSESSID cookie, or empty fallback
   */
  static getAuthToken() {
    // First priority: Check for 'sid' parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const sidParam = urlParams.get('sid');
    
    if (sidParam) {
      console.log(`XML-RPC: Using sid parameter token: ${sidParam}`);
      return sidParam;
    }
    
    // Second priority: Get PHPSESSID cookie value
    const cookies = document.cookie.split(';');
    const phpSessionCookie = cookies.find(cookie => 
      cookie.trim().startsWith('PHPSESSID=')
    );
    
    if (phpSessionCookie) {
      const token = phpSessionCookie.split('=')[1].trim();
      console.log(`XML-RPC: Using PHPSESSID token: ${token}`);
      return token;
    }
    
    // Third priority: Try remember_sid cookie (not httpOnly)
    const rememberSidCookie = cookies.find(cookie => 
      cookie.trim().startsWith('remember_sid=')
    );
    
    if (rememberSidCookie) {
      const token = rememberSidCookie.split('=')[1].trim();
      console.log(`XML-RPC: Using remember_sid token: ${token}`);
      return token;
    }
    
    // Fallback: empty token (no logging for anonymous users)
    return '';
  }

  /**
   * Parse XML-RPC response
   */
  static parseXmlRpcResponse(xmlText) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      throw new Error(`XML parsing failed: ${parseError.textContent}`);
    }
    
    return xmlDoc;
  }

  /**
   * Extract struct data from XML (now handles nested structures)
   */
  static extractStructData(structElement) {
    const data = {};
    const members = structElement.querySelectorAll(':scope > member'); // Only direct children
    
    members.forEach(member => {
      const name = member.querySelector('name')?.textContent;
      const valueElement = member.querySelector('value');
      
      if (name && valueElement) {
        // Check for different value types
        const stringValue = valueElement.querySelector('string')?.textContent;
        const intValue = valueElement.querySelector('int')?.textContent;
        const doubleValue = valueElement.querySelector('double')?.textContent;
        const nestedStruct = valueElement.querySelector('struct');
        const nestedArray = valueElement.querySelector('array');
        
        if (nestedStruct) {
          // Recursively extract nested struct - check this FIRST
          data[name] = this.extractStructData(nestedStruct);
        } else if (nestedArray) {
          // Extract array data
          data[name] = this.extractArrayData(nestedArray);
        } else if (stringValue !== undefined) {
          data[name] = stringValue;
        } else if (intValue !== undefined) {
          data[name] = intValue;
        } else if (doubleValue !== undefined) {
          data[name] = doubleValue;
        } else {
          // Fallback to text content
          const textValue = valueElement.textContent?.trim();
          if (textValue) {
            data[name] = textValue;
          }
        }
      }
    });
    
    return data;
  }

  /**
   * Extract array data from XML
   */
  static extractArrayData(arrayElement) {
    const arrayData = [];
    const dataElement = arrayElement.querySelector('data');
    
    if (dataElement) {
      const values = dataElement.querySelectorAll(':scope > value'); // Only direct children
      
      values.forEach(valueElement => {
        const stringValue = valueElement.querySelector('string')?.textContent;
        const intValue = valueElement.querySelector('int')?.textContent;
        const nestedStruct = valueElement.querySelector('struct');
        const nestedArray = valueElement.querySelector('array');
        
        if (stringValue !== undefined) {
          arrayData.push(stringValue);
        } else if (intValue !== undefined) {
          arrayData.push(intValue);
        } else if (nestedStruct) {
          arrayData.push(this.extractStructData(nestedStruct));
        } else if (nestedArray) {
          arrayData.push(this.extractArrayData(nestedArray));
        } else {
          const textValue = valueElement.textContent?.trim();
          if (textValue) {
            arrayData.push(textValue);
          }
        }
      });
    }
    
    return arrayData;
  }

  // Note: login() method removed - all other XML-RPC methods use PHPSESSID cookie authentication

  /**
   * Get supported languages for upload
   */
  static async getSubLanguages() {
    try {
      // Check cache first
      const cached = CacheService.loadFromCache(CACHE_KEYS.XMLRPC_LANGUAGES);
      if (cached) {
        return { data: cached, fromCache: true };
      }

      const xmlRpcBody = `<?xml version="1.0"?>
<methodCall>
  <methodName>GetSubLanguages</methodName>
  <params>
    <param><value><string>en</string></value></param>
  </params>
</methodCall>`;

      const response = await delayedFetch(API_ENDPOINTS.OPENSUBTITLES_XMLRPC, {
        method: 'POST',
        headers: getApiHeaders('text/xml'),
        body: xmlRpcBody,
      });

      if (!response.ok) {
        throw new Error(`XML-RPC request failed: ${response.status} ${response.statusText}`);
      }

      const xmlText = await response.text();
      const xmlDoc = this.parseXmlRpcResponse(xmlText);
      
      const languages = [];
      const arrayData = xmlDoc.querySelector('methodResponse param value array data');
      
      if (arrayData) {
        const structElements = arrayData.querySelectorAll('value struct');
        
        structElements.forEach(struct => {
          const language = this.extractStructData(struct);
          if (Object.keys(language).length > 0) {
            languages.push(language);
          }
        });
      }

      // Save to cache
      CacheService.saveToCache(CACHE_KEYS.XMLRPC_LANGUAGES, languages);

      return { data: languages, fromCache: false };
    } catch (error) {
      console.error('XML-RPC GetSubLanguages failed:', error);
      throw error;
    }
  }

  /**
   * Generate cache key for movie guessing
   * @param {string} filename - The filename to generate key for
   * @returns {string} - Cache key
   */
  static generateMovieGuessCacheKey(filename) {
    // Create a simple hash of the filename for the cache key
    return `${CACHE_KEYS.MOVIE_GUESS_CACHE}_${btoa(filename).replace(/[^a-zA-Z0-9]/g, '_')}`;
  }

  /**
   * Load movie guess data from cache
   * @param {string} filename - The filename to check cache for
   * @returns {Object|null} - Cached data or null
   */
  static loadMovieGuessFromCache(filename) {
    const cacheKey = this.generateMovieGuessCacheKey(filename);
    return CacheService.loadFromCache(cacheKey);
  }

  /**
   * Save movie guess data to cache
   * @param {string} filename - The filename to save cache for
   * @param {Object} data - The movie guess response data
   * @returns {Object} - Cache save result
   */
  static saveMovieGuessToCache(filename, data) {
    const cacheKey = this.generateMovieGuessCacheKey(filename);
    return CacheService.saveToCacheWithDuration(cacheKey, data, DEFAULT_SETTINGS.MOVIE_GUESS_CACHE_DURATION);
  }

  /**
   * Guess movie from filename (without cache)
   */
  static async guessMovieFromStringUncached(filename) {
    try {
      const token = this.getAuthToken();
      const xmlRpcBody = `<?xml version="1.0"?>
<methodCall>
  <methodName>GuessMovieFromString</methodName>
  <params>
    <param><value><string>${token}</string></value></param>
    <param>
      <value>
        <array>
          <data>
            <value><string>${filename}</string></value>
          </data>
        </array>
      </value>
    </param>
  </params>
</methodCall>`;

      const response = await delayedFetch(API_ENDPOINTS.OPENSUBTITLES_XMLRPC, {
        method: 'POST',
        headers: getApiHeaders('text/xml'),
        body: xmlRpcBody,
      }, DEFAULT_SETTINGS.MOVIE_GUESS_DELAY);

      if (!response.ok) {
        throw new Error(`XML-RPC request failed: ${response.status} ${response.statusText}`);
      }

      const xmlText = await response.text();
      const xmlDoc = this.parseXmlRpcResponse(xmlText);
      
      const movieData = {};
      const responseStruct = xmlDoc.querySelector('methodResponse param value struct');
      
      if (responseStruct) {
        const statusMember = Array.from(responseStruct.querySelectorAll('member')).find(member => 
          member.querySelector('name')?.textContent === 'status'
        );
        const status = statusMember?.querySelector('value string')?.textContent;
        
        if (status === '200 OK') {
          const dataMember = Array.from(responseStruct.querySelectorAll('member')).find(member => 
            member.querySelector('name')?.textContent === 'data'
          );
          
          if (dataMember) {
            const fileDataStruct = dataMember.querySelector('value struct');
            if (fileDataStruct) {
              const filenameMember = Array.from(fileDataStruct.querySelectorAll('member')).find(member => 
                member.querySelector('name')?.textContent === filename
              );
              
              if (filenameMember) {
                const filenameStruct = filenameMember.querySelector('value struct');
                if (filenameStruct) {
                  // Debug: Log all available members
                  const allMembers = Array.from(filenameStruct.querySelectorAll('member'));
                  const memberNames = allMembers.map(m => m.querySelector('name')?.textContent).filter(Boolean);
                  console.log(`[XML-RPC DEBUG] Available members for ${filename}:`, memberNames);
                  const bestGuessMember = Array.from(filenameStruct.querySelectorAll('member')).find(member => 
                    member.querySelector('name')?.textContent === 'BestGuess'
                  );
                  
                  if (bestGuessMember) {
                    const bestGuessStruct = bestGuessMember.querySelector('value struct');
                    if (bestGuessStruct) {
                      const bestGuessData = this.extractStructData(bestGuessStruct);
                      
                      // Map API field names to standard names
                      if (bestGuessData.IDMovieIMDB) movieData.imdbid = bestGuessData.IDMovieIMDB;
                      if (bestGuessData.MovieName) movieData.title = bestGuessData.MovieName;
                      if (bestGuessData.MovieYear) movieData.year = bestGuessData.MovieYear;
                      if (bestGuessData.MovieKind) movieData.kind = bestGuessData.MovieKind;
                      if (bestGuessData.Reason) movieData.reason = bestGuessData.Reason;
                    }
                  }
                  
                  // Extract GuessIt data if available
                  const guessItMember = Array.from(filenameStruct.querySelectorAll('member')).find(member => 
                    member.querySelector('name')?.textContent === 'GuessIt'
                  );
                  
                  if (guessItMember) {
                    const guessItStruct = guessItMember.querySelector('value struct');
                    if (guessItStruct) {
                      const guessItData = this.extractStructData(guessItStruct);
                      console.log(`[XML-RPC DEBUG] Found GuessIt data for ${filename}:`, guessItData);
                      movieData.guessit = guessItData;
                    } else {
                      console.log(`[XML-RPC DEBUG] GuessIt member found but no struct for ${filename}`);
                    }
                  } else {
                    console.log(`[XML-RPC DEBUG] No GuessIt member found for ${filename}`);
                  }
                }
              }
            }
          }
        }
      }
      
      return Object.keys(movieData).length > 0 ? movieData : null;
    } catch (error) {
      console.error(`GuessMovieFromString failed for ${filename}:`, error);
      throw error;
    }
  }

  /**
   * Guess movie from filename with caching
   * @param {string} filename - The filename to analyze
   * @param {Function} addDebugInfo - Debug callback (optional)
   * @returns {Promise<Object>} - Movie guess data
   */
  static async guessMovieFromString(filename, addDebugInfo = null) {
    // Check cache first
    const cachedData = this.loadMovieGuessFromCache(filename);
    if (cachedData) {
      console.log(`Movie Guess cache hit for: ${filename}`);
      if (addDebugInfo) {
        addDebugInfo(`🎯 Movie Guess cache HIT for ${filename} (no XML-RPC call needed)`);
      }
      return cachedData;
    }

    // Cache miss, make XML-RPC call
    console.log(`Movie Guess cache miss for: ${filename}, making XML-RPC call`);
    if (addDebugInfo) {
      addDebugInfo(`❌ Movie Guess cache MISS for ${filename}, making XML-RPC call`);
    }
    
    const data = await this.guessMovieFromStringUncached(filename);
    
    // Save to cache (including null results to avoid repeated failed lookups)
    this.saveMovieGuessToCache(filename, data);
    if (addDebugInfo) {
      addDebugInfo(`💾 Movie Guess result cached for ${filename} (72 hours)`);
    }
    
    return data;
  }

  /**
   * Get user info using XML-RPC API
   * @returns {Promise<Object>} - User info object
   */
  static async getUserInfo() {
    try {
      const token = this.getAuthToken();
      
      const xmlRpcBody = `<?xml version="1.0"?>
<methodCall>
  <methodName>GetUserInfo</methodName>
  <params>
    <param><value><string>${token}</string></value></param>
  </params>
</methodCall>`;

      const response = await delayedFetch(API_ENDPOINTS.OPENSUBTITLES_XMLRPC, {
        method: 'POST',
        headers: getApiHeaders('text/xml'),
        body: xmlRpcBody,
      });

      if (!response.ok) {
        throw new Error(`XML-RPC GetUserInfo failed: ${response.status} ${response.statusText}`);
      }

      const xmlText = await response.text();
      const xmlDoc = this.parseXmlRpcResponse(xmlText);
      
      // Parse response
      const responseStruct = xmlDoc.querySelector('methodResponse param value struct');
      if (responseStruct) {
        const result = this.extractStructData(responseStruct);
        
        if (result.status === '200 OK' && result.data) {
          return result.data;
        } else {
          throw new Error(`GetUserInfo failed: ${result.status || 'Unknown error'}`);
        }
      }
      
      throw new Error('Invalid GetUserInfo response structure');
    } catch (error) {
      console.error('GetUserInfo failed:', error);
      throw error;
    }
  }

  /**
   * Search for movies using XML-RPC API
   * @param {string} query - Search query
   * @returns {Promise<Array>} - Array of movie results
   */
  static async searchMovies(query) {
    try {
      const token = this.getAuthToken();
      
      const xmlRpcBody = `<?xml version="1.0"?>
<methodCall>
  <methodName>SearchMoviesOnIMDB</methodName>
  <params>
    <param><value><string>${token}</string></value></param>
    <param><value><string>${this.escapeXmlContent(query)}</string></value></param>
  </params>
</methodCall>`;

      const response = await delayedFetch(API_ENDPOINTS.OPENSUBTITLES_XMLRPC, {
        method: 'POST',
        headers: getApiHeaders('text/xml'),
        body: xmlRpcBody,
      });

      if (!response.ok) {
        throw new Error(`XML-RPC SearchMoviesOnIMDB failed: ${response.status} ${response.statusText}`);
      }

      const xmlText = await response.text();
      const xmlDoc = this.parseXmlRpcResponse(xmlText);
      
      // Parse response
      const responseStruct = xmlDoc.querySelector('methodResponse param value struct');
      if (responseStruct) {
        const result = this.extractStructData(responseStruct);
        
        // Extract movie data from response
        if (result.data && Array.isArray(result.data)) {
          return result.data;
        } else if (result.data) {
          // Sometimes data is not in array format
          return [result.data];
        }
        
        return [];
      }
      
      return [];
    } catch (error) {
      console.error('SearchMoviesOnIMDB failed:', error);
      throw error;
    }
  }

  /**
   * Guess movie from filename with retry logic
   */
  static async guessMovieFromStringWithRetry(filename, addDebugInfo = null) {
    // Check cache first
    const cachedData = this.loadMovieGuessFromCache(filename);
    if (cachedData) {
      if (addDebugInfo) {
        addDebugInfo(`🎯 Movie Guess cache HIT for ${filename} (no XML-RPC call needed)`);
      }
      return cachedData;
    }

    // Cache miss, use retry logic
    if (addDebugInfo) {
      addDebugInfo(`❌ Movie Guess cache MISS for ${filename}, making XML-RPC call with retry`);
    }

    return retryAsync(
      () => this.guessMovieFromStringUncached(filename),
      3, // max attempts
      3000, // base delay (3 seconds)
      (attempt, maxAttempts) => {
        if (addDebugInfo) {
          if (attempt > 1) {
            addDebugInfo(`Movie guess attempt ${attempt}/${maxAttempts} for ${filename}`);
          }
        }
      }
    ).then(data => {
      // Save successful result to cache
      this.saveMovieGuessToCache(filename, data);
      if (addDebugInfo) {
        addDebugInfo(`💾 Movie Guess result cached for ${filename} (72 hours)`);
      }
      return data;
    });
  }

  /**
   * Check if subtitle hashes exist in database using XML-RPC API
   * @param {Array<string>} hashes - Array of MD5 hashes to check
   * @returns {Promise<Object>} - Response with hash check results
   */
  static async checkSubHash(hashes) {
    try {
      const token = this.getAuthToken();
      
      // Convert hashes array to XML-RPC format
      const xmlRpcBody = this.buildCheckSubHashXml(token, hashes);
      
      const response = await delayedFetch(API_ENDPOINTS.OPENSUBTITLES_XMLRPC, {
        method: 'POST',
        headers: getApiHeaders('text/xml'),
        body: xmlRpcBody,
      });

      if (!response.ok) {
        throw new Error(`XML-RPC CheckSubHash failed: ${response.status} ${response.statusText}`);
      }

      const xmlText = await response.text();
      const xmlDoc = this.parseXmlRpcResponse(xmlText);
      
      // Parse response
      const responseStruct = xmlDoc.querySelector('methodResponse param value struct');
      if (responseStruct) {
        return this.extractStructData(responseStruct);
      }
      
      throw new Error('Invalid CheckSubHash response structure');
    } catch (error) {
      console.error('CheckSubHash failed:', error);
      throw error;
    }
  }

  /**
   * Build XML-RPC body for CheckSubHash
   * @param {string} token - Login token
   * @param {Array<string>} hashes - Array of MD5 hashes to check
   * @returns {string} - XML-RPC body
   */
  static buildCheckSubHashXml(token, hashes) {
    const hashesXml = hashes.map(hash => `<value><string>${hash}</string></value>`).join('');
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<methodCall>
  <methodName>CheckSubHash</methodName>
  <params>
    <param>
      <value>
        <string>${token}</string>
      </value>
    </param>
    <param>
      <value>
        <array>
          <data>
            ${hashesXml}
          </data>
        </array>
      </value>
    </param>
  </params>
</methodCall>`;
  }

  /**
   * Try to upload subtitles using XML-RPC API with PHPSESSID token
   * @param {Object} uploadData - Upload data structure
   * @returns {Promise<Object>} - Upload response
   */
  static async tryUploadSubtitles(uploadData) {
    try {
      const token = this.getAuthToken();
      
      // Convert upload data to XML-RPC format
      const xmlRpcBody = this.buildTryUploadXml(token, uploadData);
      
      const response = await delayedFetch(API_ENDPOINTS.OPENSUBTITLES_XMLRPC, {
        method: 'POST',
        headers: getApiHeaders('text/xml'),
        body: xmlRpcBody,
      });

      if (!response.ok) {
        throw new Error(`XML-RPC TryUploadSubtitles failed: ${response.status} ${response.statusText}`);
      }

      const xmlText = await response.text();
      const xmlDoc = this.parseXmlRpcResponse(xmlText);
      
      // Parse response
      const responseStruct = xmlDoc.querySelector('methodResponse param value struct');
      if (responseStruct) {
        return this.extractStructData(responseStruct);
      }
      
      throw new Error('Invalid TryUploadSubtitles response structure');
    } catch (error) {
      console.error('TryUploadSubtitles failed:', error);
      throw error;
    }
  }

  /**
   * Build XML-RPC body for TryUploadSubtitles
   * @param {string} token - Login token
   * @param {Object} uploadData - Upload data structure
   * @returns {string} - XML-RPC body
   */
  static buildTryUploadXml(token, uploadData) {
    // Always use cd1 (multi-CD subtitles are no longer used)
    const subtitle = uploadData.subtitles[0]; // Take first subtitle
    
    return `<?xml version="1.0"?>
<methodCall>
  <methodName>TryUploadSubtitles</methodName>
  <params>
    <param><value><string>${token}</string></value></param>
    <param>
      <value>
        <struct>
          <member>
            <name>cd1</name>
            <value>
              <struct>
                <member>
                  <name>subhash</name>
                  <value><string>${subtitle.subhash}</string></value>
                </member>
                <member>
                  <name>subfilename</name>
                  <value><string>${subtitle.subfilename}</string></value>
                </member>
                ${subtitle.moviehash ? `
                <member>
                  <name>moviehash</name>
                  <value><string>${subtitle.moviehash}</string></value>
                </member>` : ''}
                ${subtitle.moviebytesize ? `
                <member>
                  <name>moviebytesize</name>
                  <value><string>${subtitle.moviebytesize}</string></value>
                </member>` : ''}
                ${subtitle.moviefilename ? `
                <member>
                  <name>moviefilename</name>
                  <value><string>${subtitle.moviefilename}</string></value>
                </member>` : ''}
                ${subtitle.idmovieimdb ? `
                <member>
                  <name>idmovieimdb</name>
                  <value><string>${subtitle.idmovieimdb}</string></value>
                </member>` : ''}
              </struct>
            </value>
          </member>
        </struct>
      </value>
    </param>
  </params>
</methodCall>`;
  }

  /**
   * Upload subtitles using XML-RPC API (for new uploads when alreadyindb=0)
   * @param {Object} uploadData - Upload data structure with baseinfo and cd1
   * @returns {Promise<Object>} - Upload response
   */
  static async uploadSubtitles(uploadData) {
    try {
      const token = this.getAuthToken();
      
      // Convert upload data to XML-RPC format
      const xmlRpcBody = this.buildUploadSubtitlesXml(token, uploadData);
      
      const response = await delayedFetch(API_ENDPOINTS.OPENSUBTITLES_XMLRPC, {
        method: 'POST',
        headers: getApiHeaders('text/xml'),
        body: xmlRpcBody,
      });

      if (!response.ok) {
        throw new Error(`XML-RPC UploadSubtitles failed: ${response.status} ${response.statusText}`);
      }

      const xmlText = await response.text();
      const xmlDoc = this.parseXmlRpcResponse(xmlText);
      
      // Parse response
      const responseStruct = xmlDoc.querySelector('methodResponse param value struct');
      if (responseStruct) {
        return this.extractStructData(responseStruct);
      }
      
      throw new Error('Invalid UploadSubtitles response structure');
    } catch (error) {
      console.error('UploadSubtitles failed:', error);
      throw error;
    }
  }

  /**
   * Build XML-RPC body for UploadSubtitles
   * @param {string} token - Login token
   * @param {Object} uploadData - Upload data structure
   * @returns {string} - XML-RPC body
   */
  static buildUploadSubtitlesXml(token, uploadData) {
    const baseinfo = uploadData.baseinfo;
    const cd1 = uploadData.cd1;
    
    return `<?xml version="1.0"?>
<methodCall>
  <methodName>UploadSubtitles</methodName>
  <params>
    <param><value><string>${token}</string></value></param>
    <param>
      <value>
        <struct>
          <member>
            <name>baseinfo</name>
            <value>
              <struct>
                <member>
                  <name>idmovieimdb</name>
                  <value><string>${baseinfo.idmovieimdb}</string></value>
                </member>
                ${baseinfo.moviereleasename ? `
                <member>
                  <name>moviereleasename</name>
                  <value><string>${this.escapeXmlContent(baseinfo.moviereleasename)}</string></value>
                </member>` : ''}
                ${baseinfo.sublanguageid ? `
                <member>
                  <name>sublanguageid</name>
                  <value><string>${baseinfo.sublanguageid}</string></value>
                </member>` : ''}
                ${baseinfo.subauthorcomment ? `
                <member>
                  <name>subauthorcomment</name>
                  <value><string>${this.escapeXmlContent(baseinfo.subauthorcomment)}</string></value>
                </member>` : ''}
                <member>
                  <name>hearingimpaired</name>
                  <value><string>${baseinfo.hearingimpaired || '0'}</string></value>
                </member>
                ${baseinfo.highdefinition !== undefined ? `
                <member>
                  <name>highdefinition</name>
                  <value><string>${baseinfo.highdefinition}</string></value>
                </member>` : ''}
                <member>
                  <name>automatictranslation</name>
                  <value><string>${baseinfo.automatictranslation || '0'}</string></value>
                </member>
                <member>
                  <name>foreignpartsonly</name>
                  <value><string>${baseinfo.foreignpartsonly || '0'}</string></value>
                </member>
              </struct>
            </value>
          </member>
          <member>
            <name>cd1</name>
            <value>
              <struct>
                <member>
                  <name>subhash</name>
                  <value><string>${cd1.subhash}</string></value>
                </member>
                <member>
                  <name>subfilename</name>
                  <value><string>${this.escapeXmlContent(cd1.subfilename)}</string></value>
                </member>
                ${cd1.moviehash ? `
                <member>
                  <name>moviehash</name>
                  <value><string>${cd1.moviehash}</string></value>
                </member>` : ''}
                ${cd1.moviebytesize ? `
                <member>
                  <name>moviebytesize</name>
                  <value><string>${cd1.moviebytesize}</string></value>
                </member>` : ''}
                ${cd1.moviefilename ? `
                <member>
                  <name>moviefilename</name>
                  <value><string>${this.escapeXmlContent(cd1.moviefilename)}</string></value>
                </member>` : ''}
                <member>
                  <name>subcontent</name>
                  <value><string>${this.escapeXmlContent(cd1.subcontent)}</string></value>
                </member>
                ${cd1.movietimems ? `
                <member>
                  <name>movietimems</name>
                  <value><string>${cd1.movietimems}</string></value>
                </member>` : ''}
                ${cd1.moviefps ? `
                <member>
                  <name>moviefps</name>
                  <value><string>${cd1.moviefps}</string></value>
                </member>` : ''}
                ${cd1.movieframes ? `
                <member>
                  <name>movieframes</name>
                  <value><string>${cd1.movieframes}</string></value>
                </member>` : ''}
              </struct>
            </value>
          </member>
        </struct>
      </value>
    </param>
  </params>
</methodCall>`;
  }

  /**
   * Escape XML content for safe embedding
   * @param {string} content - Content to escape
   * @returns {string} - Escaped content
   */
  static escapeXmlContent(content) {
    return content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

}