"use client";

import { useState } from "react";

function getDisplayTags(categories: string[] = []) {
  return categories
    .filter((c) =>
      !c.match(
        /(images from|photographs by|taken with|featured pictures|files with|information field)/i
      )
    )
    .map((c) =>
      c
        .replace(/_/g, " ")
        .replace(/\s*\(.*?\)/g, "")
        .replace(/^Images of /i, "")
        .trim()
    );
}

interface TagsMetaProps {
  categories: string[] | null;
}

export default function TagsMeta({ categories }: TagsMetaProps) {
  if (!categories?.length) return null;

  const MAX = 6;
  const allTags = getDisplayTags(categories);
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? allTags : allTags.slice(0, MAX);
  const remaining = allTags.length - MAX;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs uppercase text-gray-400 tracking-wide">Tags</span>
      <div className="flex flex-wrap gap-2">
        {visible.map((tag) => (
          <span
            key={tag}
            className="px-3 py-1.5 text-sm rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            {tag}
          </span>
        ))}
        {!expanded && remaining > 0 && (
          <button
            onClick={() => setExpanded(true)}
            className="px-3 py-1.5 text-sm rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 transition-colors"
          >
            +{remaining} more
          </button>
        )}
      </div>
    </div>
  );
}
