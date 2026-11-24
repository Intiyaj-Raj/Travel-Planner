import { useState } from "react";
import { PlaceCategory } from "../types/trip";
import { CATEGORY_META } from "../utils/travel";

interface PlaceThumbnailProps {
  src?: string;
  alt: string;
  category: PlaceCategory;
  className?: string;
}

export function PlaceThumbnail({
  src,
  alt,
  category,
  className = "",
}: PlaceThumbnailProps) {
  const [failed, setFailed] = useState(false);
  const meta = CATEGORY_META[category];

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 text-slate-500 dark:text-slate-400 ${className}`}
        aria-label={alt}
      >
        <svg
          className="h-7 w-7 opacity-80"
          viewBox="0 0 24 24"
          fill="none"
          stroke={meta.colorHex}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={meta.svgPath} />
        </svg>
        <span className="mt-1.5 text-[11px] font-medium tracking-tight opacity-75">
          {meta.label}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
}
