import React from "react";

interface FilePreviewProps {
  src: string;
  alt: string;
  className?: string;
}

/**
 * Simple file preview component for user-uploaded images
 * Uses img tag since these are dynamic user uploads, not static assets
 */
export function FilePreview({ src, alt, className }: FilePreviewProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img 
      src={src} 
      alt={alt} 
      className={className}
      loading="lazy"
    />
  );
} 