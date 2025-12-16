import React from "react";

/**
 * Renders markdown text with basic formatting support
 * Supports: **bold text**, line breaks
 */
export function renderMarkdownText(text: string): React.ReactNode {
  if (!text) return null;

  // Split by lines to handle line breaks
  const lines = text.split("\n");

  return lines.map((line, lineIndex) => {
    if (line.trim() === "") {
      return <br key={lineIndex} />;
    }

    // Handle bold text (**text**)
    const parts = line.split(/(\*\*.*?\*\*)/g);

    return (
      <span key={lineIndex} className="block break-words">
        {parts.map((part, partIndex) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            // Bold text
            const boldText = part.slice(2, -2);
            return (
              <strong key={partIndex} className="font-bold break-words">
                {boldText}
              </strong>
            );
          }
          return (
            <span key={partIndex} className="break-words">
              {part}
            </span>
          );
        })}
        {lineIndex < lines.length - 1 && <br />}
      </span>
    );
  });
}
