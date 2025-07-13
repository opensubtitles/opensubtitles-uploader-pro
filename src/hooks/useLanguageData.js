import { useState, useEffect, useCallback, useRef } from 'react';
import { OpenSubtitlesApiService } from '../services/api/openSubtitlesApi.js';
import { XmlRpcService } from '../services/api/xmlrpc.js';

// Global debug function to prevent duplicate logging
let globalDebugFunction = null;

// Singleton state to prevent multiple simultaneous loads across all component instances
const LanguageDataSingleton = {
  restApiLoaded: false,
  xmlRpcLoaded: false,
  dataCombined: false,
  restLoading: false,
  xmlRpcLoading: false,
  combining: false,
  combineTimeout: null,
  combineLogShown: false,
  combineCompleteLogShown: false,
  restData: null,
  xmlRpcData: null,
  combinedData: null,
  
  // Global logging function to prevent duplicates
  log(message) {
    if (globalDebugFunction && !this.combineLogShown && message.includes('Combining language data')) {
      this.combineLogShown = true;
      globalDebugFunction(message);
    } else if (globalDebugFunction && !this.combineCompleteLogShown && message.includes('Languages:')) {
      this.combineCompleteLogShown = true;
      globalDebugFunction(message);
    }
  },
  
  reset() {
    this.restApiLoaded = false;
    this.xmlRpcLoaded = false;
    this.dataCombined = false;
    this.restLoading = false;
    this.xmlRpcLoading = false;
    this.combining = false;
    this.combineLogShown = false;
    this.combineCompleteLogShown = false;
    if (this.combineTimeout) {
      clearTimeout(this.combineTimeout);
      this.combineTimeout = null;
    }
  }
};

/**
 * Custom hook for managing language data from multiple APIs
 */
export const useLanguageData = (addDebugInfo) => {
  const [languageMap, setLanguageMap] = useState({});
  const [xmlRpcLanguages, setXmlRpcLanguages] = useState([]);
  const [combinedLanguages, setCombinedLanguages] = useState({});
  const [languagesLoading, setLanguagesLoading] = useState(true);
  const [languagesError, setLanguagesError] = useState(null);
  const [subtitleLanguages, setSubtitleLanguages] = useState({});
  
  const languagesLoadedRef = useRef(false);
  const xmlRpcLanguagesRef = useRef(false);
  const combinedRef = useRef(false);
  
  // Set global debug function on first hook instance
  if (!globalDebugFunction) {
    globalDebugFunction = addDebugInfo;
  }

  // Load supported languages from REST API
  const loadLanguages = useCallback(async () => {
    if (LanguageDataSingleton.restApiLoaded || LanguageDataSingleton.restLoading) {
      if (LanguageDataSingleton.restData) {
        setLanguageMap(LanguageDataSingleton.restData);
      }
      return;
    }
    
    LanguageDataSingleton.restLoading = true;
    addDebugInfo("📥 Loading REST API languages...");
    setLanguagesLoading(true);
    setLanguagesError(null);
    
    try {
      const { data, fromCache } = await OpenSubtitlesApiService.getSupportedLanguages();
      LanguageDataSingleton.restData = data;
      LanguageDataSingleton.restApiLoaded = true;
      setLanguageMap(data);
      addDebugInfo(`✅ REST: ${Object.keys(data).length} languages ${fromCache ? '(cached)' : '(API)'}`);
    } catch (error) {
      addDebugInfo(`Error loading languages: ${error.message}`);
      setLanguagesError(error.message);
      setLanguageMap({});
    } finally {
      setLanguagesLoading(false);
      LanguageDataSingleton.restLoading = false;
    }
  }, [addDebugInfo]);

  // Load XML-RPC languages
  const loadXmlRpcLanguages = useCallback(async () => {
    if (LanguageDataSingleton.xmlRpcLoaded || LanguageDataSingleton.xmlRpcLoading) {
      if (LanguageDataSingleton.xmlRpcData) {
        setXmlRpcLanguages(LanguageDataSingleton.xmlRpcData);
      }
      return;
    }
    
    LanguageDataSingleton.xmlRpcLoading = true;
    addDebugInfo("📥 Loading XML-RPC languages...");
    
    try {
      const { data, fromCache } = await XmlRpcService.getSubLanguages();
      LanguageDataSingleton.xmlRpcData = data;
      LanguageDataSingleton.xmlRpcLoaded = true;
      setXmlRpcLanguages(data);
      addDebugInfo(`✅ XML-RPC: ${data.length} languages ${fromCache ? '(cached)' : '(API)'}`);
    } catch (error) {
      addDebugInfo(`XML-RPC GetSubLanguages failed: ${error.message}`);
    } finally {
      LanguageDataSingleton.xmlRpcLoading = false;
    }
  }, [addDebugInfo]);

  // Combine language data from both APIs
  const combineLanguageData = useCallback(() => {
    if (xmlRpcLanguages.length === 0 || Object.keys(languageMap).length <= 1) {
      return;
    }
    
    // Prevent multiple combines on page reload
    if (LanguageDataSingleton.dataCombined || LanguageDataSingleton.combining) {
      if (LanguageDataSingleton.combinedData) {
        setCombinedLanguages(LanguageDataSingleton.combinedData);
      }
      return;
    }
    
    LanguageDataSingleton.combining = true;
    
    // Use singleton logging to prevent duplicates
    LanguageDataSingleton.log("🔗 Combining language data...");
    
    const combined = {};
    let matchedCount = 0;
    let unmatchedXmlRpc = 0;
    let unmatchedRest = 0;
    
    // Start with XML-RPC languages (upload enabled)
    xmlRpcLanguages.forEach(xmlLang => {
      const iso639 = xmlLang.ISO639?.toLowerCase();
      if (!iso639) return;
      
      // Find matching REST API language
      const restLang = Object.entries(languageMap).find(([key, lang]) => 
        key.toLowerCase() === iso639 || lang.language_code?.toLowerCase() === iso639
      )?.[1];
      
      if (restLang) {
        combined[iso639] = {
          subLanguageID: xmlLang.SubLanguageID,
          languageName: xmlLang.LanguageName,
          iso639: xmlLang.ISO639,
          flag: restLang.flag,
          language_code: restLang.language_code,
          originalName: restLang.originalName,
          iso639_3: restLang.iso639_3,
          canUpload: true,
          displayName: restLang.name || xmlLang.LanguageName
        };
        matchedCount++;
      } else {
        combined[iso639] = {
          subLanguageID: xmlLang.SubLanguageID,
          languageName: xmlLang.LanguageName,
          iso639: xmlLang.ISO639,
          flag: '🏳️',
          canUpload: true,
          displayName: xmlLang.LanguageName
        };
        unmatchedXmlRpc++;
      }
    });
    
    // Add REST API languages that weren't in XML-RPC (detection only)
    Object.entries(languageMap).forEach(([code, restLang]) => {
      if (code === 'default') return;
      
      const iso639 = restLang.iso639_3?.toLowerCase() || restLang.language_code?.toLowerCase();
      if (!iso639 || combined[iso639]) return;
      
      combined[iso639] = {
        flag: restLang.flag,
        language_code: restLang.language_code,
        originalName: restLang.originalName,
        iso639_3: restLang.iso639_3,
        canUpload: false,
        displayName: restLang.name
      };
      unmatchedRest++;
    });
    
    LanguageDataSingleton.combinedData = combined;
    LanguageDataSingleton.dataCombined = true;
    LanguageDataSingleton.combining = false;
    
    setCombinedLanguages(combined);
    
    // Use singleton logging to prevent duplicates
    LanguageDataSingleton.log(`✅ Languages: ${matchedCount} matched, ${unmatchedXmlRpc} XML-RPC only, ${unmatchedRest} REST only`);
  }, [xmlRpcLanguages, languageMap, addDebugInfo]);

  // Handle subtitle language selection
  const handleSubtitleLanguageChange = useCallback((subtitlePath, languageCode) => {
    setSubtitleLanguages(prev => ({
      ...prev,
      [subtitlePath]: languageCode
    }));
  }, []);

  // Clear subtitle language selections (for fresh file drops)
  const clearSubtitleLanguages = useCallback(() => {
    setSubtitleLanguages({});
  }, []);

  // Get language info
  const getLanguageInfo = useCallback((languageCode) => {
    if (!languageCode) {
      return { flag: '🏳️', name: 'Unknown' };
    }
    
    let code;
    if (typeof languageCode === 'object' && languageCode.language_code) {
      code = languageCode.language_code.toLowerCase();
    } else if (typeof languageCode === 'string') {
      code = languageCode.toLowerCase();
    } else {
      return { flag: '🏳️', name: 'Unknown' };
    }
    
    if (languageMap[code]) {
      return languageMap[code];
    }
    return { flag: '🏳️', name: code.toUpperCase() };
  }, [languageMap]);

  // Get selected language for subtitle
  const getSubtitleLanguage = useCallback((subtitle) => {
    const selected = subtitleLanguages[subtitle.fullPath];
    if (selected) return selected;
    
    // Default to detected language if available
    if (subtitle.detectedLanguage && 
        typeof subtitle.detectedLanguage === 'object' && 
        subtitle.detectedLanguage.language_code) {
      return subtitle.detectedLanguage.language_code.toLowerCase();
    }
    
    return '';
  }, [subtitleLanguages]);

  // Get language options for subtitle dropdown
  const getLanguageOptionsForSubtitle = useCallback((subtitle) => {
    const options = [];
    
    // Add detected languages first
    if (subtitle.detectedLanguage && 
        typeof subtitle.detectedLanguage === 'object' && 
        subtitle.detectedLanguage.all_languages) {
      
      subtitle.detectedLanguage.all_languages
        .sort((a, b) => b.confidence - a.confidence)
        .forEach(lang => {
          const code = lang.language_code.toLowerCase();
          const combinedLang = combinedLanguages[code];
          if (combinedLang && combinedLang.canUpload) {
            options.push({
              code,
              ...combinedLang,
              confidence: lang.confidence,
              isDetected: true
            });
          }
        });
    }
    
    // Add other upload-enabled languages
    const detectedCodes = new Set(options.map(opt => opt.code));
    Object.entries(combinedLanguages)
      .filter(([code, lang]) => lang.canUpload && !detectedCodes.has(code))
      .sort(([_, a], [__, b]) => a.displayName.localeCompare(b.displayName))
      .forEach(([code, lang]) => {
        options.push({
          code,
          ...lang,
          isDetected: false
        });
      });
    
    return options;
  }, [combinedLanguages]);

  // Initialize language loading
  useEffect(() => {
    loadLanguages();
    loadXmlRpcLanguages();
    
    // Cleanup function for StrictMode
    return () => {
      // Reset refs if component unmounts during StrictMode double-render
      if (!languageMap || Object.keys(languageMap).length === 0) {
        languagesLoadedRef.current = false;
      }
      if (!xmlRpcLanguages || xmlRpcLanguages.length === 0) {
        xmlRpcLanguagesRef.current = false;
      }
    };
  }, [loadLanguages, loadXmlRpcLanguages, languageMap, xmlRpcLanguages]);

  // Combine language data when both APIs have loaded
  useEffect(() => {
    const languageMapSize = Object.keys(languageMap).length;
    
    // If singleton already has combined data, use it
    if (LanguageDataSingleton.dataCombined && LanguageDataSingleton.combinedData) {
      setCombinedLanguages(LanguageDataSingleton.combinedData);
      return;
    }
    
    if (xmlRpcLanguages.length > 0 && languageMapSize > 1 && !LanguageDataSingleton.dataCombined && !LanguageDataSingleton.combining) {
      // Use timeout to debounce multiple rapid calls from StrictMode
      if (LanguageDataSingleton.combineTimeout) {
        clearTimeout(LanguageDataSingleton.combineTimeout);
      }
      
      LanguageDataSingleton.combineTimeout = setTimeout(() => {
        combineLanguageData();
        LanguageDataSingleton.combineTimeout = null;
      }, 10);
    }
  }, [xmlRpcLanguages, languageMap, combineLanguageData]);

  return {
    languageMap,
    xmlRpcLanguages,
    combinedLanguages,
    languagesLoading,
    languagesError,
    subtitleLanguages,
    handleSubtitleLanguageChange,
    clearSubtitleLanguages,
    getLanguageInfo,
    getSubtitleLanguage,
    getLanguageOptionsForSubtitle,
    loadLanguages,
    loadXmlRpcLanguages
  };
};

