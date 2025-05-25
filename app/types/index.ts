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
export interface ProfileFormData {
  username?: string;
  avatar?: string;
}

export interface ApiKeyFormData {
  OpenAI?: string;
  Google?: string;
  Qwen?: string;
  Deepseek?: string;
  Anthropic?: string;
}

// Provider types
export type ProviderType = "OpenAI" | "Google" | "Qwen" | "Deepseek" | "Anthropic";

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