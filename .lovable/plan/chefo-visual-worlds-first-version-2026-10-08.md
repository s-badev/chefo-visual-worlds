# CHEFO — VISUAL WORLDS: first version

A personal editorial portfolio in Bulgarian with two collections: mobile photography and AI-generated visual art. Design follows your brief: warm cream background, deep navy, muted gold, small terracotta details, serif headings and a clean sans-serif for body text.

## Pages
- `/` Home: sticky header, split hero (Nesebar coast photo next to an AI knight portrait), "През моя обектив" with a mixed-ratio grid of 6 photos, a dark "AI светове" section with 4 cards (one shows a prompt preview), "За мен" preview, dark footer.
- `/photography`: category and location filters, a gallery with different image shapes, and a lightbox you can use with the keyboard (arrows, Esc).
- `/photography/$slug`: large image, location, date, story, details, previous/next links, related photos.
- `/ai-worlds`: category and tool filters, a visual grid that shows the title on hover.
- `/ai-worlds/$slug`: Image, then Concept, then Prompt, then Variations. Full prompt panel with a "Копирай промпта" button and a short confirmation message, reference images, series variants, previous/next.
- `/about`: four short sections with placeholder text you can edit. No made-up biography.

## Content
- About 8 sample photos (Nesebar, Sofia, Plovdiv, Sunny Beach) and the 5 named AI projects, all stored as plain data in the project with comments showing where to put real images and prompts.
- About 16 sample images generated in one consistent cinematic style.

## Technical details
- Fonts: Cormorant Garamond for headings, Manrope for body text, loaded in the root head. Colors are oklch tokens in styles.css.
- Data lives in `src/content/photos.ts` and `src/content/ai-works.ts`, with types shaped to match future database rows. Slug lookups use route loaders, and a missing slug shows notFound.
- Filters are kept in URL search params. The lightbox is a Radix Dialog. Copy confirmation uses a sonner toast.
- Every image has alt text, lazy loading and a fixed aspect ratio so the page doesn't jump while images load. Animations respect reduced-motion settings. Each route gets its own head() metadata.
- No login, payments or database in this version.
