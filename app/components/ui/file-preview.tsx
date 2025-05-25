import React, { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

interface FilePreviewProps {
  src: string;
  alt: string;
  className?: string;
}

/**
 * Simple file preview component for user-uploaded images or SVGs.
 * Uses an <object> tag for SVGs to allow dynamic fill color changes based on theme.
 * Uses <img> tag for other image types.
 */
export function FilePreview({ src, alt, className }: FilePreviewProps) {
  const { theme } = useTheme();
  const objectRef = useRef<HTMLObjectElement>(null);

  const isSvg = src.endsWith(".svg");

  useEffect(() => {
    if (isSvg && objectRef.current) {
      const loadHandler = () => {
        try {
          const svgDocument = objectRef.current?.contentDocument;
          if (svgDocument) {
            const svgElement = svgDocument.querySelector("svg");
            if (svgElement) {
              // Remove existing style tags or fill attributes that might conflict
              const styleTags = svgDocument.querySelectorAll("style");
              styleTags.forEach(tag => tag.remove());
              svgElement.removeAttribute("fill");
              const paths = svgElement.querySelectorAll("path");
              paths.forEach(path => path.removeAttribute("fill"));

              // Apply theme-based fill
              // Check if the SVG itself has a class like logo-path to target specific elements
              const themedPaths = svgElement.querySelectorAll(".logo-path"); 
              const elementsToColor = themedPaths.length > 0 ? themedPaths : paths;
              
              elementsToColor.forEach(el => {
                (el as HTMLElement).style.fill = theme === "dark" ? "#FFFFFF" : "#000000";
              });
            }
          }
        } catch (error) {
          console.error("Error manipulating SVG:", error);
        }
      };

      // Re-run when theme changes
      if (objectRef.current.contentDocument) {
        loadHandler(); // If already loaded, just apply
      }
      objectRef.current.addEventListener("load", loadHandler);
      return () => {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        objectRef.current?.removeEventListener("load", loadHandler);
      };
    }
  }, [src, theme, isSvg]);

  if (isSvg) {
    return (
      <object
        ref={objectRef}
        type="image/svg+xml"
        data={src}
        className={className}
        aria-label={alt}
        style={{ pointerEvents: "none" }} // Prevent object from capturing mouse events
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      style={{ maxWidth: "100%", height: "auto" }}
    />
  );
} 