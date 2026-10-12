import { Fragment } from "react";

type SplitTextProps = {
  /** One string per visual line. */
  lines: string[];
  as?: "h1" | "h2" | "p";
  className?: string;
  /** One class for every line, or one per line. */
  lineClassName?: string | readonly string[];
  charClassName?: string;
  /** Class for the visual (aria-hidden) wrapper around the lines. */
  innerClassName?: string;
  id?: string;
  tabIndex?: number;
};

/**
 * Splits copy into per-character spans for the timeline to animate, while
 * screen readers get the plain sentence once. Words never break mid-word.
 */
export function SplitText({
  lines,
  as: Tag = "p",
  className,
  lineClassName = "",
  charClassName = "",
  innerClassName,
  id,
  tabIndex,
}: SplitTextProps) {
  return (
    <Tag className={className} id={id} tabIndex={tabIndex}>
      <span className="sr-only">{lines.join(" ")}</span>
      <span aria-hidden="true" className={innerClassName}>
        {lines.map((line, li) => (
          <span
            key={li}
            className={`split-line ${typeof lineClassName === "string" ? lineClassName : (lineClassName[li] ?? "")}`}
            data-line={li}
          >
            {line.split(" ").map((word, wi, words) => (
              <Fragment key={wi}>
                <span className="split-word">
                  {Array.from(word).map((ch, ci) => (
                    <span key={ci} className={`split-char ${charClassName}`}>
                      {ch}
                    </span>
                  ))}
                </span>
                {wi < words.length - 1 ? " " : null}
              </Fragment>
            ))}
          </span>
        ))}
      </span>
    </Tag>
  );
}
