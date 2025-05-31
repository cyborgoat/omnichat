// Environment detection utilities

// Synchronous Tauri detection for immediate use
export const isTauriApp = () => {
  if (typeof window === 'undefined') return false;
  
  // Primary check: __TAURI__ global (Tauri 1.x)
  if ('__TAURI__' in window && window.__TAURI__) {
    console.log('🔍 Tauri detected via __TAURI__ global (v1.x)');
    return true;
  }
  
  // Secondary check: Tauri 2.x API detection
  if ('__TAURI_INTERNALS__' in window) {
    console.log('🔍 Tauri detected via __TAURI_INTERNALS__ global (v2.x)');
    return true;
  }
  
  // Tertiary check: Check for Tauri invoke function directly
  try {
    // Check if invoke is available
    if ('__TAURI_INVOKE__' in window && window.__TAURI_INVOKE__) {
      console.log('🔍 Tauri detected via __TAURI_INVOKE__ function');
      return true;
    }
  } catch {
    // Ignore errors
  }

  // Fourth check: Check for Tauri import availability (modern approach)
  try {
    // Check for Tauri plugin core
    if ('__TAURI_PLUGIN_CORE__' in window || ('__TAURI__' in window && window.__TAURI__ !== undefined)) {
      console.log('🔍 Tauri detected via plugin core');
      return true;
    }
  } catch {
    // Ignore errors
  }
  
  // Fifth check: location protocol (Tauri uses tauri:// or file://)
  if (window.location && (window.location.protocol === 'tauri:' || window.location.protocol === 'file:')) {
    console.log('🔍 Tauri detected via protocol:', window.location.protocol);
    return true;
  }
  
  // Sixth check: user agent contains "Tauri"
  if (navigator && navigator.userAgent && navigator.userAgent.includes('Tauri')) {
    console.log('🔍 Tauri detected via user agent');
    return true;
  }
  
  // Seventh check: Check if we're in dev mode with localhost:3000 but running in webview
  if (window.location && window.location.hostname === 'localhost' && 
      window.location.port === '3000' && window.navigator.webdriver === undefined) {
    // Additional check for Tauri-specific properties
    try {
      // Check for any Tauri-specific properties that might indicate we're in a webview
      const hasMemoryInfo = 'memory' in window.performance;
      const hasWebview = hasMemoryInfo || 
                        window.location.href.includes('tauri') ||
                        document.title.includes('tauri') ||
                        navigator.userAgent.includes('WebKit') && !navigator.userAgent.includes('Chrome');
      if (hasWebview) {
        console.log('🔍 Tauri detected via webview characteristics in dev mode');
        return true;
      }
    } catch {
      // Ignore errors
    }
  }
  
  return false;
};

// Asynchronous Tauri detection that waits for API to be ready
export const waitForTauriApi = async (maxWaitMs: number = 5000): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitMs) {
    // Check synchronous detection first
    if (isTauriApp()) {
      return true;
    }
    
    // Try importing Tauri API dynamically
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      if (typeof invoke === 'function') {
        console.log('🔍 Tauri detected via dynamic import and invoke function');
        return true;
      }
    } catch {
      // Tauri not available yet, continue waiting
    }
    
    // Wait a bit before checking again
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('🔍 Tauri detection timed out after', maxWaitMs, 'ms');
  return false;
};

export const isStaticExport = () => {
  if (typeof window === 'undefined') return false;
  
  // Check if we're served from file:// protocol (typical for static exports)
  if (window.location && window.location.protocol === 'file:') {
    return true;
  }
  
  // Check if the app is loaded from a static host without API capabilities
  // This happens when Next.js static export is served
  const hostname = window.location?.hostname;
  return hostname === 'tauri.localhost' || 
         window.location?.href.includes('index.html') ||
         (hostname && !hostname.includes('localhost') && !hostname.includes('127.0.0.1') && window.location?.port === '');
};

export const isBrowser = () => {
  return typeof window !== 'undefined';
};

export const isWebApp = () => {
  return isBrowser() && !isTauriApp();
};

export const getEnvironmentInfo = () => {
  if (!isBrowser()) {
    return {
      environment: 'server',
      description: 'Server-side rendering',
      hasApiRoutes: true,
      usesClientSideApi: false,
    };
  }
  
  if (isTauriApp()) {
    return {
      environment: 'tauri',
      description: 'Desktop application (Tauri)',
      hasApiRoutes: false,
      usesClientSideApi: true,
    };
  }
  
  if (isStaticExport()) {
    return {
      environment: 'static',
      description: 'Static export (no server)',
      hasApiRoutes: false,
      usesClientSideApi: true,
    };
  }
  
  return {
    environment: 'web',
    description: 'Web application',
    hasApiRoutes: true,
    usesClientSideApi: false,
  };
};

export const logEnvironmentInfo = () => {
  if (isBrowser()) {
    const info = getEnvironmentInfo();
    console.log(`🌐 Omnichat Environment: ${info.description}`);
    console.log(`📡 API Mode: ${info.usesClientSideApi ? 'Client-side API calls' : 'Server-side API routes'}`);
    
    // Detailed detection results
    console.log(`🔍 Environment Detection Details:`);
    console.log(`  - isTauriApp(): ${isTauriApp()}`);
    console.log(`  - isStaticExport(): ${isStaticExport()}`);
    console.log(`  - __TAURI__ global: ${'__TAURI__' in window}`);
    console.log(`  - Protocol: ${window.location?.protocol}`);
    console.log(`  - Hostname: ${window.location?.hostname}`);
    console.log(`  - User Agent: ${navigator?.userAgent}`);
    console.log(`  - Full URL: ${window.location?.href}`);
  }
}; 