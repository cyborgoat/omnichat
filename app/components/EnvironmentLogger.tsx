"use client";

import { useEffect } from 'react';
import { logEnvironmentInfo, waitForTauriApi, isTauriApp } from '@/app/lib/environment';

export default function EnvironmentLogger() {
  useEffect(() => {
    const detectEnvironment = async () => {
      // Log immediate detection
      console.log('🔍 Initial environment detection...');
      logEnvironmentInfo();
      
      // If initial detection shows web app but we might be in Tauri dev mode, wait for API
      if (!isTauriApp() && window.location?.hostname === 'localhost' && window.location?.port === '3000') {
        console.log('🔍 Waiting for potential Tauri API in dev mode...');
        const isTauri = await waitForTauriApi(3000); // Wait up to 3 seconds
        
        if (isTauri) {
          console.log('🔍 Tauri API detected after waiting! Re-logging environment...');
          logEnvironmentInfo();
        } else {
          console.log('🔍 No Tauri API detected after waiting. Continuing as web app.');
        }
      }
    };
    
    detectEnvironment();
  }, []);

  return null; // This component doesn't render anything
} 