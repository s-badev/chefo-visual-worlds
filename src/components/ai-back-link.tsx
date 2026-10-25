import { ArrowLeft } from "lucide-react";
import { LocaleLink } from "@/i18n/link";

type AiBackLinkProps =
  | { to: "/ai-worlds"; slug?: never; label: string }
  | { to: "/ai-worlds/collections/$slug"; slug: string; label: string };

/** Deterministic parent navigation for AI collection and artwork pages. */
export function AiBackLink(props: AiBackLinkProps) {
  const className =
    "group -ml-2 inline-flex min-h-11 items-center gap-2 rounded-sm px-2 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";
  const content = (
    <>
      <ArrowLeft
        aria-hidden="true"
        className="size-4 shrink-0 transition-transform motion-safe:group-hover:-translate-x-1"
      />
      {props.label}
    </>
  );

  return props.to === "/ai-worlds" ? (
    <LocaleLink to="/ai-worlds" className={className}>
      {content}
    </LocaleLink>
  ) : (
    <LocaleLink to="/ai-worlds/collections/$slug" slug={props.slug} className={className}>
      {content}
    </LocaleLink>
  );
}
