import type { ReactNode } from "react";
import { Surface } from "@/components/surface";
import { photographyCover, photographyCoverAlt } from "@/content/photography-cover";
import { useT } from "@/i18n";
import { LocaleLink } from "@/i18n/link";

export type PhotographyViewName = "albums" | "photos";

/**
 * The top of Photography, shared by Albums and All photos as in the approved mock (.ph-cover,
 * .ph-int, .viewbar): the collage cover, the eyebrow, "Through my lens" and the intro line, then
 * the Albums / All photos switch. All photos adds its theme chips at the end of that row.
 */
export function PhotographyTop({
  view,
  children,
}: {
  view: PhotographyViewName;
  /** Extra controls on the switch row (the theme chips of All photos). */
  children?: ReactNode;
}) {
  const { t, locale } = useT();
  const m = t.photos;
  const headingWords = t.home.photoTitle.split(" ");
  const headingLastWord = headingWords.pop();
  return (
    <Surface
      tone="light"
      className="photography-editorial-opening"
      aria-labelledby="photography-title"
    >
      <figure className="photography-editorial-opening-photo" data-photo-opening>
        <img
          src={photographyCover.image}
          srcSet={photographyCover.srcSet}
          alt={photographyCoverAlt(locale)}
          width={photographyCover.width}
          height={photographyCover.height}
          fetchPriority="high"
          decoding="async"
          sizes="100vw"
          style={{ objectPosition: photographyCover.objectPosition }}
        />
      </figure>
      <div className="photography-wrap">
        <div className="photography-editorial-mast">
          <div className="photography-editorial-heading">
            <p className="eyebrow">{m.eyebrow}</p>
            <h1 id="photography-title">
              {headingWords.join(" ")} <em>{headingLastWord}</em>
            </h1>
          </div>
          <div className="photography-editorial-lead">
            <p>{t.home.photoText}</p>
          </div>
        </div>
        <div className="photo-viewbar">
          <nav aria-label={m.view} className="photo-seg">
            <LocaleLink
              to="/photography"
              exactActive
              aria-current={view === "albums" ? "page" : undefined}
              className="photo-seg-link"
            >
              {m.albums}
            </LocaleLink>
            <LocaleLink
              to="/photography"
              search={{ view: "photos" }}
              aria-current={view === "photos" ? "page" : undefined}
              className="photo-seg-link"
            >
              {m.allPhotos}
            </LocaleLink>
          </nav>
          {children}
        </div>
      </div>
    </Surface>
  );
}
