````markdown
# CHEFO — Visual Worlds

*Real places. Endless worlds.*

![Photography: 13 albums](https://img.shields.io/badge/Photography-13%20albums-1B2832?style=flat-square)
![AI Worlds: 4 collections, 64 works](https://img.shields.io/badge/AI%20Worlds-4%20collections%20%2F%2064%20works-B38A58?style=flat-square)
![Languages: Bulgarian and English](https://img.shields.io/badge/Languages-BG%20%2F%20EN-34514C?style=flat-square)
![Status: Pre-launch](https://img.shields.io/badge/Status-Pre--launch-555555?style=flat-square)

**CHEFO — Visual Worlds** is the personal portfolio of **Stefan Badev (Chefo)**. It brings together original travel photography and AI-generated visual stories in a bilingual, server-rendered web application.

The project follows one point of view across two kinds of work. In the photography archive, Stefan is behind the camera, documenting places he has visited. In the AI collections, he steps into the frame as a recurring character, reimagined across historical eras, professions, cinematic scenes, and destinations around the world.

## Explore the portfolio

| Section | Route | What you’ll find |
| --- | --- | --- |
| **Home** | `/` | The *Sunny Beach 2025 / 2126* opening, where a real view of Bulgaria’s Black Sea coast meets an imagined future, followed by selected albums and AI artworks. |
| **Photography** | `/photography` | Thirteen travel albums with individual covers, photo sequences, and a lightbox for closer viewing. |
| **AI Worlds** | `/ai-worlds` | Four curated collections of AI-generated artwork, with individual pages and editorial text in Bulgarian and English. |
| **About** | `/about` | The creator’s approach to photography and AI imagery, with a portrait toggle between a real photograph and an AI version. |

### Photography

The photography archive is organized by destination. Each album has a cover and its own sequence of images, with captions that provide context where it adds to the photograph.

| Region | Albums |
| --- | --- |
| **Bulgaria** | Sofia, Sunny Beach, Sveti Vlas, Nessebar, Burgas, Plovdiv, Rila |
| **France** | Paris, Lyon |
| **Türkiye** | Istanbul, Edirne, Bodrum |
| **Tunisia** | Tunisia |

### AI Worlds

The four collections contain **16 works each**. The same protagonist appears in different roles and settings, giving the series a visual connection while allowing each collection to develop its own mood and subject.

| Collection | Focus |
| --- | --- |
| **Historical Eras and Rulers** | Portraits inspired by historical figures, period dress, and the visual language of power. |
| **Professions and Roles** | Character studies built around the tools, clothing, and settings of different occupations. |
| **Cinema Archetypes** | Film-inspired scenes that use lighting, action, and composition to suggest a larger story. |
| **Around the World** | Editorial portraits shaped by the architecture, clothing, and atmosphere of different destinations. |

## Experience and implementation

- **Bilingual interface and editorial content.** The portfolio supports Bulgarian and English, including navigation and artwork descriptions.
- **Responsive image viewing.** Layouts adapt to desktop and mobile, with a lightbox available for both photographs and AI artworks.
- **Motion preferences.** Motion effects respect the visitor’s reduced-motion setting.
- **Server rendering.** TanStack Start renders the application on the server. The current production build targets a Cloudflare Worker module.
- **Content checks.** Alongside application tests, project-specific checks cover images and editorial content.

## Technology stack

| Area | Technology |
| --- | --- |
| Application and routing | TanStack Start, React, TypeScript |
| Build and styling | Vite, Tailwind CSS |
| Server runtime | Nitro |
| Production build target | Cloudflare Worker module |
| Testing | Vitest and project-specific content checks |

## Run locally

You’ll need Git, Node.js, and npm. Clone the repository, install the locked dependencies, and start the development server:

```bash
git clone https://github.com/s-badev/chefo-visual-worlds.git
cd chefo-visual-worlds
npm ci
npm run dev
```

Open the address printed by the development server.

### Development checkout guard

In the primary checkout, `npm run dev` requires the `main` branch and may fast-forward it to `origin/main` when it is behind. For development or review on a feature branch, use a linked Git worktree, where the guard is skipped. CI environments and sessions with `CHEFO_SKIP_GUARD=1` also bypass the guard.

### Verify and build

Run the type checker, test suite, and production build from the repository root:

```bash
npx tsc --noEmit
npx vitest run --maxWorkers=1
npm run build
```

## Project status

**Pre-launch.** The portfolio has been reviewed locally in Bulgarian and English at desktop and mobile widths. The production build and local Cloudflare Worker have been verified with representative pages and images. Public deployment is pending.

## Creator

**Stefan Badev (Chefo)** — photography, AI imagery, and editorial direction.
````
