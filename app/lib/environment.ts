// Environment detection utilities

export const isTauriApp = () => {
  if (typeof window === 'undefined') return false;
  
  // Primary check: __TAURI__ global
  if ('__TAURI__' in window) {
    console.log('🔍 Tauri detected via __TAURI__ global');
    return true;
  }
  
  // Secondary check: location protocol (Tauri uses tauri:// or file://)
  if (window.location && (window.location.protocol === 'tauri:' || window.location.protocol === 'file:')) {
    console.log('🔍 Tauri detected via protocol:', window.location.protocol);
    return true;
  }
  
  // Tertiary check: user agent contains "Tauri"
  if (navigator && navigator.userAgent && navigator.userAgent.includes('Tauri')) {
    console.log('🔍 Tauri detected via user agent');
    return true;
  }
  
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