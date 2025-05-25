/**
 * Utility functions for consistent logging throughout the application
 */

export const logger = {
  error: (message: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[ERROR] ${message}`, ...args);
    }
  },
  
  warn: (message: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },
  
  info: (message: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[INFO] ${message}`, ...args);
    }
  },
  
  debug: (message: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  },
}; 