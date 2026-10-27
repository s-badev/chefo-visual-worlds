import { ArrowLeft } from "lucide-react";
import { LocaleLink } from "@/i18n/link";

type AiBackLinkProps =
  | { to: "/ai-worlds"; slug?: never; label: string }
  | { to: "/ai-worlds/collections/$slug"; slug: string; label: string };

/** Deterministic parent navigation for AI collection and artwork pages (shared back pill). */
export function AiBackLink(props: AiBackLinkProps) {
  const className = "back-pill";
  const content = (
    <>
      <span className="back-pill-badge" aria-hidden="true">
        <ArrowLeft size={18} />
      </span>
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
