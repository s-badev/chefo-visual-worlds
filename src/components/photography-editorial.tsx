import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { albumText, getAlbum, getAlbumCover, getAlbums } from "@/content/albums";
import { photographyCover, photographyCoverAlt } from "@/content/photography-cover";
import { localizePhoto } from "@/content/photos";
import { Surface } from "@/components/surface";
import { useT } from "@/i18n";
import { LocaleLink } from "@/i18n/link";

/** P1 presentation. Published copy and covers remain in the production registries. */
export function PhotographyEditorial({ onAllPhotos }: { onAllPhotos: () => void }) {
  const { t, locale } = useT();
  const albums = getAlbums();
  const [selectedSlug, setSelectedSlug] = useState("paris");
  useEffect(() => {
    const focused = document.activeElement?.closest<HTMLElement>(
      ".photography-editorial-destination-list [data-album-slug]",
    );
    if (focused?.dataset["albumSlug"]) setSelectedSlug(focused.dataset["albumSlug"]);
  }, []);
  const selectedAlbum = getAlbum(selectedSlug) ?? albums[0]!;
  const selectedCover = getAlbumCover(selectedAlbum);
  const headingWords = t.home.photoTitle.split(" ");
  const headingLastWord = headingWords.pop();

  return (
    <div className="photography-editorial">
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
        <div className="container-page photography-editorial-mast">
          <div className="photography-editorial-heading">
            <p className="eyebrow">{t.photos.eyebrow}</p>
            <h1 id="photography-title">
              {headingWords.join(" ")} <em>{headingLastWord}</em>
            </h1>
          </div>
          <div className="photography-editorial-lead">
            <p>{t.home.photoText}</p>
          </div>
        </div>
      </Surface>

      <Surface
        tone="light"
        className="container-page photography-editorial-index"
        aria-labelledby="photography-albums-title"
      >
        <div className="photography-editorial-index-heading">
          <h2 id="photography-albums-title">{t.photos.albums}</h2>
          <button type="button" onClick={onAllPhotos} className="interaction-link interaction-text-button photography-editorial-all-photos">
            {t.photos.allPhotos} <ArrowRight aria-hidden="true" size={18} />
          </button>
        </div>
        <div className="photography-editorial-index-grid">
          <ul className="photography-editorial-destination-list">
            {albums.map((album) => {
              const cover = getAlbumCover(album);
              const localizedCover = cover ? localizePhoto(cover, locale) : undefined;
              const selected = album.slug === selectedAlbum.slug;
              return (
                <li
                  key={album.id}
                  data-album-slug={album.slug}
                  onMouseEnter={() => setSelectedSlug(album.slug)}
                  onFocus={() => setSelectedSlug(album.slug)}
                >
                  <LocaleLink
                    to="/photography/albums/$slug"
                    slug={album.slug}
                    aria-label={albumText(album.title, locale)}
                    className={`photography-editorial-row${selected ? " is-selected" : ""}`}
                  >
                    {localizedCover && (
                      <span
                        className="photography-editorial-thumb photo-frame-keyline"
                        aria-hidden="true"
                      >
                        <img
                          src={localizedCover.image}
                          alt=""
                          width={localizedCover.width}
                          height={localizedCover.height}
                          loading="lazy"
                          decoding="async"
                          sizes="72px"
                        />
                      </span>
                    )}
                    <span className="photography-editorial-destination-name">
                      {albumText(album.title, locale)}
                    </span>
                    <span className="photography-editorial-count">
                      {t.photos.count(album.photos.length)}
                    </span>
                    <ArrowRight
                      className="photography-editorial-row-arrow"
                      size={17}
                      aria-hidden="true"
                    />
                  </LocaleLink>
                </li>
              );
            })}
          </ul>
          {selectedCover && (
            <figure className="photography-editorial-preview" aria-hidden="true">
              <div className="photography-editorial-preview-frame photo-frame-print photo-frame-print--thin">
                <img
                  key={selectedCover.slug}
                  src={selectedCover.image}
                  alt=""
                  width={selectedCover.width}
                  height={selectedCover.height}
                  loading="lazy"
                  decoding="async"
                  sizes="(min-width: 1024px) 45vw, 1px"
                />
              </div>
              <figcaption>
                <span>{albumText(selectedAlbum.title, locale)}</span>
                <span>{t.photos.count(selectedAlbum.photos.length)}</span>
              </figcaption>
              <p>
                {localizePhoto(selectedCover, locale).title} —{" "}
                {albumText(selectedAlbum.description, locale)}
              </p>
            </figure>
          )}
        </div>
      </Surface>
    </div>
  );
}
