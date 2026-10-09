Refinement pass: CHEFO — VISUAL WORLDS

Targeted improvements across Home, Photography, AI Worlds and About. Keep the cream/navy/gold look, fonts, Bulgarian copy, routes, sample images and local content. No new images, database, login or payments.

## 1. Header that adapts to the background

- Dark sections (hero halves, AI preview, footer, lightbox-free dark areas) get a `data-header-theme="dark"` marker.
- Header checks which section sits right under its bottom edge (using its real height) on load, scroll, resize and route change, with a small hysteresis so it never flickers at boundaries.
- Dark mode: translucent navy + blur, light links, gold active underline; solid navy fallback when blur is unsupported. Transitions off under reduced motion.
- Check collection pages for heading overlap and fix the top offset if needed.

## 2. Balanced hero

- Both CTAs use the same button style (one shared variant), each kept on its own image.
- One H1 "Реални места, безкрайни светове." spanning both halves on desktop, placed low so it does not cover the portrait face/crown, with a contrast scrim.
- Mobile: heading in its own block above the stacked images.

## 3. Gallery cards and layout

- Photo meta becomes one left-aligned block: location, small category label, optional caption.
- Collection grids: plain CSS grid, uniform 4:5 previews, no offsets — stays orderly after filtering.
- Home preview: curated mix using at most 4:5, 4:3 and 1:1, no column offsets.
- Optional per-photo `objectPosition` field in the content data.
- Lightbox keeps full uncropped image (object-contain).

## 4. AI overview cards

- Remove the large prompt panel from the home page.
- One shared card: image, title, tool · category, "Копирай промпта" button, link to detail. Copy button sits outside the link (no nesting), always visible (not hover-only), labelled.
- Shared copy helper: success toast only after the clipboard succeeds, Bulgarian error toast otherwise, button hidden when there is no prompt. Detail page reuses it.
- Keep the "Виж всички AI светове" link.

## 5. Filters and empty states

- On mobile each chip group is one horizontally scrollable row (no wrap/shrink, hidden scrollbar, edge fade hint), with visible group labels.
- URL-based filters and back/forward unchanged.
- Empty state: short Bulgarian message + "Изчисти филтрите" that clears only the filter params. Result count stays accurate.
- Tool label "Other" displayed as "Друг инструмент" (data id unchanged).

## 6. About page

- Two-column editorial layout: sticky portrait left (desktop only), narrative right with limited line length; stacked on mobile.
- Portrait toggle with two buttons "Реален кадър" / "AI версия". No real photo of you exists yet, so "Реален кадър" shows a labelled placeholder; the AI version uses the existing knight sample, clearly marked as AI. Missing states hide gracefully.
- Short serif quote, merged background + mobile photography story, AI experiments paragraph — placeholder text, no invented history.
- "Как създавам изображенията" becomes a 3-step component (Идея и кадър → Промпт и референции → AI генерация), each step expandable via an accessible button.
- Home "За мен" preview gets a small matching portrait.

## 7. Contact strip

- Before the footer on About: "Имате идея за проект или обща визия?" / "Свържете се с мен".
- Email stored in one config field, left empty for now, so the email button is hidden until you add your address.

## Verification

Playwright at 375, 768 and 1440 px: horizontal overflow, header theme switching over hero/AI/footer, hero CTA parity, filter + empty state reset, clipboard success and forced failure, direct detail-page load, lightbox keys, portrait and step keyboard use. Report what passed and anything that could not be checked.

## Technical details

- New `useHeaderTheme` hook using `elementsFromPoint` at header bottom + rAF-throttled scroll; re-run on `useRouterState` location change.
- New shared `btnHero` variant; `copyPrompt()` util in `src/lib/clipboard.ts` with a unit test for success/failure/empty paths.
- `src/content/site-config.ts` with `contactEmail: ""`.
- `toolLabel()` map for display names.
- Scrollable chips via a `.no-scrollbar` utility and mask-image fade in styles.css.