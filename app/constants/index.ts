// File upload constants
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];
export const ALLOWED_TEXT_TYPES = [
  "text/plain",
  "text/markdown",
  "application/pdf",
  "application/json",
  "application/xml",
  "text/csv",
  "text/html",
  "application/javascript",
];
export const MAX_FILE_SIZE_MB = 10;
export const MAX_TOTAL_FILES = 5;

// UI constants
export const SIDEBAR_WIDTH = 280;
export const SIDEBAR_COLLAPSED_WIDTH = 60;

// API endpoints
export const API_ENDPOINTS = {
  CHAT: "/api/chat",
} as const;
