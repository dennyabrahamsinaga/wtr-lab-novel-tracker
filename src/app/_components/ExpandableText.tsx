"use client";

import { useId, useMemo, useState } from "react";

function splitWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean);
}

export function ExpandableText({
  text,
  minWords = 40,
  className,
  preventDefaultClick = false,
}: {
  text: string;
  minWords?: number;
  className?: string;
  preventDefaultClick?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();

  const { short, needs } = useMemo(() => {
    const words = splitWords(text);
    if (words.length <= minWords) return { short: text, needs: false };
    return { short: words.slice(0, minWords).join(" ") + "…", needs: true };
  }, [minWords, text]);

  return (
    <div className={className}>
      <div id={contentId} className="whitespace-pre-line">
        {expanded || !needs ? text : short}
      </div>
      {needs ? (
        <button
          type="button"
          aria-controls={contentId}
          aria-expanded={expanded}
          onClick={(e) => {
            if (preventDefaultClick) {
              e.preventDefault();
              e.stopPropagation();
            }
            setExpanded((v) => !v);
          }}
          className="mt-2 text-xs text-zinc-400 hover:text-zinc-200 underline underline-offset-2"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      ) : null}
    </div>
  );
}
