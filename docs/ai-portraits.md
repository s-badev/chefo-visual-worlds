# Adding a "Chefo Around the World" portrait

The collection lists the owner's 12 destinations in `src/content/ai-destinations.ts`. All twelve currently have portraits. A destination without an image can still use the planned creative brief and placeholder.

A portrait is an ordinary AI artwork with the **same slug** as its destination. Its image, actual prompt and known tool are stored only once, in `src/content/ai-works.ts`. The current portraits have no supplied generation prompts, tools or creation dates; the site leaves those fields unavailable rather than guessing.

## Steps

1. Save the portrait as `src/assets/ai-world-chefo-<destination>.png` (or `.jpg`/`.webp`), for example `src/assets/ai-world-chefo-greece.jpg`.
2. In `src/content/ai-works.ts`, import it next to the other AI images:

   ```ts
   import greece from "@/assets/ai-world-chefo-greece.jpg";
   ```

3. Append a new entry at the **end** of `aiWorks`. The homepage shows the first four AI works, so appending keeps the homepage unchanged.

   ```ts
   {
     slug: "chefo-v-gartsiya", // must equal the destination slug
     title: "Чефо в Гърция",
     image: greece,
     width: 587, // use the image's real pixel size
     height: 828,
     alt: "AI портрет на ... (опишете какво се вижда)",
     description: "Кратко описание на видимата сцена.",
     prompt: "", // fill only with the exact prompt actually used
     // tool: "ChatGPT Image Generation", // add only when confirmed
     // date: "YYYY-MM-DD", // add only when confirmed
     category: "Култури по света",
     references: [],
     variants: [],
     en: { title: "Chefo in Greece", alt: "AI portrait of ...", description: "One sentence about the visible scene." },
   },
   ```

4. In `src/content/ai-destinations.ts`, change that destination's `status` from `"planned"` to `"published"`.
5. Run `npm.cmd run test` and `npm.cmd run build`. A test checks that every published destination has a matching artwork and that every planned one has none.

The portrait then appears automatically on its destination page with full-screen viewing, in the collection's exhibition wall and index, and in All Artworks. Copy Prompt appears only after the exact prompt is supplied. The first published destination supplies the collection cover.

## Optional video

Place the clip in `public/videos/around-the-world/<slug>.mp4` (and optionally a poster image) and add to the destination:

```ts
video: {
  src: "/videos/around-the-world/chefo-v-gartsiya.mp4",
  poster: "/videos/around-the-world/chefo-v-gartsiya.jpg",
  title: { bg: "Кратко видео за Гърция", en: "A short video for Greece" },
},
```

Videos load only when played (`preload="none"`). Keep files short and compressed; large originals belong outside the repository.

## Notes

- Only give `place` when it is verified. Dubai is the sole destination with a specified city.
- Greenland is described as an autonomous territory within the Kingdom of Denmark.
- The working concept prompt (`promptDraft`) is separate from the actual generation prompt. Never copy it into `AiWork.prompt` unless it is confirmed to be the exact prompt used.
