import { 
  ALLOWED_IMAGE_TYPES, 
  ALLOWED_TEXT_TYPES, 
  MAX_FILE_SIZE_MB 
} from "@/app/constants";
import { logger } from "./logger";

/**
 * Validates if a file is within the size limit
 */
export function isFileSizeValid(file: File): boolean {
  const isValid = file.size <= MAX_FILE_SIZE_MB * 1024 * 1024;
  if (!isValid) {
    logger.warn(`File ${file.name} exceeds ${MAX_FILE_SIZE_MB}MB limit`);
  }
  return isValid;
}

/**
 * Validates if a file type is supported
 */
export function isFileTypeSupported(file: File): boolean {
  const fileType = file.type;
  const isImage = ALLOWED_IMAGE_TYPES.includes(fileType);
  const isText = ALLOWED_TEXT_TYPES.includes(fileType);
  
  if (!isImage && !isText && fileType !== "") {
    logger.warn(`File type "${fileType || 'unknown'}" for ${file.name} is not explicitly supported`);
    return false;
  }
  
  return true;
}

/**
 * Checks if a file is an image type
 */
export function isImageFile(file: File): boolean {
  return ALLOWED_IMAGE_TYPES.includes(file.type);
}

/**
 * Creates a preview URL for image files
 */
export function createPreviewUrl(file: File): string | undefined {
  if (isImageFile(file)) {
    return URL.createObjectURL(file);
  }
  return undefined;
}

/**
 * Validates a file and returns validation result
 */
export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateFile(file: File): FileValidationResult {
  if (!isFileSizeValid(file)) {
    return {
      isValid: false,
      error: `File ${file.name} exceeds ${MAX_FILE_SIZE_MB}MB limit`,
    };
  }

  if (!isFileTypeSupported(file)) {
    return {
      isValid: false,
      error: `File type "${file.type || 'unknown'}" is not supported`,
    };
  }

  return { isValid: true };
} 