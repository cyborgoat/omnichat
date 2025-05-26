"use client";

import { useEffect } from 'react';
import { logEnvironmentInfo } from '@/app/lib/environment';

export default function EnvironmentLogger() {
  useEffect(() => {
    logEnvironmentInfo();
  }, []);

  return null; // This component doesn't render anything
} 