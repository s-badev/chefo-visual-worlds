import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { destinationHead } from "@/components/ai-atlas";
import { aiCollections } from "@/content/ai-collections";
import { destinations } from "@/content/ai-destinations";
import { aiWorks } from "@/content/ai-works";
import { getAlbum } from "@/content/albums";
import { photos } from "@/content/photos";
import { messages } from "@/i18n/messages";
import { aboutHead } from "@/views/about";
import { aiCollectionHead, aiDetailHead, aiWorldsHead } from "@/views/ai-worlds";
import { homeHead } from "@/views/home";
import { albumHead, photoDetailHead, photographyHead } from "@/views/photography";

type Head = {
  meta?: Record<string, string | undefined>[];
  links?: Record<string, string | undefined>[];
};

const heads = (locale: "bg" | "en"): [string, Head][] => [
  ["home", homeHead(locale)],
  ["photography", photographyHead(locale)],
  ["album", albumHead(locale, getAlbum("paris"))],
  ["photo", photoDetailHead(locale, photos[0])],
  ["ai-worlds", aiWorldsHead(locale)],
  ["collection", aiCollectionHead(locale, aiCollections[0])],
  ["artwork", aiDetailHead(locale, aiWorks[0])],
  ["destination", destinationHead(locale, destinations[0])],
  ["about", aboutHead(locale)],
];

describe("Social preview card", () => {
  it.each(["bg", "en"] as const)(
    "gives every %s page the og:image and twitter tags beside its canonical",
    (locale) => {
      for (const [name, head] of heads(locale)) {
        const meta = (key: string) =>
          head.meta?.find((m) => m["property"] === key || m["name"] === key)?.["content"];
        const canonical = head.links?.find((l) => l["rel"] === "canonical")?.["href"];
        expect(canonical, name).toBeTruthy();
        const image = meta("og:image");
        // Same mechanism as the canonical: both resolve against the one site origin.
        const origin = "https://site.invalid";
        expect(new URL(image!, origin + canonical).href, name).toBe(`${origin}/og-image.png`);
        expect(image!.startsWith("/"), name).toBe(canonical!.startsWith("/"));
        expect(meta("twitter:image"), name).toBe(image);
        expect(meta("twitter:card"), name).toBe("summary_large_image");
        expect(meta("og:image:width"), name).toBe("1200");
        expect(meta("og:image:height"), name).toBe("630");
        expect(meta("og:image:alt"), name).toBe(messages[locale].common.ogImageAlt);
        expect(meta("og:title"), name).toBeTruthy();
        expect(meta("og:description"), name).toBeTruthy();
        expect(meta("og:locale"), name).toBe(locale === "en" ? "en_US" : "bg_BG");
      }
    },
  );

  it("describes the card without a dash in the brand name", () => {
    for (const locale of ["bg", "en"] as const) {
      expect(messages[locale].common.ogImageAlt).toContain("CHEFO Visual Worlds");
      expect(messages[locale].common.ogImageAlt).not.toMatch(/[—–]/);
    }
  });

  it("ships a 1200x630 PNG of at most 300 KB", () => {
    const bytes = readFileSync(path.resolve(__dirname, "../../public/og-image.png"));
    expect(bytes.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    expect(bytes.toString("ascii", 12, 16)).toBe("IHDR");
    expect(bytes.readUInt32BE(16)).toBe(1200);
    expect(bytes.readUInt32BE(20)).toBe(630);
    expect(bytes.length).toBeLessThanOrEqual(300 * 1024);
  });
});
