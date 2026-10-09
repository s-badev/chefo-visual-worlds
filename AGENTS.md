<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Portfolio content lives in typed local arrays under src/content/ (photos.ts, ai-works.ts) — keeps sample data easy to swap for a future database.
- Sections mark their background with data-header-theme="dark|light"; the sticky header probes the element under its bottom edge — keeps header contrast correct without per-page wiring.
- Editable site settings (contact email, portrait images) live in src/content/site-config.ts — one place to fill in real values.
- Bilingual: Bulgarian at root paths, English under /en/*; route files are thin wrappers over shared views in src/views/, UI strings live in src/i18n/messages.ts and content translations in each item's `en` field (fallback to Bulgarian) — one translation layer, no duplicated pages.
- Internal links use LocaleLink with Bulgarian paths so they auto-prefix /en; filter values stay Bulgarian ids in the URL so they survive language switches.
