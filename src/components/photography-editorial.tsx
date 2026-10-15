import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { albumText, getAlbum, getAlbumCover, getAlbumForPhoto, getAlbums } from "@/content/albums";
import { editorial } from "@/content/editorial";
import { getPhoto, localizePhoto, type Photo } from "@/content/photos";
import { Surface } from "@/components/surface";
import { useT } from "@/i18n";
import { LocaleLink } from "@/i18n/link";

const requiredPhoto = (slug: string): Photo => {
  const photo = getPhoto(slug);
  if (!photo) throw new Error(`Missing published editorial photograph: ${slug}`);
  return photo;
};

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
  const opening = localizePhoto(requiredPhoto(editorial.photography.opening.photoSlug), locale);
  const openingAlbum = getAlbumForPhoto(opening.slug);
  const selectedAlbum = getAlbum(selectedSlug) ?? albums[0]!;
  const selectedCover = getAlbumCover(selectedAlbum);
  const reportageAlbum = getAlbum(editorial.photography.reportage.albumSlug);
  const reportage = editorial.photography.reportage.photoSlugs.map((slug) =>
    localizePhoto(requiredPhoto(slug), locale),
  );
  const panorama = localizePhoto(requiredPhoto(editorial.photography.panoramaPhotoSlug), locale);
  const rilaAlbum = getAlbumForPhoto(panorama.slug);
  const headingWords = t.home.photoTitle.split(" ");
  const headingLastWord = headingWords.pop();

  if (!openingAlbum || !reportageAlbum || !rilaAlbum) throw new Error("Missing editorial album");

  return (
    <div className="photography-editorial">
      <Surface
        tone="light"
        className="photography-editorial-opening"
        aria-labelledby="photography-title"
      >
        <figure className="photography-editorial-opening-photo" data-photo-opening>
          <img
            src={opening.image}
            alt={opening.alt}
            width={opening.width}
            height={opening.height}
            fetchPriority="high"
            decoding="async"
            sizes="100vw"
            style={{ objectPosition: editorial.photography.opening.objectPosition }}
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
            <span>
              {opening.title} · {albumText(openingAlbum.title, locale)}
            </span>
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
          <button type="button" onClick={onAllPhotos} className="photography-editorial-all-photos">
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
                      <span className="photography-editorial-thumb" aria-hidden="true">
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
              <div className="photography-editorial-preview-frame">
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

      <Surface
        tone="light"
        className="photography-editorial-reportage"
        aria-labelledby="photography-istanbul-title"
      >
        <div className="container-page">
          <div className="photography-editorial-reportage-head">
            <h2 id="photography-istanbul-title">{albumText(reportageAlbum.title, locale)}</h2>
            <p>{albumText(reportageAlbum.description, locale)}</p>
          </div>
          <div className="photography-editorial-reportage-grid">
            {reportage.map((photo, index) => (
              <figure
                key={photo.slug}
                className={`photography-editorial-reportage-image photography-editorial-reportage-image-${index + 1}`}
              >
                <LocaleLink to="/photography/$slug" slug={photo.slug} aria-label={photo.title}>
                  <span className="photography-editorial-reportage-frame">
                    <img
                      src={photo.image}
                      alt={photo.alt}
                      width={photo.width}
                      height={photo.height}
                      loading="lazy"
                      decoding="async"
                      sizes={
                        index === 0
                          ? "(min-width: 900px) 62vw, 100vw"
                          : "(min-width: 900px) 30vw, 50vw"
                      }
                    />
                  </span>
                </LocaleLink>
                <figcaption>{photo.title}</figcaption>
              </figure>
            ))}
            <LocaleLink
              className="photography-editorial-reportage-link"
              to="/photography/albums/$slug"
              slug={reportageAlbum.slug}
            >
              {albumText(reportageAlbum.title, locale)} <ArrowRight size={18} aria-hidden="true" />
            </LocaleLink>
          </div>
        </div>
      </Surface>

      <Surface
        tone="light"
        className="photography-editorial-panorama"
        aria-label={albumText(rilaAlbum.title, locale)}
      >
        <figure>
          <LocaleLink to="/photography/$slug" slug={panorama.slug} aria-label={panorama.title}>
            <span className="photography-editorial-panorama-frame">
              <img
                src={panorama.image}
                alt={panorama.alt}
                width={panorama.width}
                height={panorama.height}
                loading="lazy"
                decoding="async"
                sizes="100vw"
              />
            </span>
          </LocaleLink>
          <figcaption className="container-page">
            <span>
              <strong>{panorama.title}</strong> · {albumText(rilaAlbum.title, locale)}
            </span>
            <LocaleLink to="/photography/albums/$slug" slug={rilaAlbum.slug}>
              {albumText(rilaAlbum.title, locale)} <ArrowRight size={18} aria-hidden="true" />
            </LocaleLink>
          </figcaption>
        </figure>
      </Surface>
    </div>
  );
}
