type BlueprintCoverProps = {
  lines: string[];
  index?: number;
  size?: "grid" | "mini";
};

/**
 * Reusable "premium operating manual" cover art — CSS/SVG only, no image
 * assets, so every Blueprint stays visually part of one collection while
 * remaining distinguishable by its printed lines. Oversized stacked type,
 * a thin technical grid, and a small index mark, in the site's existing
 * void/orange/paper palette only.
 */
export function BlueprintCover({ lines, index, size = "grid" }: BlueprintCoverProps) {
  const isMini = size === "mini";

  return (
    <div
      className={`relative overflow-hidden rounded-lg ${isMini ? "aspect-square" : "aspect-[3/4]"}`}
      style={{
        background: "var(--void)",
        border: "1px solid rgba(255,106,0,0.2)",
        backgroundImage:
          "linear-gradient(rgba(245,241,232,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(245,241,232,0.05) 1px, transparent 1px)",
        backgroundSize: isMini ? "12px 12px" : "24px 24px",
      }}
    >
      {typeof index === "number" && !isMini && (
        <span className="absolute top-3 left-3 text-[10px] tracking-widest opacity-40">
          {String(index + 1).padStart(2, "0")}
        </span>
      )}

      <div className={`absolute inset-0 flex flex-col items-center justify-center text-center ${isMini ? "px-1" : "px-4"}`}>
        {lines.map((line, i) => (
          <span
            key={i}
            className="display-text font-bold uppercase leading-none"
            style={{
              color: i === 1 ? "var(--orange)" : "var(--paper)",
              fontSize: isMini ? "0.5rem" : "clamp(1rem, 3.2vw, 1.5rem)",
              letterSpacing: "-0.02em",
              opacity: i === 1 ? 1 : 0.9,
            }}
          >
            {line}
          </span>
        ))}
      </div>

      {!isMini && (
        <svg
          className="absolute bottom-3 right-3 opacity-30"
          width="36"
          height="20"
          viewBox="0 0 36 20"
          fill="none"
          aria-hidden="true"
        >
          <path d="M0 18L8 8L16 14L26 2L36 10" stroke="var(--orange)" strokeWidth="1" />
          <circle cx="26" cy="2" r="1.5" fill="var(--orange)" />
        </svg>
      )}
    </div>
  );
}
