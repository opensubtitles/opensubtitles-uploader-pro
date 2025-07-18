import { APP_VERSION } from '../utils/constants.js';

// Dynamic imports for Tauri APIs - only available in Tauri environment
let tauriUpdater = null;
let tauriProcess = null;

const loadTauriAPIs = async () => {
  if (window.__TAURI__ && !tauriUpdater) {
    try {
      tauriUpdater = await import('@tauri-apps/api/updater');
      tauriProcess = await import('@tauri-apps/api/process');
    } catch (error) {
      console.warn('Failed to load Tauri APIs:', error);
    }
  }
};

/**
 * Auto-update service for Tauri application
 */
export class UpdateService {
  static instance = null;
  static updateCache = {
    lastChecked: null,
    updateAvailable: false,
    updateInfo: null,
    cacheTimeout: 60 * 60 * 1000 // 1 hour in milliseconds
  };

  /**
   * Get singleton instance
   */
  static getInstance() {
    if (!UpdateService.instance) {
      UpdateService.instance = new UpdateService();
    }
    return UpdateService.instance;
  }

  constructor() {
    this.isStandalone = this.detectStandaloneMode();
    this.listeners = [];
    this.autoCheckInterval = null;
    this.isInstalling = false;
    this.init();
  }

  async init() {
    if (this.isStandalone) {
      await loadTauriAPIs();
      this.setupUpdaterListeners();
    }
  }

  /**
   * Detect if running as standalone Tauri app
   */
  detectStandaloneMode() {
    return window.__TAURI__ !== undefined;
  }

  /**
   * Setup updater event listeners
   */
  setupUpdaterListeners() {
    if (!this.isStandalone || !tauriUpdater) return;

    try {
      tauriUpdater.onUpdaterEvent(({ error, status }) => {
        console.log('🔄 Updater event:', { error, status });
        this.notifyListeners({ type: 'updater_event', error, status });
      });
    } catch (error) {
      console.error('❌ Failed to setup updater listeners:', error);
    }
  }

  /**
   * Check for updates with caching
   * @param {boolean} force - Force check even if cached
   * @returns {Promise<Object>} Update check result
   */
  async checkForUpdates(force = false) {
    if (!this.isStandalone) {
      return {
        updateAvailable: false,
        error: 'Not running as standalone app'
      };
    }

    const now = Date.now();
    const cache = UpdateService.updateCache;

    // Return cached result if not forcing and cache is valid
    if (!force && cache.lastChecked && (now - cache.lastChecked) < cache.cacheTimeout) {
      console.log('📦 Using cached update check result');
      return {
        updateAvailable: cache.updateAvailable,
        updateInfo: cache.updateInfo,
        cached: true
      };
    }

    try {
      console.log('🔍 Checking for updates...');
      console.log('📋 Current version:', APP_VERSION);
      
      if (!tauriUpdater) {
        throw new Error('Tauri updater not available');
      }
      
      const updateInfo = await tauriUpdater.checkUpdate();
      console.log('🔄 Update check result:', updateInfo);

      // Update cache
      cache.lastChecked = now;
      cache.updateAvailable = updateInfo.shouldUpdate;
      cache.updateInfo = updateInfo;

      // Notify listeners
      this.notifyListeners({
        type: 'update_check_complete',
        updateAvailable: updateInfo.shouldUpdate,
        updateInfo: updateInfo
      });

      return {
        updateAvailable: updateInfo.shouldUpdate,
        updateInfo: updateInfo,
        cached: false
      };
    } catch (error) {
      console.error('❌ Update check failed:', error);
      
      // Update cache with error
      cache.lastChecked = now;
      cache.updateAvailable = false;
      cache.updateInfo = null;

      this.notifyListeners({
        type: 'update_check_error',
        error: error.message
      });

      return {
        updateAvailable: false,
        error: error.message
      };
    }
  }

  /**
   * Install available update
   * @returns {Promise<Object>} Install result
   */
  async installUpdate() {
    if (!this.isStandalone) {
      return {
        success: false,
        error: 'Not running as standalone app'
      };
    }

    if (this.isInstalling) {
      return {
        success: false,
        error: 'Update installation already in progress'
      };
    }

    try {
      this.isInstalling = true;
      console.log('📦 Installing update...');

      this.notifyListeners({
        type: 'update_install_start'
      });

      if (!tauriUpdater) {
        throw new Error('Tauri updater not available');
      }
      
      await tauriUpdater.installUpdate();
      
      console.log('✅ Update installed successfully');
      
      this.notifyListeners({
        type: 'update_install_complete'
      });

      return {
        success: true,
        message: 'Update installed successfully'
      };
    } catch (error) {
      console.error('❌ Update installation failed:', error);
      
      this.notifyListeners({
        type: 'update_install_error',
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    } finally {
      this.isInstalling = false;
    }
  }

  /**
   * Restart application to apply update
   */
  async restartApplication() {
    if (!this.isStandalone) {
      console.error('❌ Cannot restart: Not running as standalone app');
      return;
    }

    try {
      console.log('🔄 Restarting application...');
      
      if (!tauriProcess) {
        throw new Error('Tauri process not available');
      }
      
      await tauriProcess.relaunch();
    } catch (error) {
      console.error('❌ Failed to restart application:', error);
    }
  }

  /**
   * Start automatic update checks (every 1 hour)
   */
  startAutoUpdateChecks() {
    if (!this.isStandalone) {
      console.log('⚠️ Auto-update not available: Not running as standalone app');
      return;
    }

    if (this.autoCheckInterval) {
      console.log('⚠️ Auto-update checks already running');
      return;
    }

    console.log('🔄 Starting automatic update checks (every 1 hour)');
    
    // Check immediately
    this.checkForUpdates(false);
    
    // Then check every hour
    this.autoCheckInterval = setInterval(() => {
      this.checkForUpdates(false);
    }, 60 * 60 * 1000); // 1 hour
  }

  /**
   * Stop automatic update checks
   */
  stopAutoUpdateChecks() {
    if (this.autoCheckInterval) {
      console.log('⏹️ Stopping automatic update checks');
      clearInterval(this.autoCheckInterval);
      this.autoCheckInterval = null;
    }
  }

  /**
   * Add event listener
   * @param {Function} listener - Event listener function
   */
  addEventListener(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners
   * @param {Object} event - Event object
   */
  notifyListeners(event) {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('❌ Update listener error:', error);
      }
    });
  }

  /**
   * Get update status
   * @returns {Object} Current update status
   */
  getUpdateStatus() {
    const cache = UpdateService.updateCache;
    return {
      isStandalone: this.isStandalone,
      isInstalling: this.isInstalling,
      autoCheckEnabled: !!this.autoCheckInterval,
      currentVersion: APP_VERSION,
      lastChecked: cache.lastChecked,
      updateAvailable: cache.updateAvailable,
      updateInfo: cache.updateInfo,
      cacheValid: cache.lastChecked && (Date.now() - cache.lastChecked) < cache.cacheTimeout
    };
  }

  /**
   * Clear update cache
   */
  clearCache() {
    UpdateService.updateCache = {
      lastChecked: null,
      updateAvailable: false,
      updateInfo: null,
      cacheTimeout: 60 * 60 * 1000
    };
    console.log('🗑️ Update cache cleared');
  }
}

// Export singleton instance
export const updateService = UpdateService.getInstance();