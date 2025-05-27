import React, { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";

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
  const objectRef = useRef<HTMLObjectElement>(null);
  const [dynamicSrc, setDynamicSrc] = useState(src);

  // Use NEXT_PUBLIC_ASSET_PREFIX if available (set by Next.js during build, especially with basePath)
  const assetPrefix = process.env.NEXT_PUBLIC_ASSET_PREFIX || "";

  const isSvg = src.toLowerCase().endsWith(".svg");

  useEffect(() => {
    // Ensure src starts with a slash if it doesn't already, then prepend assetPrefix
    const correctedSrc = src.startsWith('/') ? src : `/${src}`;
    const prefixedSrc = assetPrefix + correctedSrc;

    if (isSvg) {
      setDynamicSrc(`${prefixedSrc}?theme=${resolvedTheme}`);
    } else {
      setDynamicSrc(prefixedSrc);
    }
  }, [resolvedTheme, src, isSvg, assetPrefix]);

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
      src={dynamicSrc} // dynamicSrc now includes assetPrefix
      alt={alt}
      className={className}
      loading="lazy"
      style={{ maxWidth: "100%", height: "auto" }}
    />
  );
} 