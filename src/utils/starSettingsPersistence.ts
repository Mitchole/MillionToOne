import { StarQuality, StarStyle } from './starMaterials';
import { QualitySettings } from './starQualityManager';

export interface StarSettingsData {
  quality: StarQuality;
  style: StarStyle;
  isAutomatic: boolean;
  performanceScore: number;
  lastUpdated: number;
  version: string;
}

export interface CookieOptions {
  expires: number; // days
  domain?: string;
  path?: string;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
}

export class StarSettingsPersistence {
  private static readonly COOKIE_NAME = 'milliontoone_star_settings';
  private static readonly SETTINGS_VERSION = '1.0.0';
  private static readonly DEFAULT_EXPIRES = 365; // 1 year

  /**
   * Save star settings to cookie
   */
  static saveSettings(settings: QualitySettings): void {
    const settingsData: StarSettingsData = {
      quality: settings.quality,
      style: settings.style,
      isAutomatic: settings.isAutomatic,
      performanceScore: settings.performanceScore,
      lastUpdated: Date.now(),
      version: this.SETTINGS_VERSION,
    };

    const cookieOptions: CookieOptions = {
      expires: this.DEFAULT_EXPIRES,
      path: '/',
      secure: window.location.protocol === 'https:',
      sameSite: 'lax',
    };

    try {
      this.setCookie(this.COOKIE_NAME, JSON.stringify(settingsData), cookieOptions);
      console.log('🎯 StarSettingsPersistence: Settings saved to cookie:', settingsData);
    } catch (error) {
      console.warn('🎯 StarSettingsPersistence: Failed to save settings:', error);
    }
  }

  /**
   * Load star settings from cookie
   */
  static loadSettings(): StarSettingsData | null {
    try {
      const cookieValue = this.getCookie(this.COOKIE_NAME);

      if (!cookieValue) {
        console.log('🎯 StarSettingsPersistence: No saved settings found');
        return null;
      }

      const settingsData: StarSettingsData = JSON.parse(cookieValue);

      // Validate settings version
      if (settingsData.version !== this.SETTINGS_VERSION) {
        console.log('🎯 StarSettingsPersistence: Settings version mismatch, clearing old settings');
        this.clearSettings();
        return null;
      }

      // Validate settings data
      if (!this.isValidSettingsData(settingsData)) {
        console.warn('🎯 StarSettingsPersistence: Invalid settings data, clearing');
        this.clearSettings();
        return null;
      }

      console.log('🎯 StarSettingsPersistence: Settings loaded from cookie:', settingsData);
      return settingsData;
    } catch (error) {
      console.warn('🎯 StarSettingsPersistence: Failed to load settings:', error);
      this.clearSettings();
      return null;
    }
  }

  /**
   * Clear saved settings
   */
  static clearSettings(): void {
    try {
      this.deleteCookie(this.COOKIE_NAME);
      console.log('🎯 StarSettingsPersistence: Settings cleared');
    } catch (error) {
      console.warn('🎯 StarSettingsPersistence: Failed to clear settings:', error);
    }
  }

  /**
   * Check if settings exist
   */
  static hasSettings(): boolean {
    return this.getCookie(this.COOKIE_NAME) !== null;
  }

  /**
   * Get settings age in days
   */
  static getSettingsAge(): number {
    const settings = this.loadSettings();
    if (!settings) {
      return -1;
    }

    const ageMs = Date.now() - settings.lastUpdated;
    return Math.floor(ageMs / (1000 * 60 * 60 * 24)); // Convert to days
  }

  /**
   * Update performance score in saved settings
   */
  static updatePerformanceScore(newScore: number): void {
    const settings = this.loadSettings();
    if (settings) {
      settings.performanceScore = newScore;
      settings.lastUpdated = Date.now();
      this.saveSettings({
        quality: settings.quality,
        style: settings.style,
        isAutomatic: settings.isAutomatic,
        performanceScore: settings.performanceScore,
        lastFpsCheck: 0,
        fallbackTriggered: false,
      });
    }
  }

  /**
   * Validate settings data structure
   */
  private static isValidSettingsData(data: any): data is StarSettingsData {
    return (
      typeof data === 'object' &&
      data !== null &&
      typeof data.quality === 'string' &&
      ['low', 'medium', 'high'].includes(data.quality) &&
      typeof data.style === 'string' &&
      ['basic', 'procedural', 'texture'].includes(data.style) &&
      typeof data.isAutomatic === 'boolean' &&
      typeof data.performanceScore === 'number' &&
      data.performanceScore >= 0 &&
      data.performanceScore <= 1 &&
      typeof data.lastUpdated === 'number' &&
      typeof data.version === 'string'
    );
  }

  /**
   * Set cookie with options
   */
  private static setCookie(name: string, value: string, options: CookieOptions): void {
    let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

    if (options.expires) {
      const date = new Date();
      date.setTime(date.getTime() + options.expires * 24 * 60 * 60 * 1000);
      cookieString += `; expires=${date.toUTCString()}`;
    }

    if (options.path) {
      cookieString += `; path=${options.path}`;
    }

    if (options.domain) {
      cookieString += `; domain=${options.domain}`;
    }

    if (options.secure) {
      cookieString += `; secure`;
    }

    if (options.sameSite) {
      cookieString += `; SameSite=${options.sameSite}`;
    }

    document.cookie = cookieString;
  }

  /**
   * Get cookie value
   */
  private static getCookie(name: string): string | null {
    const nameEQ = encodeURIComponent(name) + '=';
    const cookies = document.cookie.split(';');

    for (let cookie of cookies) {
      cookie = cookie.trim();
      if (cookie.indexOf(nameEQ) === 0) {
        return decodeURIComponent(cookie.substring(nameEQ.length));
      }
    }

    return null;
  }

  /**
   * Delete cookie
   */
  private static deleteCookie(name: string): void {
    this.setCookie(name, '', { expires: -1, path: '/' });
  }

  /**
   * Get cookie size in bytes
   */
  static getCookieSize(): number {
    const cookieValue = this.getCookie(this.COOKIE_NAME);
    return cookieValue ? new Blob([cookieValue]).size : 0;
  }

  /**
   * Check if cookies are enabled
   */
  static areCookiesEnabled(): boolean {
    try {
      const testCookie = 'test_cookie_support';
      this.setCookie(testCookie, 'test', { expires: 1 });
      const enabled = this.getCookie(testCookie) === 'test';
      this.deleteCookie(testCookie);
      return enabled;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get cookie information for debugging
   */
  static getCookieInfo(): {
    exists: boolean;
    size: number;
    age: number;
    data: StarSettingsData | null;
    cookiesEnabled: boolean;
  } {
    return {
      exists: this.hasSettings(),
      size: this.getCookieSize(),
      age: this.getSettingsAge(),
      data: this.loadSettings(),
      cookiesEnabled: this.areCookiesEnabled(),
    };
  }
}

// Export convenience functions
export const saveStarSettings = (settings: QualitySettings): void => {
  StarSettingsPersistence.saveSettings(settings);
};

export const loadStarSettings = (): StarSettingsData | null => {
  return StarSettingsPersistence.loadSettings();
};

export const clearStarSettings = (): void => {
  StarSettingsPersistence.clearSettings();
};

export const hasStarSettings = (): boolean => {
  return StarSettingsPersistence.hasSettings();
};
