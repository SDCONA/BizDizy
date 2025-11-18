// reCAPTCHA configuration and utilities

declare global {
  interface Window {
    grecaptcha: any;
  }
}

// Get site key from environment variable or use hardcoded key for Figma Make
export const RECAPTCHA_SITE_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_RECAPTCHA_SITE_KEY) || '6Lf35gosAAAAAL1Jsu4_h6CEIzSQxhESHb7NLKpL';

// Load reCAPTCHA script dynamically
let isScriptLoading = false;
let isScriptLoaded = false;

export function loadRecaptchaScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    // If already loaded
    if (isScriptLoaded || (window.grecaptcha && window.grecaptcha.ready)) {
      isScriptLoaded = true;
      resolve();
      return;
    }

    // If currently loading, wait
    if (isScriptLoading) {
      const checkInterval = setInterval(() => {
        if (isScriptLoaded) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      return;
    }

    // Start loading
    isScriptLoading = true;

    // Check if script already exists in DOM
    const existingScript = document.querySelector(`script[src*="recaptcha"]`);
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      isScriptLoaded = true;
      isScriptLoading = false;
      console.log('✅ reCAPTCHA script loaded successfully');
      resolve();
    };

    script.onerror = (error) => {
      isScriptLoading = false;
      console.error('❌ Failed to load reCAPTCHA script:', error);
      reject(new Error('Failed to load reCAPTCHA script'));
    };

    document.head.appendChild(script);
  });
}

// Execute reCAPTCHA v3 and get token
export async function executeRecaptcha(action: string = 'submit'): Promise<string> {
  return new Promise(async (resolve, reject) => {
    // If no site key configured, skip reCAPTCHA
    if (!RECAPTCHA_SITE_KEY) {
      resolve('');
      return;
    }

    try {
      // Ensure script is loaded first
      await loadRecaptchaScript();
    } catch (error) {
      reject(error);
      return;
    }

    if (!window.grecaptcha || !window.grecaptcha.ready) {
      reject(new Error('reCAPTCHA not loaded'));
      return;
    }

    try {
      window.grecaptcha.ready(async () => {
        try {
          const token = await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action });
          resolve(token);
        } catch (error) {
          reject(error);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

// Reset reCAPTCHA (not needed for v3, but keeping for compatibility)
export function resetRecaptcha(): void {
  // v3 doesn't require manual reset
}

// Check if reCAPTCHA is loaded and configured
export function isRecaptchaLoaded(): boolean {
  return typeof window !== 'undefined' && !!window.grecaptcha && !!RECAPTCHA_SITE_KEY;
}