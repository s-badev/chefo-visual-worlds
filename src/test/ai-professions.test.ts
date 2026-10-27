import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getAiCollection, getCollectionCover, getCollectionWorks } from "@/content/ai-collections";
import { aiWorks, getAiWork } from "@/content/ai-works";
import { futureAiConcepts } from "@/content/ai-concepts";

const expected = [
  ["chefo-barber", "Кварталният барбер", "The Neighborhood Barber"],
  ["chefo-beach-bartender", "Барман на морето", "Seaside Bartender"],
  ["chefo-ticket-inspector", "Билетен инспектор", "Ticket Inspector"],
  ["chefo-taxi-driver", "Таксиджия от Люлин", "Taxi Driver from Lyulin"],
  ["chefo-econt-courier", "Куриер на Еконт", "Econt Courier"],
  ["chefo-rakia-distiller", "Майстор на ракия", "Traditional Rakia Distiller"],
  ["chefo-ac-technician", "Майстор на климатици", "Air Conditioning Technician"],
  ["chefo-doner-chef", "Дюнер майстор", "Doner Chef"],
  ["chefo-nightclub-security", "Нощен охранител", "Nightclub Security Guard"],
  ["chefo-fisherman", "Рибар на пристанището", "Harbor Fisherman"],
  ["chefo-market-vendor", "Продавач на пазара", "Market Vendor"],
  ["chefo-auto-mechanic", "Квартален автомонтьор", "Neighborhood Auto Mechanic"],
  ["chefo-coffee-break", "Боклукджия на сутрешна смяна", "Sanitation Worker on an Early Shift"],
  ["chefo-baker", "Сутрин в пекарната", "Morning at the Bakery"],
  ["chefo-beach-corn-vendor", "Майсторът на царевицата", "The Corn Vendor"],
  ["chefo-painter-at-work", "Бояджия с характер", "The Painter's Touch"],
] as const;

describe("Professions & Roles portraits", () => {
  it("registers exactly the owner's sixteen portraits once, in both languages", () => {
    const collection = getAiCollection("professions-roles")!;
    expect(collection.works).toEqual(expected.map(([slug]) => slug));
    expect(getCollectionWorks(collection, "bg").map(({ title }) => title)).toEqual(
      expected.map(([, bg]) => bg),
    );
    expect(getCollectionWorks(collection, "en").map(({ title }) => title)).toEqual(
      expected.map(([, , en]) => en),
    );
    expect(getCollectionCover(collection, "en")?.slug).toBe("chefo-taxi-driver");
    expect(new Set(aiWorks.map(({ slug }) => slug)).size).toBe(aiWorks.length);
  });

  it("uses uncropped WebP copies with exact dimensions and openly illustrative prompts", () => {
    for (const [slug] of expected) {
      const work = getAiWork(slug)!;
      const filename = `${slug}.webp`;
      expect(work.image).toContain(filename);
      const bytes = readFileSync(join(process.cwd(), "src", "assets", "ai-professions", filename));
      expect(bytes.toString("ascii", 0, 4)).toBe("RIFF");
      expect(bytes.toString("ascii", 8, 16)).toBe("WEBPVP8X");
      expect(work.width).toBe(1 + bytes.readUIntLE(24, 3));
      expect(work.height).toBe(1 + bytes.readUIntLE(27, 3));
      expect(work.promptKind).toBe("illustrative");
      expect(work.prompt).toBeTruthy();
      expect(work.tool).toBeUndefined();
      expect(work.references).toHaveLength(0);
      expect(work.variants).toHaveLength(0);
      expect(bytes.includes(Buffer.from("EXIF"))).toBe(false);
      expect(bytes.includes(Buffer.from("XMP "))).toBe(false);
    }
    for (const id of ["neighborhood-fitness-instructor", "beach-lifeguard"]) {
      expect(futureAiConcepts.find((item) => item.id === id)).toBeDefined();
      expect(getAiWork(id)).toBeUndefined();
    }
    const worker = getAiWork("chefo-coffee-break")!;
    expect(worker.role).toBe("sanitation-worker");
    expect(worker.description).toBe(
      "Градът още спи, когато смяната му започва. Работата му остава незабелязана точно когато е свършена добре.",
    );
    expect(worker.en?.description).toBe(
      "The city is still asleep when his shift begins. His work goes unnoticed precisely when he has done it well.",
    );
    expect(futureAiConcepts.some(({ id }) => id === "sanitation-worker")).toBe(false);
  });
});
