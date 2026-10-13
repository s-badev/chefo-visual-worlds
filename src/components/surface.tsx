import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "light" | "dark";

/**
 * One place to declare which world a section belongs to: cream (real photography) or
 * navy (AI worlds). Sets the header probe marker and scopes the semantic color tokens.
 * `seam` draws the gold horizon at the top edge of a dark section.
 */
export function Surface({
  tone,
  as: Tag = "section",
  seam,
  className,
  ...rest
}: {
  tone: Tone;
  as?: "section" | "div" | "article" | "footer";
  seam?: boolean;
} & HTMLAttributes<HTMLElement>) {
  return (
    <Tag
      data-header-theme={tone}
      className={cn(tone === "dark" && "surface-dark", seam && "seam-top", className)}
      {...rest}
    />
  );
}
