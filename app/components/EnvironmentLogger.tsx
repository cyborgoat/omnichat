"use client";

import { useEffect } from 'react';
import { logEnvironmentInfo } from '@/app/lib/environment';

export default function EnvironmentLogger() {
  useEffect(() => {
    const detectEnvironment = () => {
      console.log('🔍 Environment detection...');
      logEnvironmentInfo();
    };

    detectEnvironment();
  }, []);

  return null;
} 