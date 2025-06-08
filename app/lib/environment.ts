// Environment detection utilities for Tauri app

// Type declaration for Tauri globals
declare global {
  interface Window {
    __TAURI__?: unknown;
    __TAURI_INTERNALS__?: unknown;
    __TAURI_INVOKE__?: unknown;
  }
}

// Basic environment checks
export const isBrowser = () => {
  return typeof window !== 'undefined';
};

export const isProduction = () => {
  return process.env.NODE_ENV === 'production';
};

export const isDevelopment = () => {
  return process.env.NODE_ENV === 'development';
};

// Check if we're running in Tauri environment
export const isTauriApp = (): boolean => {
  if (typeof window === 'undefined') return false;
  return '__TAURI__' in window || '__TAURI_INTERNALS__' in window;
};

// Get current environment type
export const getEnvironmentType = (): 'tauri' | 'web' | 'server' => {
  if (typeof window === 'undefined') return 'server';
  return isTauriApp() ? 'tauri' : 'web';
};

// Get environment display name
export const getEnvironmentName = (): string => {
  if (typeof window === 'undefined') return 'Server-side';
  return isTauriApp() ? 'Tauri (Desktop)' : 'Web Browser';
};

// Check if environment supports certain features
export const supportsFeature = (feature: 'filesystem' | 'notifications' | 'system-tray'): boolean => {
  switch (feature) {
    case 'filesystem':
    case 'notifications':
    case 'system-tray':
      return isTauriApp();
    default:
      return false;
  }
};

// Get environment information
export const getEnvironmentInfo = () => {
  if (typeof window === 'undefined') {
    return {
      environment: 'server',
      description: 'Server-side rendering context',
      features: ['SSR', 'API Routes']
    };
  }

  if (isTauriApp()) {
    return {
      environment: 'tauri',
      description: 'Tauri desktop application',
      features: ['Native API', 'File System', 'System Integration']
    };
  }

  return {
    environment: 'web',
    description: 'Web application',
    features: ['Browser API', 'Web Standards']
  };
};

// Log environment information for debugging
export const logEnvironmentInfo = () => {
  if (!isBrowser()) return;
  
  const info = getEnvironmentInfo();
  console.log(`🌐 Omnichat Environment: ${info.description}`);
  console.log(`✅ Features: ${info.features.join(', ')}`);
}; 