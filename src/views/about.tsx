import { ArrowRight } from "lucide-react";
import { PortraitSwitch } from "@/components/portrait";
import { Surface } from "@/components/surface";
import { getMessages, pageHead, useT, type Locale } from "@/i18n";
import { LocaleLink } from "@/i18n/link";

export const aboutHead = (locale: Locale) => {
  const m = getMessages(locale).about;
  return pageHead(locale, "/about", m.metaTitle, m.metaDesc);
};

/**
 * About, as in the approved mock (d08 / m40): the portrait with its Real / AI switch on the left,
 * the text on the right (one column below 900px), then the two ways into the site.
 */
export function AboutView() {
  const { t } = useT();
  const m = t.about;
  return (
    <Surface tone="light" as="div" className="about-page">
      <div className="about-page-grid">
        {/* The AI version is the knight (siteConfig.portrait.ai), as in the mock. */}
        <PortraitSwitch className="about-page-portrait" />
        <div className="about-page-text">
          <p className="about-page-eyebrow">{m.eyebrow}</p>
          <h1 className="about-page-title">{m.title}</h1>
          <blockquote className="about-page-quote">{m.quote}</blockquote>
          <p>{m.p1}</p>
          <p>{m.p2}</p>
          <p>{m.p3}</p>
          <div className="about-page-actions" data-about-cta="">
            <LocaleLink to="/photography" className="about-page-cta about-page-cta--solid">
              {t.home.ctaPhotos}
              <ArrowRight aria-hidden="true" className="about-page-cta-arrow" />
            </LocaleLink>
            <LocaleLink to="/ai-worlds" className="about-page-cta about-page-cta--line">
              {t.home.ctaAi}
              <ArrowRight aria-hidden="true" className="about-page-cta-arrow" />
            </LocaleLink>
          </div>
        </div>
      </div>
    </Surface>
  );
}
