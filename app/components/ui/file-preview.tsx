import React, { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import getConfig from 'next/config';

interface FilePreviewProps {
  src: string;
  alt: string;
  className?: string;
}

/**
 * Simple file preview component for user-uploaded images or SVGs.
 * Uses an <object> tag for SVGs to allow dynamic fill color changes based on theme via CSS variables.
 * Appends a theme-based query parameter to the SVG src to help force re-evaluation on theme change.
 * Uses <img> tag for other image types.
 */
export function FilePreview({ src, alt, className }: FilePreviewProps) {
  const { resolvedTheme } = useTheme();
  const objectRef = useRef<HTMLObjectElement>(null); // Keep ref if needed for other purposes, though not used in this simplified version
  const [dynamicSrc, setDynamicSrc] = useState(src);

  const { publicRuntimeConfig } = getConfig() || {};
  const basePath = publicRuntimeConfig?.basePath || "";

  const isSvg = src.toLowerCase().endsWith(".svg");

  useEffect(() => {
    const effectiveSrc = basePath + (src.startsWith('/') ? src : `/${src}`);
    if (isSvg) {
      // Append a query string that changes with the theme
      // to help force the browser to re-evaluate the SVG which uses CSS variables.
      setDynamicSrc(`${effectiveSrc}?theme=${resolvedTheme}`);
    } else {
      setDynamicSrc(effectiveSrc);
    }
  }, [resolvedTheme, src, isSvg, basePath]);

  if (isSvg) {
    return (
      <object
        ref={objectRef}
        type="image/svg+xml"
        data={dynamicSrc} // Use the dynamic source with the theme query parameter
        className={className}
        aria-label={alt}
        style={{ pointerEvents: "none" }} // Prevent object from capturing mouse events
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={dynamicSrc} // Use dynamicSrc which now includes basePath
      alt={alt}
      className={className}
      loading="lazy"
      style={{ maxWidth: "100%", height: "auto" }}
    />
  );
} 