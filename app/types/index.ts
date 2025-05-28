/**
 * Common TypeScript types and interfaces used throughout the application
 */

// File upload related types
export interface SelectedFile {
  id: string;
  file: File;
  previewUrl?: string;
}

// API related types
export interface ChatMessageCore {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ApiErrorResponse {
  error: string;
  details?: string;
}

// Form validation types
export interface ApiKeyFormData {
  OpenAI?: string;
  Google?: string;
  Qwen?: string;
  Deepseek?: string;
  Anthropic?: string;
  Volces?: string;
}

// Provider types
export type ProviderType = "OpenAI" | "Google" | "Qwen(DashScope)" | "Deepseek" | "Anthropic" | "Volces";

export interface ProviderInfo {
  name: string;
  apiKeyUrl: string;
}

// UI state types
export interface ToastOptions {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
} 