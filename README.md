# Chefo Visual Worlds

A bilingual photography and AI visual storytelling portfolio. The site presents real places photographed by Chefo alongside imagined worlds, with Bulgarian pages at `/` and English pages under `/en`.

## Features

- Photography and AI artwork galleries with category filters and individual detail pages.
- A photo lightbox, AI prompts and variations, and an About page with a real/AI portrait toggle.
- Bulgarian and English content, navigation, metadata, and language switching.
- Responsive layout with accessible controls and reduced-motion support.

## Technology

React 19, TypeScript, TanStack Start and TanStack Router, Vite 8, Tailwind CSS 4, Radix UI, and Vitest. The app uses Nitro for its production server build. The current Vite configuration uses `@lovable.dev/vite-tanstack-config`, retained from the project's initial Lovable setup.

## Local development

Install Node.js and npm, then run these commands in the project directory. On Windows, use `npm.cmd` to avoid PowerShell script policy issues:

```powershell
npm.cmd install
npm.cmd run dev
```

Open the local URL printed by Vite. To run the existing tests:

```powershell
npm.cmd run test
```

## Production build

```powershell
npm.cmd run build
```

The build writes production output to `.output/`. To preview it locally, run `npm.cmd run preview`.

## Project structure

| Path | Purpose |
| --- | --- |
| `src/routes/` | TanStack Start routes and root document. |
| `src/views/` | Shared page views for both languages. |
| `src/i18n/` | Translated UI strings, locale handling, and localized links. |
| `src/content/` | Typed portfolio entries and editable site settings. |
| `src/components/` | Shared site and UI components. |
| `src/assets/` | Portfolio images imported through Vite. |
| `public/` | Static files, including the favicon. |
| `src/test/` | Vitest tests. |

Portfolio items are edited in `src/content/photos.ts` and `src/content/ai-works.ts`. The contact email and portrait sources live in `src/content/site-config.ts`.
