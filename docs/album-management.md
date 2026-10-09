# Future album management

The current portfolio reads typed local arrays from `src/content/albums.ts` and `src/content/photos.ts`. They are presentation data, not an admin interface. All ten destinations appear in the Photography overview. Six locations are drafts with designed "coming soon" placeholders and no borrowed photos or covers. Draft album pages also open. The road photograph remains outside an album until its location is verified and its original detail URL remains available.

## Adding a photograph locally

1. Put the new file in the matching `public/photos/<album-slug>/` folder. It will be served at `/photos/<album-slug>/<filename>`; do not move or copy existing files from `src/assets/`.
2. Add one `Photo` entry to `src/content/photos.ts` with a unique photo slug, `image: "/photos/<album-slug>/<filename>"`, the image's actual pixel width and height, accurate Bulgarian and English alt text, and visual subject tags in `themes`. Use only themes visible in the photograph from `PHOTO_THEMES`. The current `Photo` type requires a location: use a verified location, or `Неуточнено` when it is unknown. Add a new English location label to `LOCATION_EN` if needed. Add a date, caption or device only when verified.
3. Add that photo slug to the album's ordered `photos` collection in `src/content/albums.ts`. Set `coverPhotoSlug` to a photo in the same album. Change `status` to `"published"` only when the album has a valid cover and at least one photo.
4. Run `npm.cmd run build` and `npm.cmd run test`. The album overview, album page, and All Photos filters will then use the new photo without a database. A photo without a verified album remains visible under All in All Photos, but never appears under a destination filter.

## Proposed persistent model

Use a database with three main tables and object storage for image files:

| Table          | Important fields                                                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `albums`       | Stable ID, unique slug, BG/EN title and description, display order, draft/published status, cover photo ID, created/updated timestamps.          |
| `photos`       | Stable ID, storage key, width, height, BG/EN alt and optional caption, optional verified location and shooting date, created/updated timestamps. |
| `album_photos` | Album ID, photo ID, position, optional album-specific caption; unique `(album_id, photo_id)` and `(album_id, position)`.                         |

The cover must reference a photo assigned to that album. An album may be published only when it has a valid cover and at least one photo. The overview can list all destinations while showing photos only for populated albums. Existing photo slugs can remain as public IDs so current detail URLs continue to work.

## Admin workflow

Add authentication and server-side authorization before any write controls. An authorized editor could create and edit albums, upload multiple originals, select a cover, reorder and move photos, and change draft status. Store originals and generated responsive derivatives in object storage; keep descriptive metadata in the database. Validate image type, size, dimensions and alt text on upload. Keep upload and database changes coordinated so failed uploads do not leave broken photo rows.

Use transactions for reorder, move, cover change and publication. Deleting an album requires a confirmation step and a clear choice about whether its photos remain in the library. Audit important edits and support recovery before permanently deleting files. A future migration should preserve existing slugs and only carry over verified dates and locations.

No backend, storage service, or local-only CRUD UI is included in this phase. Choose and approve the persistent service and authentication approach before implementation.
